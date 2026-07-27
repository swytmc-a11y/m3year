-- ============================================================================
-- Franchise marketplace module. Mirrors the `listings` architecture (same
-- status lifecycle, same guard-trigger pattern, same RLS shape) rather than
-- inventing a new one, since franchising here is a license/fee arrangement
-- (franchise fee + royalty), not an equity offering -- it stays within the
-- platform's existing "ads + verification only" legal posture, unlike an
-- equity-crowdfunding model would.
-- ============================================================================

create table public.franchises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  brand_name text not null check (char_length(brand_name) >= 3 and char_length(brand_name) <= 140),
  sector public.business_sector not null,
  city text not null check (char_length(city) >= 2 and char_length(city) <= 60),
  cities_available text[] not null default '{}',
  countries_available text[] not null default '{}',
  description text check (description is null or char_length(description) <= 5000),
  logo_url text,
  photo_urls text[] not null default '{}',
  founding_year smallint check (founding_year is null or founding_year between 1950 and 2100),
  current_branches_count smallint check (current_branches_count is null or current_branches_count >= 0),
  franchise_fee numeric(14,2) not null check (franchise_fee >= 0),
  initial_investment_min numeric(14,2) check (initial_investment_min is null or initial_investment_min >= 0),
  initial_investment_max numeric(14,2) check (initial_investment_max is null or initial_investment_max >= 0),
  royalty_percentage numeric(5,2) check (royalty_percentage is null or (royalty_percentage >= 0 and royalty_percentage <= 100)),
  required_space_sqm numeric(10,2) check (required_space_sqm is null or required_space_sqm >= 0),
  required_employees_count smallint check (required_employees_count is null or required_employees_count >= 0),
  expected_payback_months smallint check (expected_payback_months is null or expected_payback_months >= 0),
  training_provided boolean not null default false,
  operational_support text check (operational_support is null or char_length(operational_support) <= 2000),
  marketing_support text check (marketing_support is null or char_length(marketing_support) <= 2000),
  status public.listing_status not null default 'draft',
  verification_status public.verification_status not null default 'none',
  verified_at timestamptz,
  is_featured boolean not null default false,
  reviewed_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint franchises_investment_range_check
    check (initial_investment_min is null or initial_investment_max is null or initial_investment_max >= initial_investment_min)
);

create index franchises_owner_id_idx on public.franchises(owner_id);
create index franchises_status_idx on public.franchises(status);

alter table public.franchises enable row level security;

create trigger franchises_set_updated_at
  before update on public.franchises
  for each row execute function public.set_updated_at();

create or replace function public.guard_franchise_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      raise exception 'not authorized to create a franchise with status %', new.status
        using errcode = '42501';
    end if;
    new.verification_status := 'none';
    new.verified_at := null;
    new.is_featured := false;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.status in ('published', 'rejected')
     and new.status is distinct from old.status then
    raise exception 'not authorized to approve or reject a franchise'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.is_featured is distinct from old.is_featured
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'not authorized to modify protected franchise fields'
      using errcode = '42501';
  end if;

  if old.status in ('published', 'rejected')
     and (new.brand_name is distinct from old.brand_name
          or new.sector is distinct from old.sector
          or new.city is distinct from old.city
          or new.franchise_fee is distinct from old.franchise_fee
          or new.description is distinct from old.description) then
    new.status := 'pending_review';
    new.reviewed_at := null;
    new.rejection_reason := null;
    if new.verification_status = 'verified' then
      new.verification_status := 'none';
      new.verified_at := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger franchises_guard_protected
  before insert or update on public.franchises
  for each row execute function public.guard_franchise_protected_columns();

revoke execute on function public.guard_franchise_protected_columns() from public, anon, authenticated;

create policy "franchises_select_published_public"
  on public.franchises for select
  using (status = 'published');

create policy "franchises_select_own_or_admin"
  on public.franchises for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "franchises_insert_own"
  on public.franchises for insert to authenticated
  with check (owner_id = auth.uid() and not public.is_blocked(auth.uid()));

create policy "franchises_update_own_or_admin"
  on public.franchises for update to authenticated
  using ((owner_id = auth.uid() or public.is_admin()) and not public.is_blocked(auth.uid()))
  with check ((owner_id = auth.uid() or public.is_admin()) and not public.is_blocked(auth.uid()));

create policy "franchises_delete_own_or_admin"
  on public.franchises for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- Polymorphic extension: verification_requests, favorites, conversations can
-- now target either a listing or a franchise (exactly one of the two). Done
-- before franchise_confidential so its policy can reference the new column.
-- ============================================================================

