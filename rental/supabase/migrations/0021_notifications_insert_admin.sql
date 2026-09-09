-- No INSERT policy existed on notifications at all, so every admin-triggered
-- status notification (confirm/reject/start/complete/cancel, all in
-- app/actions/bookings.ts) silently failed — the insert runs under the
-- operator's own session (anon key + cookies), not the service role, and
-- RLS blocked it outright. The booking transition itself still succeeded
-- because notify() is deliberately best-effort and only logs the failure,
-- so this had no visible symptom besides customers never receiving a single
-- booking-status notification from an admin action.
--
-- Notifications are always system- or operator-generated, never authored by
-- the customer they are about, so this is admin-only — no customer INSERT
-- policy is added.
create policy notifications_insert_admin on public.notifications
  for insert to authenticated
  with check (public.is_admin());
