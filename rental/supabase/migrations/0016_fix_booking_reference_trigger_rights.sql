-- Two problems, one cause: set_booking_reference() ran with the caller's
-- rights.
--
-- 1. It calls generate_booking_reference(), whose EXECUTE was revoked from
--    clients by the hardening pass — so every booking insert failed with
--    "permission denied for function generate_booking_reference" once the
--    is_blocked() problem in front of it was cleared.
--
-- 2. Worse, and silent: the generator checks its candidate for uniqueness
--    with "not exists (select 1 from bookings where reference = ...)". Under
--    the caller's rights that SELECT is filtered by RLS to the customer's own
--    bookings, so it cannot see anyone else's references and would eventually
--    hand out one already taken — surfacing to an unlucky customer as a
--    random unique-violation on a booking that should have worked.
--
-- Making the trigger SECURITY DEFINER fixes both: the uniqueness check sees
-- the whole table, and the internal generator stays unreachable from clients
-- rather than being granted out just to satisfy the trigger.
create or replace function public.set_booking_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.generate_booking_reference();
  end if;
  return new;
end;
$$;
