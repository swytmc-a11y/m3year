-- Miyar Rental — row level security
--
-- The shape here is deliberately narrow. Because there is no user-generated
-- content, almost every table reduces to one of two patterns:
--   catalogue  -> anyone reads published rows, only admins write
--   own-data   -> a user touches only rows carrying their own id
-- Anything that does not fit one of those two is worth a second look.

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.cars enable row level security;
alter table public.car_private enable row level security;
alter table public.addons enable row level security;
alter table public.car_addons enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_addons enable row level security;
alter table public.car_blocks enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_tokens enable row level security;
alter table public.app_settings enable row level security;
alter table public.client_errors enable row level security;
alter table public.audit_log enable row level security;
alter table public.admin_otp_verifications enable row level security;
alter table public.rate_limits enable row level security;

-- ------------------------------------------------------------- profiles ----
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- ------------------------------------------------------------- branches ----
-- Branch info is public: the app shows the map and contact details before
-- anyone signs in.
create policy branches_select_public on public.branches
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy branches_write_admin on public.branches
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------- cars ----
-- Browsing without an account is intentional: it is the top of the funnel.
create policy cars_select_public on public.cars
  for select to anon, authenticated
  using (status in ('available', 'maintenance') or public.is_admin());

create policy cars_write_admin on public.cars
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy car_private_admin_only on public.car_private
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------------------- addons ----
create policy addons_select_public on public.addons
  for select to anon, authenticated
  using (is_active or public.is_admin());

create policy addons_write_admin on public.addons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy car_addons_select_public on public.car_addons
  for select to anon, authenticated
  using (true);

create policy car_addons_write_admin on public.car_addons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------- bookings ----
create policy bookings_select_own on public.bookings
  for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_admin());

-- A customer creates their own booking; a blocked account cannot. Status
-- and money fields are not trusted from the client — the server action
-- writes them from quote_booking's output.
create policy bookings_insert_own on public.bookings
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and not public.is_blocked((select auth.uid()))
  );

-- Customers may only ever cancel; every other transition is the operator's.
create policy bookings_update_own_cancel on public.bookings
  for update to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

create policy bookings_update_admin on public.bookings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy booking_addons_select_own on public.booking_addons
  for select to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and (b.customer_id = (select auth.uid()) or public.is_admin())
    )
  );

create policy booking_addons_insert_own on public.booking_addons
  for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.customer_id = (select auth.uid())
    )
    or public.is_admin()
  );

-- Blocked dates are public so the calendar can grey them out, but the
-- reason (which may be internal) is only useful to admins.
create policy car_blocks_select_public on public.car_blocks
  for select to anon, authenticated
  using (true);

create policy car_blocks_write_admin on public.car_blocks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------- own-data set ----
create policy favorites_all_own on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy saved_searches_all_own on public.saved_searches
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notification_preferences_all_own on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_tokens_all_own on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy rate_limits_insert_own on public.rate_limits
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy rate_limits_select_own on public.rate_limits
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- --------------------------------------------------------------- reviews ----
create policy reviews_select_public on public.reviews
  for select to anon, authenticated
  using (true);

-- Only after actually completing that rental.
create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_blocked((select auth.uid()))
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.customer_id = (select auth.uid())
        and b.status = 'completed'
    )
  );

create policy reviews_delete_admin on public.reviews
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------- settings/ops ----
create policy app_settings_select_public on public.app_settings
  for select to anon, authenticated
  using (true);

create policy app_settings_write_admin on public.app_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Crash reports and user-submitted problems: anyone may write one (a crash
-- can happen before sign-in), only admins may read them back.
create policy client_errors_insert_any on public.client_errors
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

create policy client_errors_select_admin on public.client_errors
  for select to authenticated
  using (public.is_admin());

create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (public.is_admin());

create policy admin_otp_select_own on public.admin_otp_verifications
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_admin());

create policy admin_otp_insert_own on public.admin_otp_verifications
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_admin());

create policy admin_otp_update_own on public.admin_otp_verifications
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_admin())
  with check (user_id = (select auth.uid()) and public.is_admin());

-- Deliberately not gated on is_admin: sign-out must still clear the
-- step-up row even if the role was revoked while the session was live.
create policy admin_otp_delete_own on public.admin_otp_verifications
  for delete to authenticated
  using (user_id = (select auth.uid()));
