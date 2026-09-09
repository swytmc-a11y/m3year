-- Adds an optional coupon to the single source of truth for pricing. Doing
-- the discount anywhere else would let the client's idea of the total and
-- the server's diverge. Prices are VAT-inclusive, so the discount comes off
-- the gross total and VAT is re-extracted from what is actually charged.
create or replace function public.quote_booking(
  p_car_id uuid,
  p_start_date date,
  p_end_date date,
  p_addon_ids uuid[] default '{}',
  p_coupon_code text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_car public.cars%rowtype;
  v_days integer;
  v_weekly_threshold integer;
  v_monthly_threshold integer;
  v_vat_rate numeric;
  v_tier text;
  v_rate numeric;
  v_rental numeric;
  v_addons numeric := 0;
  v_addon_lines jsonb := '[]'::jsonb;
  v_subtotal numeric;
  v_discount numeric := 0;
  v_coupon jsonb := null;
  v_total numeric;
  v_vat numeric;
  r record;
begin
  select * into v_car from public.cars where id = p_car_id;
  if not found then
    raise exception 'car_not_found';
  end if;

  v_days := p_end_date - p_start_date;
  if v_days < 1 then
    raise exception 'invalid_date_range';
  end if;
  if v_days < v_car.min_rental_days then
    raise exception 'below_min_rental_days';
  end if;
  if v_car.max_rental_days is not null and v_days > v_car.max_rental_days then
    raise exception 'above_max_rental_days';
  end if;

  select coalesce((value ->> 0)::integer, 7) into v_weekly_threshold
    from public.app_settings where key = 'weekly_threshold_days';
  select coalesce((value ->> 0)::integer, 30) into v_monthly_threshold
    from public.app_settings where key = 'monthly_threshold_days';
  select coalesce((value ->> 0)::numeric, 0.15) into v_vat_rate
    from public.app_settings where key = 'vat_rate';

  v_weekly_threshold := coalesce(v_weekly_threshold, 7);
  v_monthly_threshold := coalesce(v_monthly_threshold, 30);
  v_vat_rate := coalesce(v_vat_rate, 0.15);

  if v_days >= v_monthly_threshold and v_car.monthly_price is not null then
    v_tier := 'monthly';
    v_rate := v_car.monthly_price;
  elsif v_days >= v_weekly_threshold and v_car.weekly_price is not null then
    v_tier := 'weekly';
    v_rate := v_car.weekly_price;
  else
    v_tier := 'daily';
    v_rate := v_car.daily_price;
  end if;

  v_rental := round(v_rate * v_days, 2);

  for r in
    select a.id, a.name, a.pricing_type, ca.price
    from public.car_addons ca
    join public.addons a on a.id = ca.addon_id
    where ca.car_id = p_car_id
      and ca.is_available
      and a.is_active
      and a.id = any(p_addon_ids)
  loop
    declare
      v_line numeric;
    begin
      v_line := case when r.pricing_type = 'per_day'
                     then round(r.price * v_days, 2)
                     else round(r.price, 2) end;
      v_addons := v_addons + v_line;
      v_addon_lines := v_addon_lines || jsonb_build_object(
        'addon_id', r.id,
        'name', r.name,
        'pricing_type', r.pricing_type,
        'unit_price', r.price,
        'total', v_line
      );
    end;
  end loop;

  v_subtotal := round(v_rental + v_addons, 2);

  if nullif(btrim(coalesce(p_coupon_code, '')), '') is not null then
    v_coupon := public.validate_coupon(p_coupon_code, v_subtotal, auth.uid());
    if (v_coupon ->> 'valid')::boolean then
      v_discount := (v_coupon ->> 'discount_amount')::numeric;
    else
      v_discount := 0;
    end if;
  end if;

  v_total := round(v_subtotal - v_discount, 2);
  v_vat := round(v_total - (v_total / (1 + v_vat_rate)), 2);

  return jsonb_build_object(
    'car_id', p_car_id,
    'days', v_days,
    'rate_tier', v_tier,
    'daily_rate', v_rate,
    'rental_total', v_rental,
    'addons_total', v_addons,
    'addons', v_addon_lines,
    'subtotal', v_subtotal,
    'coupon', v_coupon,
    'discount_amount', v_discount,
    'vat_rate', v_vat_rate,
    'vat_amount', v_vat,
    'total', v_total
  );
end;
$$;
