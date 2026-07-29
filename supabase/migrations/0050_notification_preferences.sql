-- Miyar (معيار) — per-type notification preferences.
--
-- Settings previously exposed only a dark-mode toggle: a user could not mute
-- chat pings while keeping listing-status alerts, despite push tokens being
-- registered globally.
--
-- Enforcement is a BEFORE INSERT trigger on notifications rather than a check
-- inside each producer. Notifications are written from several places (DB
-- triggers on listings/franchises/verification, the promotion payment
-- functions, and future producers like saved-search alerts); putting the
-- decision in one trigger means a new producer cannot forget to honour the
-- preference. Returning NULL from a BEFORE INSERT trigger skips the row
-- silently, which is exactly "don't notify me" — not an error.
--
-- Absent row = every category on. New users therefore get the current
-- behaviour, and no backfill is required.

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  new_message boolean not null default true,
  listing_status boolean not null default true,
  verification boolean not null default true,
  promotion boolean not null default true,
  saved_search boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy notification_preferences_select_own on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));

create policy notification_preferences_insert_own on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()) and not public.is_blocked((select auth.uid())));

create policy notification_preferences_update_own on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()) and not public.is_blocked((select auth.uid())))
  with check (user_id = (select auth.uid()) and not public.is_blocked((select auth.uid())));

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create or replace function public.apply_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wanted boolean;
begin
  select case
    when new.type = 'new_message' then np.new_message
    when new.type in ('listing_published', 'listing_rejected',
                      'franchise_published', 'franchise_rejected') then np.listing_status
    when new.type like 'verification%' then np.verification
    when new.type like 'promotion%' then np.promotion
    when new.type like 'saved_search_match%' then np.saved_search
    else true
  end
  into v_wanted
  from public.notification_preferences np
  where np.user_id = new.user_id;

  -- No preferences row means "everything on", which is also what v_wanted
  -- being NULL means here — only an explicit false suppresses.
  if v_wanted is false then
    return null;
  end if;
  return new;
end;
$$;

revoke execute on function public.apply_notification_preferences() from public, anon, authenticated;

create trigger notifications_apply_preferences
  before insert on public.notifications
  for each row execute function public.apply_notification_preferences();
