-- The insert policy on bookings checked WHO was booking and never WHAT they
-- were paying. Every pricing column came from the client, so a request made
-- outside the app could create a booking with total = 0 — and the payment
-- function charges from that stored total. Coupons would have widened the
-- same hole: any discount_amount the caller liked.
--
-- Prices are now computed here, on insert, and whatever the client sent is
-- overwritten. The app keeps calling quote_booking() to SHOW a price; this
-- is what makes the shown price and the charged price the same thing.

-- The amount a coupon takes off a given total, with no eligibility check.
-- Eligibility is settled once, at insert; this exists so the amount can be
-- recomputed when add-ons change the subtotal without the coupon's own
-- booking counting against its per-customer limit.
create or replace function public.coupon_discount_for(p_coupon_id uuid, p_total numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v numeric;
begin
  select * into c from public.coupons where id = p_coupon_id;
  if not found then return 0; end if;

  if c.discount_type = 'percent' then
    v := round(p_total * c.discount_value / 100.0, 2);
    if c.max_discount is not null then v := least(v, c.max_discount); end if;
  else
    v := c.discount_value;
  end if;

  return greatest(least(v, p_total), 0);
end;
$$;

create or replace function public.enforce_booking_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q jsonb;
  v_coupon jsonb;
begin
  -- Add-ons are attached after the booking row exists, so the base price is
  -- computed without them here and the add-on trigger tops it up.
  q := public.quote_booking(new.car_id, new.start_date, new.end_date, '{}',
                            nullif(btrim(coalesce(new.coupon_code, '')), ''));

  new.days          := (q ->> 'days')::integer;
  new.rate_tier     := q ->> 'rate_tier';
  new.daily_rate    := (q ->> 'daily_rate')::numeric;
  new.rental_total  := (q ->> 'rental_total')::numeric;
  new.addons_total  := 0;
  new.vat_rate      := (q ->> 'vat_rate')::numeric;

  v_coupon := q -> 'coupon';
  if v_coupon is not null and (v_coupon ->> 'valid')::boolean then
    new.coupon_id       := (v_coupon ->> 'coupon_id')::uuid;
    new.coupon_code     := v_coupon ->> 'code';
    new.discount_amount := (v_coupon ->> 'discount_amount')::numeric;
  else
    -- An invalid code is dropped rather than refused: the customer is told
    -- why while quoting, and a stale code must not block the booking.
    new.coupon_id       := null;
    new.coupon_code     := null;
    new.discount_amount := 0;
  end if;

  new.total      := round(new.rental_total - new.discount_amount, 2);
  new.vat_amount := round(new.total - (new.total / (1 + new.vat_rate)), 2);

  -- The branch must be the car's own; otherwise a booking could be filed
  -- against a branch that never sees the car.
  select branch_id into new.branch_id from public.cars where id = new.car_id;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_pricing on public.bookings;
create trigger bookings_enforce_pricing
  before insert on public.bookings
  for each row execute function public.enforce_booking_pricing();

-- Add-on lines were equally client-supplied: name, unit price and total all
-- came from the request. They are re-read from the car's own configured
-- price instead.
create or replace function public.enforce_booking_addon_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_car uuid;
  v_days integer;
  v_price numeric;
  v_name text;
  v_kind addon_pricing;
begin
  select car_id, days into v_car, v_days from public.bookings where id = new.booking_id;

  select ca.price, a.name, a.pricing_type
    into v_price, v_name, v_kind
    from public.car_addons ca
    join public.addons a on a.id = ca.addon_id
   where ca.car_id = v_car
     and ca.addon_id = new.addon_id
     and ca.is_available
     and a.is_active;

  if not found then
    raise exception 'addon_not_available_for_car';
  end if;

  new.name         := v_name;
  new.pricing_type := v_kind;
  new.unit_price   := v_price;
  new.total        := case when v_kind = 'per_day'
                           then round(v_price * v_days, 2)
                           else round(v_price, 2) end;
  return new;
end;
$$;

drop trigger if exists booking_addons_enforce_pricing on public.booking_addons;
create trigger booking_addons_enforce_pricing
  before insert or update on public.booking_addons
  for each row execute function public.enforce_booking_addon_pricing();

-- Keeps the booking's totals in step with whatever add-on lines it actually
-- has, and re-applies the coupon to the new subtotal.
create or replace function public.recalc_booking_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking uuid := coalesce(new.booking_id, old.booking_id);
  v_addons numeric;
  v_subtotal numeric;
  v_discount numeric;
  b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = v_booking;
  if not found then return null; end if;

  select coalesce(sum(total), 0) into v_addons
    from public.booking_addons where booking_id = v_booking;

  v_subtotal := round(b.rental_total + v_addons, 2);
  v_discount := case when b.coupon_id is null then 0
                     else public.coupon_discount_for(b.coupon_id, v_subtotal) end;

  update public.bookings
     set addons_total    = v_addons,
         discount_amount = v_discount,
         total           = round(v_subtotal - v_discount, 2),
         vat_amount      = round((v_subtotal - v_discount)
                                 - ((v_subtotal - v_discount) / (1 + b.vat_rate)), 2)
   where id = v_booking;

  return null;
end;
$$;

drop trigger if exists booking_addons_recalc_totals on public.booking_addons;
create trigger booking_addons_recalc_totals
  after insert or update or delete on public.booking_addons
  for each row execute function public.recalc_booking_totals();

revoke all on function public.coupon_discount_for(uuid, numeric) from public;
