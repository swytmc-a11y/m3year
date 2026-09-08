-- Miyar Rental — core schema
--
-- Model note: this is a single-operator fleet, not a marketplace. Every
-- branch, car and price is created by the operator from the control panel;
-- customers only browse and book. That single fact removes the entire
-- trust/verification apparatus a marketplace needs, and lets RLS collapse
-- to "everyone reads published rows, only admins write".

create extension if not exists btree_gist;

-- ---------------------------------------------------------------- enums ----
create type user_role as enum ('customer', 'admin');
create type car_category as enum ('economy', 'family', 'luxury', 'suv', 'commercial');
create type transmission_type as enum ('automatic', 'manual');
create type fuel_type as enum ('petrol', 'diesel', 'hybrid', 'electric');
create type car_status as enum ('draft', 'available', 'maintenance', 'hidden');
create type confirmation_mode as enum ('instant', 'manual');
create type addon_pricing as enum ('per_day', 'one_time');
create type payment_status as enum ('unpaid', 'paid', 'refunded', 'partially_refunded', 'failed');

-- Lifecycle: pending_payment -> (pending_confirmation ->) confirmed -> active
--            -> completed, with cancelled/rejected/expired as exits.
create type booking_status as enum (
  'pending_payment',
  'pending_confirmation',
  'confirmed',
  'active',
  'completed',
  'cancelled',
  'rejected',
  'expired'
);

-- ------------------------------------------------------------- profiles ----
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  city text,
  role user_role not null default 'customer',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where role = 'admin';

-- ------------------------------------------------------------- branches ----
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  address text,
  -- Needed by the "الأقرب لي" sort; nullable so a branch can exist before
  -- someone pins it on the map.
  latitude double precision,
  longitude double precision,
  phone text,
  whatsapp text,
  working_hours text,
  -- Free text, shown to the customer as a heads-up. The deposit is never
  -- collected in-app; it is settled at the branch on pickup.
  deposit_note text,
  default_confirmation_mode confirmation_mode not null default 'manual',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint branches_longitude_range check (longitude is null or longitude between -180 and 180)
);

create index branches_active_idx on public.branches (is_active, sort_order);

-- ----------------------------------------------------------------- cars ----
create table public.cars (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete restrict,

  make text not null,
  model text not null,
  year integer not null,
  category car_category not null,
  transmission transmission_type not null,
  fuel fuel_type not null,
  seats integer not null,
  doors integer,
  color text,

  -- Prices are stored VAT-INCLUSIVE (Saudi consumer price display rules).
  -- weekly/monthly are per-day rates for their tier, not period totals.
  daily_price numeric(10, 2) not null,
  weekly_price numeric(10, 2),
  monthly_price numeric(10, 2),

  daily_km_limit integer,
  extra_km_fee numeric(10, 2),

  images text[] not null default '{}',
  cover_image text,
  features text[] not null default '{}',
  description text,

  status car_status not null default 'draft',
  -- Defaults from the branch at insert time (see set_car_defaults), but can
  -- be overridden per car: a cheap economy car may auto-confirm while a
  -- luxury one always needs a human look.
  confirmation_mode confirmation_mode not null default 'manual',
  min_rental_days integer not null default 1,
  max_rental_days integer,
  sort_order integer not null default 0,
  view_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cars_year_sane check (year between 1990 and 2100),
  constraint cars_seats_positive check (seats > 0),
  constraint cars_daily_price_positive check (daily_price > 0),
  constraint cars_weekly_price_positive check (weekly_price is null or weekly_price > 0),
  constraint cars_monthly_price_positive check (monthly_price is null or monthly_price > 0),
  constraint cars_min_rental_days_positive check (min_rental_days >= 1),
  constraint cars_max_rental_days_sane check (max_rental_days is null or max_rental_days >= min_rental_days)
);

create index cars_branch_idx on public.cars (branch_id);
create index cars_browse_idx on public.cars (status, category, daily_price);
create index cars_status_idx on public.cars (status) where status = 'available';

-- Plate/VIN/insurance are operator-internal: never exposed to customers, so
-- they live in their own table rather than behind hopeful column filtering.
create table public.car_private (
  car_id uuid primary key references public.cars(id) on delete cascade,
  plate_number text,
  vin text,
  registration_expiry date,
  insurance_expiry date,
  insurance_policy_no text,
  purchase_date date,
  odometer_km integer,
  notes text,
  updated_at timestamptz not null default now()
);

