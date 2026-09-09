-- Miyar Rental — functions and triggers

-- ------------------------------------------------------------ identity ----
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_blocked(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_blocked from public.profiles where id = uid), false);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A customer must never be able to promote themselves, and a blocked user
-- must not be able to clear their own flag.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  new.role := old.role;
  new.is_blocked := old.is_blocked;
  return new;
end;
$$;

create trigger guard_profile_privileges_trg
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- --------------------------------------------------------------- audit ----
create or replace function public.log_audit(
  p_action text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

-- ------------------------------------------------------ updated_at glue ----
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger branches_touch before update on public.branches
  for each row execute function public.touch_updated_at();
create trigger cars_touch before update on public.cars
  for each row execute function public.touch_updated_at();
create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------- car defaults ----
-- A new car inherits its branch's confirmation mode unless the operator
-- explicitly chose one.
create or replace function public.set_car_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.confirmation_mode is null then
    select default_confirmation_mode into new.confirmation_mode
    from public.branches where id = new.branch_id;
  end if;
  if new.cover_image is null and array_length(new.images, 1) > 0 then
    new.cover_image := new.images[1];
  end if;
  return new;
end;
$$;

create trigger cars_set_defaults before insert on public.cars
  for each row execute function public.set_car_defaults();

-- ------------------------------------------------------------- pricing ----
-- Single source of truth for what a rental costs. The app calls this so the
-- quote a customer sees and the amount charged can never drift apart.
--
-- Prices are stored VAT-inclusive, so VAT is extracted from the total
-- rather than added on top: net = total / (1 + rate).
create or replace function public.quote_booking(
  p_car_id uuid,
  p_start_date date,
  p_end_date date,
  p_addon_ids uuid[] default '{}'
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

  -- Whole period is billed at the tier the duration reaches. Simpler to
  -- explain to a customer than splitting a stay across several rates.
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

  v_total := round(v_rental + v_addons, 2);
  v_vat := round(v_total - (v_total / (1 + v_vat_rate)), 2);

  return jsonb_build_object(
    'car_id', p_car_id,
    'days', v_days,
    'rate_tier', v_tier,
    'daily_rate', v_rate,
    'rental_total', v_rental,
    'addons_total', v_addons,
    'addons', v_addon_lines,
    'vat_rate', v_vat_rate,
    'vat_amount', v_vat,
    'total', v_total
  );
end;
$$;

-- ---------------------------------------------------------- availability ----
-- The EXCLUDE constraint stops booking-vs-booking overlap. These triggers
-- close the other two directions the constraint cannot see: a booking
-- landing on a maintenance block, and a block landing on a live booking.
create or replace function public.check_booking_not_blocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active') then
    if exists (
      select 1 from public.car_blocks b
      where b.car_id = new.car_id
        and daterange(b.start_date, b.end_date, '[)')
            && daterange(new.start_date, new.end_date, '[)')
    ) then
      raise exception 'car_unavailable_maintenance';
    end if;
  end if;
  return new;
end;
$$;

create trigger bookings_check_blocks
  before insert or update on public.bookings
  for each row execute function public.check_booking_not_blocked();

create or replace function public.check_block_not_booked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.bookings bk
    where bk.car_id = new.car_id
      and bk.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
      and daterange(bk.start_date, bk.end_date, '[)')
          && daterange(new.start_date, new.end_date, '[)')
  ) then
    raise exception 'car_has_bookings_in_range';
  end if;
  return new;
end;
$$;

create trigger car_blocks_check_bookings
  before insert or update on public.car_blocks
  for each row execute function public.check_block_not_booked();

-- Dates a car cannot be picked up on, for the mobile calendar.
create or replace function public.car_unavailable_ranges(p_car_id uuid)
returns table (start_date date, end_date date)
language sql
stable
security definer
set search_path = public
as $$
  select b.start_date, b.end_date
  from public.bookings b
  where b.car_id = p_car_id
    and b.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
    and b.end_date >= current_date
  union all
  select c.start_date, c.end_date
  from public.car_blocks c
  where c.car_id = p_car_id
    and c.end_date >= current_date;
$$;

-- ------------------------------------------------------------ reference ----
-- Short, human-speakable code branch staff can search by over the phone.
-- Ambiguous characters (0/O, 1/I) are left out on purpose.
create or replace function public.generate_booking_reference()
returns text
language plpgsql
volatile
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_ref text;
  v_attempt integer := 0;
begin
  loop
    v_ref := 'MR-';
    for i in 1..6 loop
      v_ref := v_ref || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.bookings where reference = v_ref);
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'could_not_generate_reference';
    end if;
  end loop;
  return v_ref;
end;
$$;

create or replace function public.set_booking_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.generate_booking_reference();
  end if;
  return new;
end;
$$;

create trigger bookings_set_reference before insert on public.bookings
  for each row execute function public.set_booking_reference();

-- ---------------------------------------------------------- expiry sweep ----
-- An abandoned checkout must not hold a car hostage. Called on a schedule.
create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_minutes integer;
  v_count integer;
begin
  select coalesce((value ->> 0)::integer, 30) into v_minutes
    from public.app_settings where key = 'payment_window_minutes';
  v_minutes := coalesce(v_minutes, 30);

  update public.bookings
  set status = 'expired'
  where status = 'pending_payment'
    and payment_status = 'unpaid'
    and created_at < now() - make_interval(mins => v_minutes);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
