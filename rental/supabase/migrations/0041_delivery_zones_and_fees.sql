-- Delivery and collection.
--
-- Until now a rental could only start and end at the branch counter. A zone
-- carries a fee, and each leg the customer asks for — deliver the car to me,
-- collect it from me — charges that fee once.

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  -- Null means the zone is offered by every branch; a branch id restricts it
  -- to that branch's cars.
  branch_id uuid references public.branches(id) on delete cascade,
  name text not null,
  city text not null,
  fee numeric(10, 2) not null,
  note text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint delivery_zones_fee_non_negative check (fee >= 0)
);

create index delivery_zones_active_idx
  on public.delivery_zones (is_active, city, sort_order);

alter table public.delivery_zones enable row level security;

create policy delivery_zones_read on public.delivery_zones
  for select using (is_active or public.is_admin());

create policy delivery_zones_admin_write on public.delivery_zones
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.bookings
  add column delivery_mode text not null default 'branch',
  add column return_mode text not null default 'branch',
  add column delivery_zone_id uuid references public.delivery_zones(id) on delete restrict,
  add column delivery_address text,
  add column delivery_latitude double precision,
  add column delivery_longitude double precision,
  add column delivery_fee numeric(10, 2) not null default 0,
  add constraint bookings_delivery_mode_valid check (delivery_mode in ('branch', 'delivery')),
  add constraint bookings_return_mode_valid check (return_mode in ('branch', 'pickup')),
  add constraint bookings_delivery_fee_non_negative check (delivery_fee >= 0),
  -- A delivery with nowhere to deliver to is an operational dead end: the
  -- branch gets a job it cannot carry out.
  add constraint bookings_delivery_needs_address check (
    (delivery_mode = 'branch' and return_mode = 'branch')
    or (delivery_zone_id is not null
        and nullif(btrim(coalesce(delivery_address, '')), '') is not null)
  );

-- The fee the operator charges for the legs this booking actually asked for.
create or replace function public.delivery_fee_for(
  p_zone uuid,
  p_car uuid,
  p_delivery_mode text,
  p_return_mode text
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  z public.delivery_zones%rowtype;
  v_branch uuid;
  v_legs integer := 0;
begin
  if p_delivery_mode = 'delivery' then v_legs := v_legs + 1; end if;
  if p_return_mode = 'pickup' then v_legs := v_legs + 1; end if;
  if v_legs = 0 then return 0; end if;

  if p_zone is null then
    raise exception 'delivery_zone_required';
  end if;

  select * into z from public.delivery_zones where id = p_zone and is_active;
  if not found then
    raise exception 'delivery_zone_unavailable';
  end if;

  -- A zone tied to another branch cannot serve this car, or the branch that
  -- owns the car would be committed to a drive it never agreed to.
  select branch_id into v_branch from public.cars where id = p_car;
  if z.branch_id is not null and z.branch_id <> v_branch then
    raise exception 'delivery_zone_wrong_branch';
  end if;

  return round(z.fee * v_legs, 2);
end;
$$;

-- ------------------------------------------ pricing, with delivery added ---
-- Order matters and is deliberate: the coupon discounts the rental and its
-- add-ons, the delivery fee is then added at full price (it is a real cost,
-- not something a percentage-off campaign should erode), and the wallet
-- applies last to whatever is left to pay.
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

  new.delivery_fee := public.delivery_fee_for(
    new.delivery_zone_id, new.car_id, new.delivery_mode, new.return_mode);

  v_payable := round(new.rental_total - new.discount_amount + new.delivery_fee, 2);
  new.wallet_amount := public.wallet_redeemable(
    new.customer_id, new.id, v_payable, new.wallet_requested);

  new.total      := round(v_payable - new.wallet_amount, 2);
  new.vat_amount := round(new.total - (new.total / (1 + new.vat_rate)), 2);

  select branch_id into new.branch_id from public.cars where id = new.car_id;

  return new;
end;
$$;

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
  v_payable  := round(v_subtotal - v_discount + b.delivery_fee, 2);
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

-- The invoice must show the delivery it charged for.
alter table public.invoices
  add column delivery_fee numeric(10, 2) not null default 0;

create or replace function public.issue_invoice_for_booking(p_booking uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  o public.org_settings%rowtype;
  p public.profiles%rowtype;
  v_id uuid;
  v_number text;
  v_issued timestamptz := now();
  v_lines jsonb;
begin
  select * into b from public.bookings where id = p_booking;
  if not found then raise exception 'booking_not_found'; end if;

  select id into v_id from public.invoices
   where booking_id = p_booking and extension_id is null;
  if found then return v_id; end if;

  select * into o from public.org_settings where id;
  select * into p from public.profiles where id = b.customer_id;

  v_number := 'SMO-' || to_char(v_issued, 'YYYY') || '-'
              || lpad(nextval('public.invoice_number_seq')::text, 6, '0');

  select jsonb_agg(jsonb_build_object('name', name, 'total', total) order by name)
    into v_lines
    from public.booking_addons where booking_id = p_booking;

  v_lines := coalesce(v_lines, '[]'::jsonb);
  if b.delivery_fee > 0 then
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('name', 'التوصيل والاستلام', 'total', b.delivery_fee));
  end if;

  insert into public.invoices (
    booking_id, number, issued_at,
    seller_name, seller_vat_number, seller_cr_number, seller_address,
    buyer_name, buyer_phone,
    rental_total, addons_total, discount_amount, wallet_amount, delivery_fee,
    vat_rate, vat_amount, total, lines, qr_base64
  ) values (
    b.id, v_number, v_issued,
    o.seller_name, o.vat_number, o.cr_number,
    btrim(concat_ws('، ', nullif(o.address, ''), nullif(o.city, ''))),
    p.full_name, p.phone,
    b.rental_total, b.addons_total, b.discount_amount, b.wallet_amount, b.delivery_fee,
    b.vat_rate, b.vat_amount, b.total, v_lines,
    public.zatca_qr(o.seller_name, o.vat_number, v_issued, b.total, b.vat_amount)
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.delivery_fee_for(uuid, uuid, text, text) from public;
