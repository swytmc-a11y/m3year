-- Browsing had no notion of "when": a customer picked a car, grew attached
-- to it, and only discovered at the booking screen that it was taken. This
-- is the set the feed subtracts so an unavailable car never appears for the
-- dates being searched.
--
-- Returns the UNAVAILABLE ids rather than the available ones because that
-- list is the smaller of the two in any healthy fleet, and it is what the
-- client filters out.
--
-- Overlap uses the same half-open convention as the rest of the system:
-- end_date is the return day and is exclusive, so a booking ending on the
-- 5th does not collide with one starting on the 5th.
create or replace function public.cars_unavailable_between(p_start date, p_end date)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct b.car_id
    from public.bookings b
   where b.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
     and b.start_date < p_end
     and b.end_date > p_start
  union
  select distinct c.car_id
    from public.car_blocks c
   where c.start_date < p_end
     and c.end_date > p_start;
$$;

revoke all on function public.cars_unavailable_between(date, date) from public;
grant execute on function public.cars_unavailable_between(date, date) to anon, authenticated;
