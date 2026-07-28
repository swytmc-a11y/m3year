-- Miyar (معيار) — paid promotion to the featured list.
--
-- Product decision: publishing stays free for everyone, forever. The only
-- thing money buys is a time-boxed slot at the top of the feed, priced the
-- same for a listing and a franchise. Nothing here gates creating, editing,
-- publishing, messaging, or verification.
--
-- Security model, which is the whole point of this file:
--   - Prices live in `promotion_plans`, never in the client. The Edge
--     Function reads the price from this table by plan code; a tampered
--     client can ask to buy plan 'X' but cannot say what 'X' costs.
--   - `promotion_orders` is writable only by service_role (the Edge
--     Functions). There is deliberately no INSERT/UPDATE policy for
--     authenticated users — otherwise anyone could insert a row with
--     status='paid' and promote themselves for free.
--   - `featured_until` / `is_featured` are protected columns. The existing
--     guard triggers already rejected owner writes to is_featured; this
--     migration extends that same protection to featured_until so the paid
--     window cannot be self-granted or self-extended either.
--
-- The feed keeps ordering by is_featured, so nothing about the read path
-- changes. The webhook sets is_featured=true plus a featured_until stamp,
-- and a scheduled job flips is_featured back off when the window lapses.

-- ---------------------------------------------------------------- plans ---
create table if not exists public.promotion_plans (
  code text primary key,
  name_ar text not null,
  description_ar text,
  duration_days smallint not null check (duration_days > 0),
  -- Halalas, not riyals: Moyasar bills in the smallest currency unit and
  -- integer money avoids the rounding drift that floats introduce.
  price_halalas integer not null check (price_halalas > 0),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotion_plans enable row level security;

-- Anyone may read the active plans — they are a price list, shown before
-- sign-in on the pricing screen.
drop policy if exists promotion_plans_select_active on public.promotion_plans;
create policy promotion_plans_select_active on public.promotion_plans
  for select to anon, authenticated
  using (is_active or is_admin());

-- Only admins may change pricing, and only through the panel.
drop policy if exists promotion_plans_write_admin on public.promotion_plans;
create policy promotion_plans_write_admin on public.promotion_plans
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Starting price list. These are placeholders chosen to be plausible, not
-- researched market rates — change them from the admin panel (or with a
-- plain UPDATE here) without redeploying anything.
insert into public.promotion_plans (code, name_ar, description_ar, duration_days, price_halalas, sort_order)
values
  ('featured_7',  'تمييز لمدة أسبوع',  'يظهر إعلانك في أعلى نتائج التصفح لمدة ٧ أيام.',  7,  19900, 1),
  ('featured_30', 'تمييز لمدة شهر',    'يظهر إعلانك في أعلى نتائج التصفح لمدة ٣٠ يومًا.', 30, 49900, 2)
on conflict (code) do nothing;

-- --------------------------------------------------------------- orders ---
create table if not exists public.promotion_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'franchise')),
  target_id uuid not null,
  plan_code text not null references public.promotion_plans (code),
  amount_halalas integer not null check (amount_halalas > 0),
  currency text not null default 'SAR',
  -- pending: invoice created, customer has not paid (or we have not heard).
  -- paid: provider confirmed; the promotion has been applied.
  -- failed / cancelled / refunded: terminal, no promotion applied.
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  provider text not null default 'moyasar',
  provider_invoice_id text,
  provider_payment_id text,
  -- What the promotion bought, stamped when payment is confirmed.
  featured_from timestamptz,
  featured_until timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists promotion_orders_user_idx
  on public.promotion_orders (user_id, created_at desc);
create index if not exists promotion_orders_target_idx
  on public.promotion_orders (target_type, target_id);
-- The webhook looks orders up by provider id; it must be fast and unique so
-- a replayed webhook cannot match two rows.
create unique index if not exists promotion_orders_provider_invoice_idx
  on public.promotion_orders (provider_invoice_id)
  where provider_invoice_id is not null;

alter table public.promotion_orders enable row level security;

-- Owners can watch their own orders (and admins can see everything) — but
-- note there is intentionally NO insert or update policy here. Every write
-- goes through an Edge Function using the service role, after that function
-- has verified ownership and, for paid transitions, verified the payment
-- with the provider directly.
drop policy if exists promotion_orders_select_own_or_admin on public.promotion_orders;
create policy promotion_orders_select_own_or_admin on public.promotion_orders
  for select to authenticated
  using (user_id = (select auth.uid()) or is_admin());

create or replace function public.set_promotion_orders_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists promotion_orders_set_updated_at on public.promotion_orders;
create trigger promotion_orders_set_updated_at
  before update on public.promotion_orders
  for each row execute function public.set_promotion_orders_updated_at();

drop trigger if exists promotion_plans_set_updated_at on public.promotion_plans;
create trigger promotion_plans_set_updated_at
  before update on public.promotion_plans
  for each row execute function public.set_promotion_orders_updated_at();

-- ------------------------------------------------- featured_until column ---
alter table public.listings   add column if not exists featured_until timestamptz;
alter table public.franchises add column if not exists featured_until timestamptz;

