-- Covering indexes for foreign keys the linter flagged. Cheap now, and
-- these are exactly the join/filter columns admin queries and RLS checks
-- will hit as the fleet and booking history grow.
create index if not exists audit_log_actor_idx on public.audit_log (actor_id);
create index if not exists booking_addons_addon_idx on public.booking_addons (addon_id);
create index if not exists car_addons_addon_idx on public.car_addons (addon_id);
create index if not exists car_blocks_created_by_idx on public.car_blocks (created_by);
create index if not exists client_errors_user_idx on public.client_errors (user_id);
create index if not exists favorites_car_idx on public.favorites (car_id);
create index if not exists reviews_author_idx on public.reviews (author_id);
create index if not exists reviews_branch_idx on public.reviews (branch_id);

-- The seven "multiple permissive policies" findings are all the same
-- shape: a `for all` admin-write policy overlaps a public `for select`
-- policy on the same table, so Postgres evaluates two policies on every
-- SELECT an authenticated user runs instead of one. Splitting the admin
-- policy to the three write actions removes the overlap with no change in
-- who can do what — is_admin() already implies read access via the public
-- select policy's own `or public.is_admin()` clause.
drop policy addons_write_admin on public.addons;
create policy addons_write_admin on public.addons
  for insert to authenticated with check (public.is_admin());
create policy addons_update_admin on public.addons
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy addons_delete_admin on public.addons
  for delete to authenticated using (public.is_admin());

drop policy app_settings_write_admin on public.app_settings;
create policy app_settings_insert_admin on public.app_settings
  for insert to authenticated with check (public.is_admin());
create policy app_settings_update_admin on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy app_settings_delete_admin on public.app_settings
  for delete to authenticated using (public.is_admin());

drop policy branches_write_admin on public.branches;
create policy branches_insert_admin on public.branches
  for insert to authenticated with check (public.is_admin());
create policy branches_update_admin on public.branches
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy branches_delete_admin on public.branches
  for delete to authenticated using (public.is_admin());

drop policy car_addons_write_admin on public.car_addons;
create policy car_addons_insert_admin on public.car_addons
  for insert to authenticated with check (public.is_admin());
create policy car_addons_update_admin on public.car_addons
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy car_addons_delete_admin on public.car_addons
  for delete to authenticated using (public.is_admin());

drop policy car_blocks_write_admin on public.car_blocks;
create policy car_blocks_insert_admin on public.car_blocks
  for insert to authenticated with check (public.is_admin());
create policy car_blocks_update_admin on public.car_blocks
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy car_blocks_delete_admin on public.car_blocks
  for delete to authenticated using (public.is_admin());

drop policy cars_write_admin on public.cars;
create policy cars_insert_admin on public.cars
  for insert to authenticated with check (public.is_admin());
create policy cars_update_admin on public.cars
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cars_delete_admin on public.cars
  for delete to authenticated using (public.is_admin());

-- bookings is different: bookings_update_admin and bookings_update_own_cancel
-- are both genuinely UPDATE policies (not an update/select overlap), so they
-- cannot be split the same way. Left as is — an admin and a customer
-- legitimately need independent UPDATE paths on the same table.