alter table public.verification_requests
  alter column listing_id drop not null,
  add column franchise_id uuid references public.franchises(id) on delete cascade,
  add constraint verification_requests_target_check
    check ((listing_id is not null and franchise_id is null) or (listing_id is null and franchise_id is not null));

create index verification_requests_franchise_id_idx on public.verification_requests(franchise_id);

alter table public.favorites
  alter column listing_id drop not null,
  add column franchise_id uuid references public.franchises(id) on delete cascade,
  add constraint favorites_target_check
    check ((listing_id is not null and franchise_id is null) or (listing_id is null and franchise_id is not null)),
  add constraint favorites_user_id_franchise_id_key unique (user_id, franchise_id);

create index favorites_franchise_id_idx on public.favorites(franchise_id);

alter table public.conversations
  alter column listing_id drop not null,
  add column franchise_id uuid references public.franchises(id) on delete cascade,
  add constraint conversations_target_check
    check ((listing_id is not null and franchise_id is null) or (listing_id is null and franchise_id is not null)),
  add constraint conversations_unique_per_investor_franchise unique (franchise_id, investor_id);

create index conversations_franchise_id_idx on public.conversations(franchise_id);

drop policy "verification_requests_insert_owner" on public.verification_requests;
create policy "verification_requests_insert_owner"
  on public.verification_requests for insert to authenticated
  with check (
    owner_id = auth.uid()
    and not public.is_blocked(auth.uid())
    and (
      (listing_id is not null and exists (select 1 from public.listings l where l.id = verification_requests.listing_id and l.owner_id = auth.uid()))
      or
      (franchise_id is not null and exists (select 1 from public.franchises f where f.id = verification_requests.franchise_id and f.owner_id = auth.uid()))
    )
  );

drop policy "conversations_insert_investor" on public.conversations;
create policy "conversations_insert_investor"
  on public.conversations for insert to authenticated
  with check (
    investor_id = auth.uid()
    and owner_id <> auth.uid()
    and not public.is_blocked(auth.uid())
    and (
      (listing_id is not null and exists (
        select 1 from public.listings l
        where l.id = conversations.listing_id and l.owner_id = conversations.owner_id and l.status = 'published'
      ))
      or
      (franchise_id is not null and exists (
        select 1 from public.franchises f
        where f.id = conversations.franchise_id and f.owner_id = conversations.owner_id and f.status = 'published'
      ))
    )
  );

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
     or new.franchise_id is distinct from old.franchise_id
     or new.owner_id is distinct from old.owner_id
     or new.fee_amount is distinct from old.fee_amount then
    raise exception 'not authorized to modify protected verification request fields'
      using errcode = '42501';
  end if;

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

create or replace function public.handle_verification_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  set local session_replication_role = replica;

  if new.listing_id is not null then
    update public.listings
    set verification_status = 'pending'
    where id = new.listing_id
      and verification_status in ('none', 'rejected');
  else
    update public.franchises
    set verification_status = 'pending'
    where id = new.franchise_id
      and verification_status in ('none', 'rejected');
  end if;

  set local session_replication_role = default;

  perform public.log_audit(
    'verification_request.created',
    'verification_request',
    new.id,
    jsonb_build_object('listing_id', new.listing_id, 'franchise_id', new.franchise_id)
  );

  return new;
end;
$$;

create or replace function public.handle_verification_request_resolved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    set local session_replication_role = replica;

    if new.listing_id is not null then
      update public.listings set verification_status = 'verified', verified_at = now() where id = new.listing_id;
    else
      update public.franchises set verification_status = 'verified', verified_at = now() where id = new.franchise_id;
    end if;

    set local session_replication_role = default;

    perform public.log_audit(
      'verification_request.completed',
      'verification_request',
      new.id,
      jsonb_build_object('listing_id', new.listing_id, 'franchise_id', new.franchise_id, 'verified_revenue', new.verified_revenue)
    );
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    set local session_replication_role = replica;

    if new.listing_id is not null then
      update public.listings set verification_status = 'rejected' where id = new.listing_id;
    else
      update public.franchises set verification_status = 'rejected' where id = new.franchise_id;
    end if;

    set local session_replication_role = default;

    perform public.log_audit(
      'verification_request.rejected',
      'verification_request',
      new.id,
      jsonb_build_object('listing_id', new.listing_id, 'franchise_id', new.franchise_id, 'notes', new.notes)
    );
  end if;

  return new;
end;
$$;

