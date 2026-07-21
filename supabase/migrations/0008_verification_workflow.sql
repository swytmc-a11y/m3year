-- Miyar (معيار) — Phase 4: financial verification workflow.
--
-- Actors: owner (mobile) requests verification; admin (web) assigns an
-- accountant; the accountant (web) reviews and completes/rejects. Status
-- propagation from verification_requests -> listings.verification_status
-- happens via SECURITY DEFINER triggers so neither the owner nor the
-- accountant needs (or gets) direct write access to the protected listing
-- columns — the guard trigger from phase 3 continues to block that.

-- ---------------------------------------------------------------------------
-- Only one open (non-terminal) verification request per listing at a time.
-- ---------------------------------------------------------------------------
create unique index verification_requests_one_open_per_listing
  on public.verification_requests (listing_id)
  where status not in ('completed', 'rejected');

-- ---------------------------------------------------------------------------
-- Column guard: restricts what owners (INSERT) and accountants (UPDATE) may
-- set directly. Admins bypass entirely.
-- ---------------------------------------------------------------------------
create or replace function public.guard_verification_request_columns()
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
    -- Owner may only open a fresh request; every operational field starts empty.
    new.status := 'requested';
    new.accountant_id := null;
    new.fee_amount := null;
    new.verified_revenue := null;
    new.report_path := null;
    new.completed_at := null;
    return new;
  end if;

  -- tg_op = 'UPDATE', reached only as the assigned accountant (RLS already
  -- restricts USING/CHECK to accountant_id = auth.uid()).
  if new.listing_id is distinct from old.listing_id
     or new.owner_id is distinct from old.owner_id
     or new.fee_amount is distinct from old.fee_amount then
    raise exception 'not authorized to modify protected verification request fields'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status not in ('in_review', 'completed', 'rejected') then
    raise exception 'not authorized to set verification request status to %', new.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger verification_requests_guard_columns
  before insert or update on public.verification_requests
  for each row execute function public.guard_verification_request_columns();

revoke execute on function public.guard_verification_request_columns() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Propagation: opening a request marks the listing "pending" verification.
-- ---------------------------------------------------------------------------
create or replace function public.handle_verification_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listings
  set verification_status = 'pending'
  where id = new.listing_id
    and verification_status in ('none', 'rejected');

  perform public.log_audit(
    'verification_request.created',
    'verification_request',
    new.id,
    jsonb_build_object('listing_id', new.listing_id)
  );

  return new;
end;
$$;

create trigger verification_requests_after_insert
  after insert on public.verification_requests
  for each row execute function public.handle_verification_request_created();

revoke execute on function public.handle_verification_request_created() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Propagation: completing/rejecting a request updates the listing's badge.
-- ---------------------------------------------------------------------------
create or replace function public.handle_verification_request_resolved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.listings
    set verification_status = 'verified',
        verified_at = now()
    where id = new.listing_id;

    perform public.log_audit(
      'verification_request.completed',
      'verification_request',
      new.id,
      jsonb_build_object('listing_id', new.listing_id, 'verified_revenue', new.verified_revenue)
    );
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    update public.listings
    set verification_status = 'rejected'
    where id = new.listing_id;

    perform public.log_audit(
      'verification_request.rejected',
      'verification_request',
      new.id,
      jsonb_build_object('listing_id', new.listing_id, 'notes', new.notes)
    );
  end if;

  return new;
end;
$$;

create trigger verification_requests_after_update
  after update on public.verification_requests
  for each row execute function public.handle_verification_request_resolved();

revoke execute on function public.handle_verification_request_resolved() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private storage bucket for accountant-uploaded verification reports.
-- Path convention: {verification_request_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-reports', 'verification-reports', false)
on conflict (id) do nothing;

create policy "verification_reports_insert_accountant_or_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification-reports'
    and exists (
      select 1 from public.verification_requests vr
      where vr.id::text = (storage.foldername(name))[1]
        and (vr.accountant_id = auth.uid() or public.is_admin())
    )
  );

create policy "verification_reports_select_stakeholders"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-reports'
    and exists (
      select 1 from public.verification_requests vr
      join public.listings l on l.id = vr.listing_id
      where vr.id::text = (storage.foldername(name))[1]
        and (
          vr.accountant_id = auth.uid()
          or l.owner_id = auth.uid()
          or public.is_admin()
        )
    )
  );
