-- Adding the coupon parameter created a second overload rather than
-- replacing the original. The app calls this with four arguments, which
-- matches BOTH signatures (the fifth has a default) and Postgres refuses
-- the call as ambiguous — every quote in the booking screen would have
-- failed. Only the five-argument version should exist.
drop function if exists public.quote_booking(uuid, date, date, uuid[]);

revoke all on function public.quote_booking(uuid, date, date, uuid[], text) from public;
grant execute on function public.quote_booking(uuid, date, date, uuid[], text) to anon, authenticated;
