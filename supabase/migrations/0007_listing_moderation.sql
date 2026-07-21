-- Miyar (معيار) — Phase 3: listing moderation columns + enforcement.

alter table public.listings
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text
    check (rejection_reason is null or char_length(rejection_reason) <= 1000);

-- Replaces the phase-2 guard. Consolidates ALL owner-side restrictions into a
-- single trigger so there is no ordering conflict between multiple triggers
-- that each mutate NEW.
--
-- Rules for a non-admin (the listing owner):
--   * may never create or transition a listing into 'published' or 'rejected'
--     (only an admin approves/rejects from the dashboard);
--   * may never set verification/feature/moderation fields directly;
--   * editing the core content of an already-approved (or rejected) listing
--     sends it back to 'pending_review' and invalidates any prior verification,
--     so an approved listing can never be silently altered after the fact.
create or replace function public.guard_listing_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new; -- admins may set any field / any status
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      raise exception 'not authorized to create a listing with status %', new.status
        using errcode = '42501';
    end if;
    -- Force a clean, unapproved starting state regardless of what was sent.
    new.verification_status := 'none';
    new.verified_at := null;
    new.is_featured := false;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  -- tg_op = 'UPDATE'
  if new.status in ('published', 'rejected')
     and new.status is distinct from old.status then
    raise exception 'not authorized to approve or reject a listing'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.is_featured is distinct from old.is_featured
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'not authorized to modify protected listing fields'
      using errcode = '42501';
  end if;

  -- Moderation integrity: re-review any content edit to a live/rejected listing.
  if old.status in ('published', 'rejected')
     and (new.title is distinct from old.title
          or new.sector is distinct from old.sector
          or new.city is distinct from old.city
          or new.monthly_revenue is distinct from old.monthly_revenue
          or new.offered_percentage is distinct from old.offered_percentage
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

-- Ensure the guard also runs on INSERT (phase 2 attached it to UPDATE only).
drop trigger if exists listings_guard_protected on public.listings;
create trigger listings_guard_protected
  before insert or update on public.listings
  for each row execute function public.guard_listing_protected_columns();

revoke execute on function public.guard_listing_protected_columns() from public, anon, authenticated;
