create type banner_target as enum ('none', 'car', 'branch', 'category', 'coupon', 'url');

create table public.promo_banners (
  id uuid primary key default gen_random_uuid(),

  title text,
  subtitle text,
  image_url text not null,

  -- What tapping the banner does. The target id is validated against the
  -- kind by a trigger rather than by five nullable foreign keys.
  target_kind banner_target not null default 'none',
  target_car_id uuid references public.cars(id) on delete cascade,
  target_branch_id uuid references public.branches(id) on delete cascade,
  target_category car_category,
  target_coupon_code text,
  target_url text,

  -- A banner with no window is simply always on; the scheduling exists so a
  -- seasonal campaign can be loaded in advance and expire on its own.
  starts_at timestamptz,
  ends_at timestamptz,

  sort_order integer not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint promo_banners_window_ordered check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create trigger touch_promo_banners before update on public.promo_banners
  for each row execute function public.touch_updated_at();

-- A banner pointing at nothing is a dead tap for the customer, so the
-- target has to match its kind at write time.
create or replace function public.check_banner_target()
returns trigger
language plpgsql
as $$
begin
  if new.target_kind = 'car' and new.target_car_id is null then
    raise exception 'banner_target_car_required';
  elsif new.target_kind = 'branch' and new.target_branch_id is null then
    raise exception 'banner_target_branch_required';
  elsif new.target_kind = 'category' and new.target_category is null then
    raise exception 'banner_target_category_required';
  elsif new.target_kind = 'coupon' and nullif(btrim(coalesce(new.target_coupon_code, '')), '') is null then
    raise exception 'banner_target_coupon_required';
  elsif new.target_kind = 'url' and nullif(btrim(coalesce(new.target_url, '')), '') is null then
    raise exception 'banner_target_url_required';
  end if;

  -- Only http(s) links leave the app. Anything else (javascript:, intent:,
  -- a file scheme) would be handed straight to the OS opener.
  if new.target_kind = 'url' and new.target_url !~* '^https://' then
    raise exception 'banner_target_url_must_be_https';
  end if;

  -- Clear whatever does not belong to the chosen kind so a later edit
  -- cannot leave a stale id behind that the app might follow.
  if new.target_kind <> 'car' then new.target_car_id := null; end if;
  if new.target_kind <> 'branch' then new.target_branch_id := null; end if;
  if new.target_kind <> 'category' then new.target_category := null; end if;
  if new.target_kind <> 'coupon' then new.target_coupon_code := null; end if;
  if new.target_kind <> 'url' then new.target_url := null; end if;

  return new;
end;
$$;

create trigger check_banner_target
  before insert or update on public.promo_banners
  for each row execute function public.check_banner_target();

alter table public.promo_banners enable row level security;

-- Customers see only what is live right now; the operator sees everything,
-- including drafts and expired campaigns.
create policy promo_banners_select_live on public.promo_banners
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      is_active
      and (starts_at is null or now() >= starts_at)
      and (ends_at is null or now() < ends_at)
    )
  );

create policy promo_banners_all_admin on public.promo_banners
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index promo_banners_live_idx
  on public.promo_banners (sort_order, created_at)
  where is_active;
