-- Miyar (معيار) — view counters for listings and franchises.
--
-- Owners get a real signal about whether their ad is being seen, and browsers
-- get the social proof that makes a marketplace feel alive.
--
-- view_count is NOT an ordinary column: it is in the protected set, so a
-- plain update cannot touch it. It moves only through increment_view_count,
-- which takes no count parameter — a caller can say "viewed once", never
-- "viewed ten thousand times" — and which ignores the owner's own visits so
-- the number does not just measure how often the seller refreshed the page.
--
-- The guard cannot simply trust SECURITY DEFINER here: that changes the
-- privilege, not auth.uid(), so the guard would still see an ordinary user
-- and reject the function's own update. A transaction-local marker set only
-- inside increment_view_count distinguishes the two. Clients cannot forge it:
-- PostgREST exposes no way to run arbitrary SQL, and no other function calls
-- set_config.

alter table public.listings   add column if not exists view_count integer not null default 0;
alter table public.franchises add column if not exists view_count integer not null default 0;

create or replace function public.increment_view_count(
  p_target_type text,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('miyar.view_increment', 'on', true);

  if p_target_type = 'listing' then
    update public.listings
      set view_count = view_count + 1
      where id = p_target_id
        and status = 'published'
        and owner_id is distinct from auth.uid();
  elsif p_target_type = 'franchise' then
    update public.franchises
      set view_count = view_count + 1
      where id = p_target_id
        and status = 'published'
        and owner_id is distinct from auth.uid();
  end if;

  perform set_config('miyar.view_increment', 'off', true);
end;
$$;

grant execute on function public.increment_view_count(text, uuid) to anon, authenticated;

-- The two guards below are the 0040 versions plus the view_count clauses.
-- See 0040 for why the auth.uid() is null branch exists.
CREATE OR REPLACE FUNCTION public.guard_franchise_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is null then
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
    new.featured_until := null;
    new.view_count := 0;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.view_count is distinct from old.view_count
     and coalesce(current_setting('miyar.view_increment', true), 'off') <> 'on' then
    raise exception 'not authorized to modify franchise view count'
      using errcode = '42501';
  end if;

  if new.status in ('published', 'rejected')
     and new.status is distinct from old.status then
    raise exception 'not authorized to approve or reject a franchise'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.is_featured is distinct from old.is_featured
     or new.featured_until is distinct from old.featured_until
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
$function$;

CREATE OR REPLACE FUNCTION public.guard_listing_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      raise exception 'not authorized to create a listing with status %', new.status
        using errcode = '42501';
    end if;
    new.verification_status := 'none';
    new.verified_at := null;
    new.is_featured := false;
    new.featured_until := null;
    new.view_count := 0;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  -- view_count moves only via increment_view_count, which marks the
  -- transaction. Any other attempt to change it is rejected.
  if new.view_count is distinct from old.view_count
     and coalesce(current_setting('miyar.view_increment', true), 'off') <> 'on' then
    raise exception 'not authorized to modify listing view count'
      using errcode = '42501';
  end if;

  if new.status in ('published', 'rejected')
     and new.status is distinct from old.status then
    raise exception 'not authorized to approve or reject a listing'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.is_featured is distinct from old.is_featured
     or new.featured_until is distinct from old.featured_until
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'not authorized to modify protected listing fields'
      using errcode = '42501';
  end if;

  if old.status in ('published', 'rejected')
     and (new.title is distinct from old.title
          or new.sector is distinct from old.sector
          or new.city is distinct from old.city
          or new.monthly_revenue is distinct from old.monthly_revenue
          or new.offered_percentage is distinct from old.offered_percentage
          or new.description is distinct from old.description
          or new.reason_for_selling is distinct from old.reason_for_selling
          or new.reason_for_selling_other is distinct from old.reason_for_selling_other) then
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
$function$;
