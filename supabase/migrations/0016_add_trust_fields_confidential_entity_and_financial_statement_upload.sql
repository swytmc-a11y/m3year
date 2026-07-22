-- Public trust-signal fields on listings.
alter table public.listings
  add column has_legal_obligations boolean not null default false;

alter table public.listings
  add column reason_for_selling text;
alter table public.listings
  add constraint listings_reason_for_selling_check check (
    reason_for_selling is null or reason_for_selling in (
      'retirement', 'relocation', 'new_venture', 'partnership_dispute', 'financial_distress', 'other'
    )
  );

alter table public.listings
  add column financial_data_sharing text not null default 'on_request';
alter table public.listings
  add constraint listings_financial_data_sharing_check check (
    financial_data_sharing in ('now', 'on_request', 'none')
  );

-- Confidential legal-entity details: kept out of the public `listings` table
-- (whose select policy exposes any column to the public once status =
-- 'published') via a separate table with stakeholder-only RLS.
create table public.listing_confidential (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('sole_proprietorship', 'company')),
  commercial_registration_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.listing_confidential enable row level security;

create policy listing_confidential_select_stakeholders on public.listing_confidential
  for select using (
    owner_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.verification_requests vr
      where vr.listing_id = listing_confidential.listing_id
        and vr.accountant_id = auth.uid()
    )
  );

create policy listing_confidential_insert_owner on public.listing_confidential
  for insert with check (owner_id = auth.uid());

create policy listing_confidential_update_owner_or_admin on public.listing_confidential
  for update using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());

create trigger set_listing_confidential_updated_at
  before update on public.listing_confidential
  for each row execute function public.set_updated_at();

-- Financial statement upload: owner-initiated, visible only to
-- owner + assigned accountant + admin (same access shape as report_path).
alter table public.verification_requests
  add column financial_statement_path text;

create or replace function public.guard_verification_request_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_privileged boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'requested';
    new.accountant_id := null;
    new.fee_amount := null;
    new.verified_revenue := null;
    new.report_path := null;
    new.completed_at := null;
    new.financial_statement_path := null;
    return new;
  end if;

  if new.listing_id is distinct from old.listing_id
     or new.owner_id is distinct from old.owner_id
     or new.fee_amount is distinct from old.fee_amount then
    raise exception 'not authorized to modify protected verification request fields'
      using errcode = '42501';
  end if;

  -- Privileged path: the already-assigned accountant, or an active accountant
  -- claiming an unassigned request (old.accountant_id is null, new is themself).
  -- Null-safe: both branches require an explicit non-null match to auth.uid(),
  -- never relying on `NULL = auth.uid()` (which is NULL, not false).
  v_is_privileged := (old.accountant_id is not null and old.accountant_id = auth.uid())
    or (old.accountant_id is null and new.accountant_id is not null and new.accountant_id = auth.uid());

  if not v_is_privileged then
    if new.status is distinct from old.status
       or new.accountant_id is distinct from old.accountant_id
       or new.verified_revenue is distinct from old.verified_revenue
       or new.notes is distinct from old.notes
       or new.completed_at is distinct from old.completed_at
       or new.report_path is distinct from old.report_path then
      raise exception 'not authorized to modify verification request lifecycle fields'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status not in ('in_review', 'completed', 'rejected') then
    raise exception 'not authorized to set verification request status to %', new.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create policy verification_requests_update_owner on public.verification_requests
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy verification_docs_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.verification_requests vr
      where vr.id::text = (storage.foldername(name))[1]
        and vr.owner_id = auth.uid()
    )
  );
