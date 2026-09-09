-- Same overlap as the others, just on two genuinely-UPDATE policies instead
-- of an update/select mix: a customer may update their own row, an admin
-- may update any row. One OR'd policy covers both with identical effect —
-- what a customer is actually allowed to change is enforced by the server
-- actions calling this, not by RLS distinguishing the two paths.
drop policy bookings_update_own_cancel on public.bookings;
drop policy bookings_update_admin on public.bookings;
create policy bookings_update on public.bookings
  for update to authenticated
  using (customer_id = (select auth.uid()) or public.is_admin())
  with check (customer_id = (select auth.uid()) or public.is_admin());
