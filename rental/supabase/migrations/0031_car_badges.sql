-- Badges are derived, never stored. A stored badge is a promise that rots:
-- "most booked" stops being true the week after someone typed it, and
-- nobody goes back to clear it. These are computed from the same rows the
-- claim is about, so they cannot drift from what is true.
--
-- One badge per car, most interesting first — a card wearing four badges
-- communicates nothing at all.
create or replace function public.car_badges()
returns table (car_id uuid, badge text)
language sql
stable
security definer
set search_path = public
as $$
  with booked as (
    -- Demand over a rolling window rather than all time, so a car that was
    -- popular a year ago does not sit at the top of the list forever.
    select b.car_id, count(*)::integer as n
      from public.bookings b
     where b.created_at >= now() - interval '60 days'
       and b.status not in ('cancelled', 'rejected', 'expired')
     group by b.car_id
  ),
  ranked as (
    select car_id, n, row_number() over (order by n desc, car_id) as rk
      from booked
     where n > 0
  ),
  cheapest_in_category as (
    -- "Smart choice" means best price within its own class, not cheapest
    -- overall — otherwise the label only ever lands on the economy cars.
    select distinct on (c.category) c.category, c.id
      from public.cars c
     where c.status = 'available'
     order by c.category, c.daily_price asc, c.id
  )
  select c.id as car_id,
         case
           when r.rk <= 2 then 'most_booked'
           when c.rating_count >= 3 and c.rating_avg >= 4.5 then 'top_rated'
           when c.seats >= 7 then 'family'
           when cic.id is not null then 'smart_choice'
           when c.daily_km_limit is null then 'unlimited_km'
           when c.daily_km_limit >= 400 then 'extra_km'
         end as badge
    from public.cars c
    left join ranked r on r.car_id = c.id
    left join cheapest_in_category cic on cic.id = c.id
   where c.status = 'available';
$$;

revoke all on function public.car_badges() from public;
grant execute on function public.car_badges() to anon, authenticated;
