create type discount_type as enum ('percent', 'fixed');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  -- Stored uppercase and compared uppercase: a customer typing "welcome"
  -- and a poster printing "WELCOME" must be the same coupon.
  code text not null unique,
  description text,

  discount_type discount_type not null,
  discount_value numeric(10, 2) not null,
  -- Caps a percent coupon so "20% off" cannot become an unbounded discount
  -- on a long luxury rental.
  max_discount numeric(10, 2),
  min_total numeric(10, 2),

  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer,
  max_per_customer integer not null default 1,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint coupons_code_format check (code = upper(code) and length(code) between 3 and 32),
  constraint coupons_value_positive check (discount_value > 0),
  constraint coupons_percent_sane check (discount_type <> 'percent' or discount_value <= 100),
  constraint coupons_window_ordered check (ends_at is null or starts_at is null or ends_at > starts_at),
  constraint coupons_max_redemptions_positive check (max_redemptions is null or max_redemptions > 0),
  constraint coupons_max_per_customer_positive check (max_per_customer > 0)
);

create trigger touch_coupons before update on public.coupons
  for each row execute function public.touch_updated_at();

-- The coupon is frozen onto the booking the same way the price is: the code
-- and the amount are what the customer agreed to, and editing the coupon
-- later must not rewrite a booking that already used it.
alter table public.bookings
  add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric(10, 2) not null default 0;

alter table public.bookings
  add constraint bookings_discount_non_negative check (discount_amount >= 0);

create index if not exists bookings_coupon_id_idx on public.bookings (coupon_id)
  where coupon_id is not null;

alter table public.coupons enable row level security;

-- Deliberately NOT world-readable: publishing the coupon table would let
-- anyone enumerate every active code. Customers reach coupons only by
-- submitting a code to validate_coupon(), which reveals nothing else.
create policy coupons_all_admin on public.coupons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Counted from bookings rather than kept as a counter column, so a
-- cancelled booking releases its redemption and the number cannot drift.
create or replace function public.coupon_redemptions(p_coupon_id uuid, p_customer_id uuid default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.bookings b
   where b.coupon_id = p_coupon_id
     and b.status not in ('cancelled', 'rejected', 'expired')
     and (p_customer_id is null or b.customer_id = p_customer_id);
$$;

-- Returns a verdict rather than raising, so the booking screen can show a
-- specific reason ("expired", "minimum not met") instead of a generic error.
create or replace function public.validate_coupon(
  p_code text,
  p_total numeric,
  p_customer_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_customer uuid := coalesce(p_customer_id, auth.uid());
  v_discount numeric;
begin
  select * into c from public.coupons where code = upper(btrim(p_code));

  if not found or not c.is_active then
    return jsonb_build_object('valid', false, 'reason', 'not_found',
                              'message', 'رمز الخصم غير صحيح.');
  end if;

  if c.starts_at is not null and now() < c.starts_at then
    return jsonb_build_object('valid', false, 'reason', 'not_started',
                              'message', 'رمز الخصم لم يبدأ بعد.');
  end if;

  if c.ends_at is not null and now() >= c.ends_at then
    return jsonb_build_object('valid', false, 'reason', 'expired',
                              'message', 'انتهت صلاحية رمز الخصم.');
  end if;

  if c.min_total is not null and p_total < c.min_total then
    return jsonb_build_object('valid', false, 'reason', 'below_min',
                              'message', format('الحد الأدنى لاستخدام الرمز %s ر.س.', trim(to_char(c.min_total, 'FM999999.00'))));
  end if;

  if c.max_redemptions is not null
     and public.coupon_redemptions(c.id) >= c.max_redemptions then
    return jsonb_build_object('valid', false, 'reason', 'exhausted',
                              'message', 'انتهت الكمية المتاحة لهذا الرمز.');
  end if;

  if v_customer is not null
     and public.coupon_redemptions(c.id, v_customer) >= c.max_per_customer then
    return jsonb_build_object('valid', false, 'reason', 'already_used',
                              'message', 'سبق أن استخدمت هذا الرمز.');
  end if;

  if c.discount_type = 'percent' then
    v_discount := round(p_total * c.discount_value / 100.0, 2);
    if c.max_discount is not null then
      v_discount := least(v_discount, c.max_discount);
    end if;
  else
    v_discount := c.discount_value;
  end if;

  -- Never discount below zero: a fixed coupon larger than the booking is
  -- capped, not turned into a refund.
  v_discount := least(v_discount, p_total);

  return jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'description', c.description,
    'discount_type', c.discount_type,
    'discount_amount', v_discount
  );
end;
$$;

revoke all on function public.coupon_redemptions(uuid, uuid) from public;
revoke all on function public.validate_coupon(text, numeric, uuid) from public;
grant execute on function public.validate_coupon(text, numeric, uuid) to authenticated;