create or replace function public.trg_notify_verification_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      perform public.create_notification(
        new.owner_id, 'verification_completed', 'اكتمل التوثيق المالي',
        'تم توثيق مشروعك ماليًا بنجاح.', coalesce(new.listing_id, new.franchise_id)
      );
    elsif new.status = 'rejected' then
      perform public.create_notification(
        new.owner_id, 'verification_rejected', 'تعذّر إتمام التوثيق',
        coalesce(new.notes, 'راجع طلب التوثيق لمزيد من التفاصيل.'), coalesce(new.listing_id, new.franchise_id)
      );
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================================
-- Confidential legal-entity details for franchises, same split-table pattern
-- as listing_confidential. Created after verification_requests.franchise_id
-- exists so the stakeholder-select policy can reference it.
-- ============================================================================

create table public.franchise_confidential (
  franchise_id uuid primary key references public.franchises(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text not null check (entity_type in ('sole_proprietorship', 'company')),
  commercial_registration_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.franchise_confidential enable row level security;

create trigger franchise_confidential_set_updated_at
  before update on public.franchise_confidential
  for each row execute function public.set_updated_at();

create policy "franchise_confidential_insert_owner"
  on public.franchise_confidential for insert to authenticated
  with check (
    owner_id = auth.uid()
    and not public.is_blocked(auth.uid())
    and exists (select 1 from public.franchises f where f.id = franchise_confidential.franchise_id and f.owner_id = auth.uid())
  );

create policy "franchise_confidential_select_stakeholders"
  on public.franchise_confidential for select to authenticated
  using (
    owner_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.verification_requests vr
      join public.accountants a on a.id = vr.accountant_id
      where vr.franchise_id = franchise_confidential.franchise_id
        and vr.accountant_id = auth.uid()
        and a.is_active
    )
  );

create policy "franchise_confidential_update_owner_or_admin"
  on public.franchise_confidential for update to authenticated
  using ((owner_id = auth.uid() or public.is_admin()) and not public.is_blocked(auth.uid()))
  with check ((owner_id = auth.uid() or public.is_admin()) and not public.is_blocked(auth.uid()));

-- ============================================================================
-- AI analysis scaffold (schema only -- not wired to any UI yet; no edge
-- function deployed; nothing calls out to a model until an API key exists
-- and the feature is explicitly turned on).
-- ============================================================================

create table public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('listing', 'franchise')),
  target_id uuid not null,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  model_version text,
  content jsonb,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_reports_target_idx on public.ai_reports(target_type, target_id);

alter table public.ai_reports enable row level security;

create trigger ai_reports_set_updated_at
  before update on public.ai_reports
  for each row execute function public.set_updated_at();

create or replace function public.owns_ai_report_target(p_target_type text, p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_target_type
    when 'listing' then exists (select 1 from public.listings l where l.id = p_target_id and l.owner_id = auth.uid())
    when 'franchise' then exists (select 1 from public.franchises f where f.id = p_target_id and f.owner_id = auth.uid())
    else false
  end;
$$;

revoke execute on function public.owns_ai_report_target(text, uuid) from public;
grant execute on function public.owns_ai_report_target(text, uuid) to authenticated;

create or replace function public.guard_ai_report_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.content := null;
    new.published := false;
    new.published_at := null;
    return new;
  end if;

  if new.published is distinct from old.published
     or new.published_at is distinct from old.published_at
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id
     or new.requested_by is distinct from old.requested_by then
    raise exception 'not authorized to modify protected ai_reports fields'
      using errcode = '42501';
  end if;

  if new.status not in ('completed', 'failed') then
    raise exception 'not authorized to set ai_reports status to %', new.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger ai_reports_guard_protected
  before insert or update on public.ai_reports
  for each row execute function public.guard_ai_report_columns();

revoke execute on function public.guard_ai_report_columns() from public, anon, authenticated;

create policy "ai_reports_select_owner_or_admin"
  on public.ai_reports for select to authenticated
  using (public.owns_ai_report_target(target_type, target_id) or public.is_admin());

create policy "ai_reports_select_published_public"
  on public.ai_reports for select
  using (published = true);

create policy "ai_reports_insert_owner_or_admin"
  on public.ai_reports for insert to authenticated
  with check (
    requested_by = auth.uid()
    and not public.is_blocked(auth.uid())
    and (public.owns_ai_report_target(target_type, target_id) or public.is_admin())
  );

create policy "ai_reports_update_owner_or_admin"
  on public.ai_reports for update to authenticated
  using ((public.owns_ai_report_target(target_type, target_id) or public.is_admin()) and not public.is_blocked(auth.uid()))
  with check ((public.owns_ai_report_target(target_type, target_id) or public.is_admin()) and not public.is_blocked(auth.uid()));
