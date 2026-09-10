-- Spending the wallet on a booking.
--
-- The amount is decided here, never by the client — same reason the rental
-- price and the coupon discount are decided here. A client-supplied
-- wallet_amount would be a way to pay for a car with money you do not have.
--
-- Accounting note: wallet credit is treated as a DISCOUNT, reducing the
-- taxable consideration, exactly as a coupon does. The alternative reading —
-- credit as a means of payment, leaving VAT on the full price — is a
-- different tax position; this one matches how coupons already behave here.

alter table public.bookings
  add column wallet_requested boolean not null default false,
  add column wallet_amount numeric(10, 2) not null default 0,
  add constraint bookings_wallet_amount_non_negative check (wallet_amount >= 0);

-- What this customer can still spend, ignoring what this same booking has
-- already reserved. Without that exclusion, re-pricing a booking would read
-- its own held credit as "already spent" and shrink the redemption on every
-- add-on change.
create or replace function public.wallet_available_for_booking(
  p_user uuid,
  p_booking uuid
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select sum(amount) from public.wallet_transactions
                    where user_id = p_user), 0)
       - coalesce((select sum(amount) from public.wallet_transactions
                    where user_id = p_user
                      and booking_id = p_booking
                      and kind = 'booking_redeem'), 0);
$$;

-- How much of `p_payable` this booking may actually take from the wallet,
-- after the operator's floor and ceiling.
create or replace function public.wallet_redeemable(
  p_user uuid,
  p_booking uuid,
  p_payable numeric,
  p_requested boolean
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.wallet_settings%rowtype;
  v_available numeric;
  v_ceiling numeric;
begin
  if not p_requested or p_user is null or p_payable is null or p_payable <= 0 then
    return 0;
  end if;

  select * into s from public.wallet_settings where id;
  if p_payable < s.min_booking_total_to_redeem then
    return 0;
  end if;

  v_available := public.wallet_available_for_booking(p_user, p_booking);
  if v_available <= 0 then
    return 0;
  end if;

  v_ceiling := round(p_payable * s.max_redeem_percent / 100.0, 2);
  return round(greatest(least(v_available, v_ceiling, p_payable), 0), 2);
end;
$$;

-- Keeps the ledger in step with what the booking says it is taking. The
-- redemption row is adjusted in place while the booking is still being
-- priced, because add-ons move the total after the booking row exists.
create or replace function public.sync_booking_wallet_redemption(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then return; end if;

  if b.wallet_amount > 0 then
    insert into public.wallet_transactions (user_id, kind, amount, booking_id, note)
    values (b.customer_id, 'booking_redeem', -b.wallet_amount, b.id,
            'خصم من الرصيد على الحجز ' || b.reference)
    on conflict (booking_id) where kind = 'booking_redeem'
    do update set amount = excluded.amount;
  else
    delete from public.wallet_transactions
     where booking_id = p_booking and kind = 'booking_redeem';
  end if;
end;
$$;

-- ------------------------------------------------- pricing, with wallet ----
-- NOTE: enforce_booking_pricing() and recalc_booking_totals() are superseded
-- by 0041, which adds the delivery fee to the same calculation. The versions
-- here are the wallet-only step, kept so the history reads in order.
create or replace function public.enforce_booking_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q jsonb;
  v_coupon jsonb;
  v_payable numeric;
begin
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
    new.coupon_id       := null;
    new.coupon_code     := null;
    new.discount_amount := 0;
  end if;

  -- The wallet applies to what is left after the coupon, so the two stack
  -- in the order the customer sees them rather than competing.
  v_payable := round(new.rental_total - new.discount_amount, 2);
  new.wallet_amount := public.wallet_redeemable(
    new.customer_id, new.id, v_payable, new.wallet_requested);

  new.total      := round(v_payable - new.wallet_amount, 2);
  new.vat_amount := round(new.total - (new.total / (1 + new.vat_rate)), 2);

  select branch_id into new.branch_id from public.cars where id = new.car_id;

  return new;
end;
$$;

-- The ledger row can only be written once the booking row exists to point at.
create or replace function public.book_wallet_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.wallet_amount > 0 then
    perform public.sync_booking_wallet_redemption(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists bookings_wallet_after_insert on public.bookings;
create trigger bookings_wallet_after_insert
  after insert on public.bookings
  for each row execute function public.book_wallet_after_insert();

-- Add-ons change the subtotal, so both the coupon and the wallet have to be
-- recomputed against the new figure — and the ledger re-synced to match.
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
  v_payable numeric;
  v_wallet numeric;
  b public.bookings%rowtype;
begin
  select * into b from public.bookings where id = v_booking;
  if not found then return null; end if;

  select coalesce(sum(total), 0) into v_addons
    from public.booking_addons where booking_id = v_booking;

  v_subtotal := round(b.rental_total + v_addons, 2);
  v_discount := case when b.coupon_id is null then 0
                     else public.coupon_discount_for(b.coupon_id, v_subtotal) end;
  v_payable  := round(v_subtotal - v_discount, 2);
  v_wallet   := public.wallet_redeemable(
                  b.customer_id, b.id, v_payable, b.wallet_requested);

  update public.bookings
     set addons_total    = v_addons,
         discount_amount = v_discount,
         wallet_amount   = v_wallet,
         total           = round(v_payable - v_wallet, 2),
         vat_amount      = round((v_payable - v_wallet)
                                 - ((v_payable - v_wallet) / (1 + b.vat_rate)), 2)
   where id = v_booking;

  perform public.sync_booking_wallet_redemption(v_booking);
  return null;
end;
$$;

-- ------------------------------------------------- returning the credit ----
-- A cancelled booking gives back what it took. Guarded against firing twice:
-- the refund is keyed to the redemption it reverses.
create or replace function public.refund_booking_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status not in ('cancelled', 'rejected', 'expired')
     or old.status = new.status
     or coalesce(new.wallet_amount, 0) <= 0 then
    return null;
  end if;

  if exists (select 1 from public.wallet_transactions
              where booking_id = new.id and kind = 'booking_refund') then
    return null;
  end if;

  insert into public.wallet_transactions (user_id, kind, amount, booking_id, note)
  values (new.customer_id, 'booking_refund', new.wallet_amount, new.id,
          'إعادة رصيد الحجز الملغى ' || new.reference);

  return null;
end;
$$;

drop trigger if exists bookings_refund_wallet on public.bookings;
create trigger bookings_refund_wallet
  after update of status on public.bookings
  for each row execute function public.refund_booking_wallet();

revoke all on function public.wallet_available_for_booking(uuid, uuid) from public;
revoke all on function public.wallet_redeemable(uuid, uuid, numeric, boolean) from public;
revoke all on function public.sync_booking_wallet_redemption(uuid) from public;
