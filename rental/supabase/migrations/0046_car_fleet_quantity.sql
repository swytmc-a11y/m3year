-- Every `cars` row has stood for exactly one physical car since day one:
-- `bookings_no_overlap` (0001) is a GIST exclusion constraint that makes a
-- second live booking on the same car_id impossible to insert, full stop.
-- That was correct while a branch only ever listed one unit of a model, but
-- a branch with 5 Yaris and another with 2 needs each row to represent a
-- whole mini-fleet: still unavailable once every unit is out, not after
-- the first booking.
--
-- `quantity` is that fleet size. Defaults to 1 so every existing car keeps
-- today's exact behaviour (1 booking already fills it) without anyone
-- having to touch anything.
alter table public.cars
  add column quantity integer not null default 1
  constraint cars_quantity_non_negative check (quantity >= 0);

-- ---------------------------------------------------------- capacity math --
-- The question every capacity check reduces to: across [p_start, p_end),
-- how many units are claimed at the single busiest moment? Two bookings
-- that never overlap each other (even if both overlap the requested range)
-- must not count as 2 at once — this sweeps clipped start/end events in
-- order rather than a naive "count anything touching the range", which
-- would over-reject exactly that case.
--
-- car_blocks (operator-side maintenance/inspection) are swept in too: a
-- block takes one unit out of service for its range same as a booking
-- would, rather than the old all-or-nothing behaviour of blocking the
-- whole row regardless of how many units exist.
--
-- Internal-only — never called directly by a client, so it carries no
-- grants (see the revoke at the bottom of this file).
create or replace function public.max_concurrent_units(
  p_car_id uuid,
  p_start date,
  p_end date,
  p_exclude_booking_id uuid default null,
  p_exclude_block_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with spans as (
    select greatest(b.start_date, p_start) as s, least(b.end_date, p_end) as e
      from public.bookings b
     where b.car_id = p_car_id
       and b.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
       and b.start_date < p_end
       and b.end_date > p_start
       and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
    union all
    select greatest(cb.start_date, p_start), least(cb.end_date, p_end)
      from public.car_blocks cb
     where cb.car_id = p_car_id
       and cb.start_date < p_end
       and cb.end_date > p_start
       and (p_exclude_block_id is null or cb.id <> p_exclude_block_id)
  ),
  events as (
    -- Ends must be applied before starts at an equal timestamp: a booking
    -- ending on day X and one starting on day X do not overlap (end_date
    -- is exclusive throughout this schema), so -1 has to land first or the
    -- sweep would register a false moment of double occupancy.
    select s as at, 1 as delta from spans
    union all
    select e as at, -1 as delta from spans
  ),
  running as (
    select sum(delta) over (order by at, delta rows between unbounded preceding and current row) as concurrent
      from events
  )
  select coalesce(max(concurrent), 0)::integer from running;
$$;

revoke all on function public.max_concurrent_units(uuid, date, date, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------- booking guard --
-- Replaces bookings_no_overlap: that constraint could only ever express
-- "at most 1 concurrent booking per car_id", which is exactly the
-- assumption this migration removes. A trigger is the only way to check
-- against a per-car quantity instead of a fixed constant.
--
-- The `for update` lock on the car row is what keeps this race-free: two
-- transactions booking the last unit of the same car serialize on that
-- lock, so the second one's capacity count runs only after the first has
-- committed (and used the unit up) or rolled back (and freed it). Without
-- it, two overlapping COUNT-then-INSERT transactions could both read
-- "capacity available" before either commits.
create or replace function public.check_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty integer;
  v_concurrent integer;
begin
  if new.status not in ('pending_payment', 'pending_confirmation', 'confirmed', 'active') then
    return new;
  end if;

  perform 1 from public.cars where id = new.car_id for update;

  select quantity into v_qty from public.cars where id = new.car_id;

  select public.max_concurrent_units(new.car_id, new.start_date, new.end_date, new.id, null)
    into v_concurrent;

  if v_concurrent + 1 > v_qty then
    -- Distinguishes "a maintenance block is what pushed this over" from a
    -- plain sellout, since the former has a clearer, more specific message
    -- the client already shows (this exact string predates this
    -- migration — see check_booking_not_blocked, which this replaces).
    if exists (
      select 1 from public.car_blocks cb
       where cb.car_id = new.car_id
         and cb.start_date < new.end_date
         and cb.end_date > new.start_date
    ) then
      raise exception 'car_unavailable_maintenance';
    else
      raise exception 'car_unavailable_full';
    end if;
  end if;

  return new;
end;
$$;

alter table public.bookings drop constraint bookings_no_overlap;

drop trigger if exists bookings_check_blocks on public.bookings;
drop function if exists public.check_booking_not_blocked();

create trigger bookings_check_capacity
  before insert or update on public.bookings
  for each row execute function public.check_booking_capacity();

-- A new function gets PUBLIC execute by default; this one only ever needs
-- to run via the trigger above, never as a direct client RPC.
revoke all on function public.check_booking_capacity() from public, anon, authenticated;

-- ------------------------------------------------------------ block guard --
-- A new maintenance block must not claim a unit that's already fully
-- committed to bookings — same capacity math, just checked from the other
-- side (does adding this block push usage over quantity, rather than does
-- adding this booking).
create or replace function public.check_block_not_booked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty integer;
  v_concurrent integer;
begin
  perform 1 from public.cars where id = new.car_id for update;

  select quantity into v_qty from public.cars where id = new.car_id;

  select public.max_concurrent_units(new.car_id, new.start_date, new.end_date, null, new.id)
    into v_concurrent;

  if v_concurrent + 1 > v_qty then
    raise exception 'car_has_bookings_in_range';
  end if;

  return new;
end;
$$;

revoke all on function public.check_block_not_booked() from public, anon, authenticated;

-- ------------------------------------------------------- search exclusion --
-- Still "which car ids to hide for these dates", now quantity-aware: only
-- excluded once every unit is spoken for at some point in the range, not
-- after the first booking. The overlap EXISTS check is a cheap pre-filter
-- — most cars have nothing booked at all in a given range, and only those
-- that do need the sweep run against them.
create or replace function public.cars_unavailable_between(p_start date, p_end date)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
    from public.cars c
   where exists (
           select 1 from public.bookings b
            where b.car_id = c.id
              and b.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
              and b.start_date < p_end
              and b.end_date > p_start
           union all
           select 1 from public.car_blocks cb
            where cb.car_id = c.id
              and cb.start_date < p_end
              and cb.end_date > p_start
         )
     and public.max_concurrent_units(c.id, p_start, p_end) >= c.quantity;
$$;

-- --------------------------------------------------------- booking calendar
-- Which dates to grey out on a car's own booking calendar — now "the days
-- this car has zero free units left" instead of "the days this car has any
-- booking at all". Built by sweeping day-by-day (bounded to the next two
-- years, a car's live bookings/blocks never reasonably reach further than
-- that) and merging consecutive full days back into ranges, since that's
-- the shape the calendar already consumes.
create or replace function public.car_unavailable_ranges(p_car_id uuid)
returns table (start_date date, end_date date)
language sql
stable
security definer
set search_path = public
as $$
  with qty as (
    select quantity from public.cars where id = p_car_id
  ),
  bounds as (
    select
      greatest(current_date, min(d)) as lo,
      least(max(d), current_date + interval '2 years')::date as hi
    from (
      select start_date as d from public.bookings
       where car_id = p_car_id
         and status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
      union all
      select end_date from public.bookings
       where car_id = p_car_id
         and status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
      union all
      select start_date from public.car_blocks where car_id = p_car_id
      union all
      select end_date from public.car_blocks where car_id = p_car_id
    ) x
  ),
  days as (
    select gs::date as d
      from bounds, generate_series(bounds.lo, bounds.hi - 1, interval '1 day') gs
     where bounds.hi is not null and bounds.lo <= bounds.hi - 1
  ),
  occupied as (
    select d.d,
           (
             select count(*) from public.bookings b
              where b.car_id = p_car_id
                and b.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
                and b.start_date <= d.d and b.end_date > d.d
           ) + (
             select count(*) from public.car_blocks cb
              where cb.car_id = p_car_id
                and cb.start_date <= d.d and cb.end_date > d.d
           ) as taken
      from days d
  ),
  full_days as (
    select occupied.d,
           -- Gaps-and-islands: consecutive calendar days that are all full
           -- share the same (date - row_number) value, so grouping by it
           -- clusters them into one range each.
           occupied.d - (row_number() over (order by occupied.d))::int as grp
      from occupied, qty
     where occupied.taken >= qty.quantity
  )
  select min(d) as start_date, (max(d) + 1) as end_date
    from full_days
   group by grp
   order by start_date;
$$;

-- -------------------------------------------------------------- extension --
-- quote_extension's own pre-checks (0040) predate quantity: "any other live
-- booking overlapping the extension window" and "any block overlapping it"
-- both treated a single match as fully blocking — same assumption the rest
-- of this migration removes. Same capacity math as check_booking_capacity,
-- evaluated over [b.end_date, p_new_end) and reported through the same
-- 'car_taken' / 'car_blocked' reasons the client already has copy for (see
-- mobile/lib/extensions.ts) — no client change needed.
create or replace function public.quote_extension(p_booking uuid, p_new_end date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  q jsonb;
  v_qty integer;
  v_concurrent integer;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;
  if b.customer_id <> (select auth.uid()) and not public.is_admin() then
    raise exception 'not_authorised';
  end if;

  if b.status not in ('confirmed', 'active') then
    return jsonb_build_object('ok', false, 'reason', 'status_not_extendable',
                              'status', b.status);
  end if;
  if p_new_end is null or p_new_end <= b.end_date then
    return jsonb_build_object('ok', false, 'reason', 'end_date_not_later',
                              'current_end', b.end_date);
  end if;

  select quantity into v_qty from public.cars where id = b.car_id;
  select public.max_concurrent_units(b.car_id, b.end_date, p_new_end, b.id, null)
    into v_concurrent;

  if v_concurrent + 1 > v_qty then
    if exists (
      select 1 from public.car_blocks cb
       where cb.car_id = b.car_id
         and cb.start_date < p_new_end
         and cb.end_date > b.end_date
    ) then
      return jsonb_build_object('ok', false, 'reason', 'car_blocked',
                                'current_end', b.end_date);
    else
      return jsonb_build_object('ok', false, 'reason', 'car_taken',
                                'current_end', b.end_date);
    end if;
  end if;

  q := public.quote_booking(b.car_id, b.end_date, p_new_end, '{}', null);

  return jsonb_build_object(
    'ok', true,
    'from', b.end_date,
    'to', p_new_end,
    'days_added', (q ->> 'days')::integer,
    'rate_tier', q ->> 'rate_tier',
    'daily_rate', (q ->> 'daily_rate')::numeric,
    'amount', (q ->> 'total')::numeric,
    'vat_rate', (q ->> 'vat_rate')::numeric,
    'vat_amount', (q ->> 'vat_amount')::numeric,
    'total_days_after', b.days + (q ->> 'days')::integer);
end;
$$;

-- request_extension leaned on the EXCLUDE constraint's exclusion_violation
-- to know "someone took this window in the meantime" — that constraint is
-- gone, so a lost race now surfaces as check_booking_capacity's plain
-- raised exception instead. Same function otherwise, copied from 0040.
create or replace function public.request_extension(p_booking uuid, p_new_end date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  q jsonb;
  v_id uuid;
begin
  q := public.quote_extension(p_booking, p_new_end);
  if not (q ->> 'ok')::boolean then
    return q;
  end if;

  select * into b from public.bookings where id = p_booking for update;

  insert into public.booking_extensions (
    booking_id, previous_end_date, new_end_date, days_added,
    daily_rate, rate_tier, amount, vat_rate, vat_amount
  ) values (
    b.id, b.end_date, p_new_end, (q ->> 'days_added')::integer,
    (q ->> 'daily_rate')::numeric, q ->> 'rate_tier',
    (q ->> 'amount')::numeric, (q ->> 'vat_rate')::numeric,
    (q ->> 'vat_amount')::numeric
  ) returning id into v_id;

  update public.bookings
     set end_date         = p_new_end,
         days             = b.days + (q ->> 'days_added')::integer,
         extensions_total = b.extensions_total + (q ->> 'amount')::numeric,
         updated_at       = now()
   where id = b.id;

  return q || jsonb_build_object('extension_id', v_id);
exception
  when exclusion_violation then
    return jsonb_build_object('ok', false, 'reason', 'car_taken');
  when others then
    if sqlerrm in ('car_unavailable_full', 'car_unavailable_maintenance') then
      return jsonb_build_object('ok', false, 'reason', 'car_taken');
    end if;
    raise;
end;
$$;