-- Finding promotions that have lapsed is the expiry job's only query.
create index if not exists listings_featured_until_idx
  on public.listings (featured_until)
  where featured_until is not null;
create index if not exists franchises_featured_until_idx
  on public.franchises (featured_until)
  where featured_until is not null;

-- ------------------------------------------------------ protect the grant ---
-- is_featured was already owner-proof; featured_until has to be too, or an
-- owner could simply extend their own paid window with a normal update.
-- These two are verbatim copies of the shipped functions with exactly two
-- additions each: featured_until is cleared on insert, and featured_until is
-- listed among the protected columns on update. In particular the trailing
-- "a material edit re-opens review" block is preserved — dropping it would
-- silently let an owner edit the headline numbers of an already-published
-- listing without it going back through moderation.
create or replace function public.guard_listing_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- No end-user session behind this statement: the service-role Edge
  -- Functions (payment webhook) and scheduled maintenance (promotion expiry)
  -- both need to write is_featured/featured_until, and neither is an admin.
  -- Not reachable by a signed-out caller: every write policy on this table
  -- requires owner_id = auth.uid(), which is false when auth.uid() is null,
  -- so RLS rejects anon writes before any trigger runs.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      raise exception 'not authorized to create a listing with status %', new.status
        using errcode = '42501';
    end if;
    new.verification_status := 'none';
    new.verified_at := null;
    new.is_featured := false;
    new.featured_until := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.status in ('published', 'rejected')
     and new.status is distinct from old.status then
    raise exception 'not authorized to approve or reject a listing'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.is_featured is distinct from old.is_featured
     or new.featured_until is distinct from old.featured_until
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'not authorized to modify protected listing fields'
      using errcode = '42501';
  end if;

  if old.status in ('published', 'rejected')
     and (new.title is distinct from old.title
          or new.sector is distinct from old.sector
          or new.city is distinct from old.city
          or new.monthly_revenue is distinct from old.monthly_revenue
          or new.offered_percentage is distinct from old.offered_percentage
          or new.description is distinct from old.description
          or new.reason_for_selling is distinct from old.reason_for_selling
          or new.reason_for_selling_other is distinct from old.reason_for_selling_other) then
    new.status := 'pending_review';
    new.reviewed_at := null;
    new.rejection_reason := null;
    if new.verification_status = 'verified' then
      new.verification_status := 'none';
      new.verified_at := null;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_franchise_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- No end-user session behind this statement: the service-role Edge
  -- Functions (payment webhook) and scheduled maintenance (promotion expiry)
  -- both need to write is_featured/featured_until, and neither is an admin.
  -- Not reachable by a signed-out caller: every write policy on this table
  -- requires owner_id = auth.uid(), which is false when auth.uid() is null,
  -- so RLS rejects anon writes before any trigger runs.
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending_review') then
      raise exception 'not authorized to create a franchise with status %', new.status
        using errcode = '42501';
    end if;
    new.verification_status := 'none';
    new.verified_at := null;
    new.is_featured := false;
    new.featured_until := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;

  if new.status in ('published', 'rejected')
     and new.status is distinct from old.status then
    raise exception 'not authorized to approve or reject a franchise'
      using errcode = '42501';
  end if;

  if new.verification_status is distinct from old.verification_status
     or new.verified_at is distinct from old.verified_at
     or new.is_featured is distinct from old.is_featured
     or new.featured_until is distinct from old.featured_until
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'not authorized to modify protected franchise fields'
      using errcode = '42501';
  end if;

  if old.status in ('published', 'rejected')
     and (new.brand_name is distinct from old.brand_name
          or new.sector is distinct from old.sector
          or new.city is distinct from old.city
          or new.franchise_fee is distinct from old.franchise_fee
          or new.description is distinct from old.description) then
    new.status := 'pending_review';
    new.reviewed_at := null;
    new.rejection_reason := null;
    if new.verification_status = 'verified' then
      new.verification_status := 'none';
      new.verified_at := null;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------- expiry ---
-- Flips is_featured back off once the paid window closes. Written to be safe
-- to run at any frequency: it only touches rows whose window has actually
-- lapsed, so repeated runs converge and a missed run self-heals on the next.
create or replace function public.expire_featured_promotions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer := 0;
  n integer;
begin
  update public.listings
    set is_featured = false, featured_until = null
    where featured_until is not null and featured_until <= now();
  get diagnostics n = row_count;
  expired_count := expired_count + n;

  update public.franchises
    set is_featured = false, featured_until = null
    where featured_until is not null and featured_until <= now();
  get diagnostics n = row_count;
  expired_count := expired_count + n;

  return expired_count;
end;
$$;

-- Maintenance routine, not an API. No client ever calls this.
revoke execute on function public.expire_featured_promotions() from public, anon, authenticated;

create extension if not exists pg_cron with schema extensions;

-- Hourly is granular enough for a promotion measured in days, and cheap.
select cron.unschedule('expire-featured-promotions')
  where exists (select 1 from cron.job where jobname = 'expire-featured-promotions');

select cron.schedule(
  'expire-featured-promotions',
  '7 * * * *',
  $cron$ select public.expire_featured_promotions(); $cron$
);