-- --------------------------------------------------------------- addons ----
create table public.addons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  pricing_type addon_pricing not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Priced per car: insuring a luxury car is not the same as insuring an
-- economy one, so a single global price would be wrong for one of them.
create table public.car_addons (
  car_id uuid not null references public.cars(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete cascade,
  price numeric(10, 2) not null,
  is_available boolean not null default true,
  primary key (car_id, addon_id),
  constraint car_addons_price_positive check (price >= 0)
);

-- ------------------------------------------------------------- bookings ----
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  car_id uuid not null references public.cars(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,

  -- end_date is the return day and is EXCLUSIVE: Jan 1 -> Jan 3 is two
  -- rental days, and another customer may collect the same car on Jan 3.
  start_date date not null,
  end_date date not null,
  pickup_time time not null default '10:00',
  return_time time not null default '10:00',
  days integer not null,

  -- Pricing is frozen at booking time. Recomputing from cars.* later would
  -- silently rewrite the price a customer already agreed to and paid.
  rate_tier text not null,
  daily_rate numeric(10, 2) not null,
  rental_total numeric(10, 2) not null,
  addons_total numeric(10, 2) not null default 0,
  vat_rate numeric(5, 4) not null,
  vat_amount numeric(10, 2) not null,
  total numeric(10, 2) not null,

  status booking_status not null default 'pending_payment',
  payment_status payment_status not null default 'unpaid',
  payment_ref text,
  paid_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  refund_amount numeric(10, 2),
  refunded_at timestamptz,

  customer_note text,
  admin_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_dates_ordered check (end_date > start_date),
  constraint bookings_days_positive check (days > 0),
  constraint bookings_rate_tier_valid check (rate_tier in ('daily', 'weekly', 'monthly')),
  constraint bookings_totals_non_negative check (
    rental_total >= 0 and addons_total >= 0 and vat_amount >= 0 and total >= 0
  )
);

-- The whole point of the booking system. Two concurrent requests for the
-- same car and overlapping dates cannot BOTH succeed: this is enforced by
-- the database, not by an application-level "is it free?" check that two
-- transactions can pass simultaneously.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    car_id with =,
    daterange(start_date, end_date, '[)') with &&
  )
  where (status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active'));

create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index bookings_branch_status_idx on public.bookings (branch_id, status);
create index bookings_car_idx on public.bookings (car_id);
create index bookings_pickup_idx on public.bookings (start_date) where status in ('confirmed', 'active');

create table public.booking_addons (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete restrict,
  -- Snapshotted alongside the booking, for the same reason.
  name text not null,
  pricing_type addon_pricing not null,
  unit_price numeric(10, 2) not null,
  total numeric(10, 2) not null,
  primary key (booking_id, addon_id)
);

-- Operator-side unavailability: maintenance, inspection, a car pulled from
-- the fleet for a while.
create table public.car_blocks (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint car_blocks_dates_ordered check (end_date > start_date),
  constraint car_blocks_no_overlap exclude using gist (
    car_id with =,
    daterange(start_date, end_date, '[)') with &&
  )
);

create index car_blocks_car_idx on public.car_blocks (car_id, start_date);

-- --------------------------------------------------- supporting tables ----
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, car_id)
);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}',
  notify boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index saved_searches_user_idx on public.saved_searches (user_id);

-- One review per completed booking, so a rating always traces back to a
-- real rental rather than an opinion from someone who never took the car.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5)
);

create index reviews_car_idx on public.reviews (car_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  booking_updates boolean not null default true,
  reminders boolean not null default true,
  offers boolean not null default true,
  saved_search_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text,
  created_at timestamptz not null default now()
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- Settings the operator can change without shipping an app update: VAT
-- rate, tier thresholds, cancellation policy, confirmation SLA.
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  platform text,
  app_version text,
  message text not null,
  stack text,
  context text,
  created_at timestamptz not null default now()
);

create index client_errors_created_idx on public.client_errors (created_at desc);

create table public.audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

-- Step-up auth for the control panel (email OTP on top of role + allowlist).
create table public.admin_otp_verifications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.rate_limits (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);

create index rate_limits_lookup_idx on public.rate_limits (user_id, action, created_at desc);
