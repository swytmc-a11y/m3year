-- Miyar (معيار) — saved searches and new-match alerts.
--
-- Inventory here is sparse and slow-moving: an investor who browses today and
-- finds nothing has no reason to come back, and no way to be told when the
-- thing they wanted finally appears. That is the retention hole this closes.
--
-- Filters are explicit columns rather than a jsonb blob so the matching query
-- below is a plain, indexable predicate instead of jsonb extraction on every
-- publish. A NULL filter column means "don't care", which is why every
-- comparison is written `(ss.x is null or ...)`.
--
-- The alert fires on the transition INTO published — not on every update of
-- an already-published row — so editing a live listing does not re-notify
-- everyone who saved a matching search.

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  kind text not null check (kind in ('listing', 'franchise')),
  sector business_sector,
  city text,
  min_revenue numeric,
  max_revenue numeric,
  verified_only boolean not null default false,
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index saved_searches_user_id_idx on public.saved_searches (user_id);
-- The publish trigger scans by kind among alert-enabled rows only.
create index saved_searches_alerts_idx on public.saved_searches (kind) where alerts_enabled;

alter table public.saved_searches enable row level security;

create policy saved_searches_select_own on public.saved_searches
  for select to authenticated using (user_id = (select auth.uid()));

create policy saved_searches_insert_own on public.saved_searches
  for insert to authenticated
  with check (user_id = (select auth.uid()) and not public.is_blocked((select auth.uid())));

create policy saved_searches_update_own on public.saved_searches
  for update to authenticated
  using (user_id = (select auth.uid()) and not public.is_blocked((select auth.uid())))
  with check (user_id = (select auth.uid()) and not public.is_blocked((select auth.uid())));

create policy saved_searches_delete_own on public.saved_searches
  for delete to authenticated using (user_id = (select auth.uid()));

-- A user could otherwise accumulate unbounded saved searches, each of which
-- costs a row in the fan-out on every single publish.
create or replace function public.limit_saved_searches() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.saved_searches where user_id = new.user_id) >= 20 then
    raise exception 'saved_search_limit_reached' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_saved_searches() from public, anon, authenticated;

create trigger saved_searches_limit before insert on public.saved_searches
  for each row execute function public.limit_saved_searches();

create or replace function public.notify_saved_search_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'published' or old.status is not distinct from new.status then
    return new;
  end if;

  if tg_table_name = 'listings' then
    insert into public.notifications (user_id, type, title, body, related_id)
    select ss.user_id,
           'saved_search_match',
           'فرصة جديدة تطابق بحثك',
           new.title,
           new.id
    from public.saved_searches ss
    where ss.kind = 'listing'
      and ss.alerts_enabled
      -- Never tell owners about their own ad.
      and ss.user_id <> new.owner_id
      and (ss.sector is null or ss.sector = new.sector)
      and (ss.city is null or ss.city = new.city)
      and (ss.min_revenue is null or new.monthly_revenue >= ss.min_revenue)
      and (ss.max_revenue is null or new.monthly_revenue <= ss.max_revenue)
      and (not ss.verified_only or new.verification_status = 'verified');
  else
    -- A distinct type from the listing case: both carry a bare related_id,
    -- and the app has to know which table to open.
    insert into public.notifications (user_id, type, title, body, related_id)
    select ss.user_id,
           'saved_search_match_franchise',
           'امتياز جديد يطابق بحثك',
           new.brand_name,
           new.id
    from public.saved_searches ss
    where ss.kind = 'franchise'
      and ss.alerts_enabled
      and ss.user_id <> new.owner_id
      and (ss.sector is null or ss.sector = new.sector)
      and (ss.city is null or ss.city = new.city)
      -- Franchises price entry as a fee, not monthly revenue, so the revenue
      -- range is read as the investor's budget for that fee.
      and (ss.min_revenue is null or new.franchise_fee >= ss.min_revenue)
      and (ss.max_revenue is null or new.franchise_fee <= ss.max_revenue)
      and (not ss.verified_only or new.verification_status = 'verified');
  end if;

  return new;
end;
$$;

revoke execute on function public.notify_saved_search_matches() from public, anon, authenticated;

create trigger listings_notify_saved_searches
  after update on public.listings
  for each row execute function public.notify_saved_search_matches();

create trigger franchises_notify_saved_searches
  after update on public.franchises
  for each row execute function public.notify_saved_search_matches();
