-- Extending a rental in progress.
--
-- Design decision worth stating plainly: an extension is priced and invoiced
-- as its own segment, and the original booking's money is never touched.
--
-- The alternative — reprice the whole rental over the new number of days and
-- charge the difference — is friendlier on rate tiers but rewrites figures a
-- customer has already paid and a tax invoice has already been issued for.
-- An issued invoice must not change. So:
--
--   end_date / days   -> the whole rental, because the branch and the
--                        availability constraint must see the truth
--   total / vat / etc -> the original contract, settled and invoiced
--   extensions_total  -> what the extensions added, each with its own invoice

alter table public.bookings
  add column extensions_total numeric(10, 2) not null default 0,
  add constraint bookings_extensions_total_non_negative check (extensions_total >= 0);

create table public.booking_extensions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  previous_end_date date not null,
  new_end_date date not null,
  days_added integer not null,
  daily_rate numeric(10, 2) not null,
  rate_tier text not null,
  amount numeric(10, 2) not null,
  vat_rate numeric(5, 4) not null,
  vat_amount numeric(10, 2) not null,
  payment_status payment_status not null default 'unpaid',
  payment_ref text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint booking_extensions_dates_ordered check (new_end_date > previous_end_date),
  constraint booking_extensions_days_positive check (days_added > 0),
  constraint booking_extensions_amount_non_negative check (amount >= 0)
);

create index booking_extensions_booking_idx
  on public.booking_extensions (booking_id, created_at desc);

alter table public.booking_extensions enable row level security;

create policy booking_extensions_select_own on public.booking_extensions
  for select using (
    public.is_admin()
    or exists (select 1 from public.bookings b
                where b.id = booking_extensions.booking_id
                  and b.customer_id = (select auth.uid()))
  );

create policy booking_extensions_admin_write on public.booking_extensions
  for all using (public.is_admin()) with check (public.is_admin());

-- Customers create extensions only through request_extension() below, which
-- is what enforces availability and pricing.

-- ----------------------------------------------------------------- quote ---
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
begin
  select * into b from public.bookings where id = p_booking;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'booking_not_found');
  end if;
  if b.customer_id <> (select auth.uid()) and not public.is_admin() then
    raise exception 'not_authorised';
  end if;

  -- Only a rental that is going to happen, or is happening, can be extended.
  if b.status not in ('confirmed', 'active') then
    return jsonb_build_object('ok', false, 'reason', 'status_not_extendable',
                              'status', b.status);
  end if;
  if p_new_end is null or p_new_end <= b.end_date then
    return jsonb_build_object('ok', false, 'reason', 'end_date_not_later',
                              'current_end', b.end_date);
  end if;

  -- Someone else's booking in the extension window.
  if exists (
    select 1 from public.bookings o
     where o.car_id = b.car_id
       and o.id <> b.id
       and o.status in ('pending_payment', 'pending_confirmation', 'confirmed', 'active')
       and daterange(o.start_date, o.end_date, '[)')
           && daterange(b.end_date, p_new_end, '[)')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'car_taken',
                              'current_end', b.end_date);
  end if;

  -- Maintenance or any operator-side block on the car.
  if exists (
    select 1 from public.car_blocks cb
     where cb.car_id = b.car_id
       and daterange(cb.start_date, cb.end_date, '[)')
           && daterange(b.end_date, p_new_end, '[)')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'car_blocked',
                              'current_end', b.end_date);
  end if;

  -- Priced as its own rental over the added window, so the tier reflects the
  -- length of the extension itself.
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

-- --------------------------------------------------------------- request ---
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

  -- The exclusion constraint on bookings is the real guarantee here: if
  -- another booking claimed the window between the quote and this update,
  -- this statement fails rather than double-booking the car.
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
end;
$$;

revoke all on function public.quote_extension(uuid, date) from public;
revoke all on function public.request_extension(uuid, date) from public;
grant execute on function public.quote_extension(uuid, date) to authenticated;
grant execute on function public.request_extension(uuid, date) to authenticated;

-- ---------------------------------------------- invoicing an extension -----
-- An extension is a separate supply and gets its own tax invoice. The
-- booking_id uniqueness therefore has to become "one invoice per booking for
-- the booking itself", leaving extensions free to have their own.
alter table public.invoices
  add column extension_id uuid unique references public.booking_extensions(id) on delete restrict;

alter table public.invoices drop constraint invoices_booking_id_key;

create unique index invoices_one_per_booking
  on public.invoices (booking_id) where extension_id is null;

create or replace function public.issue_invoice_for_extension(p_extension uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  e public.booking_extensions%rowtype;
  b public.bookings%rowtype;
  o public.org_settings%rowtype;
  p public.profiles%rowtype;
  v_id uuid;
  v_number text;
  v_issued timestamptz := now();
begin
  select * into e from public.booking_extensions where id = p_extension;
  if not found then raise exception 'extension_not_found'; end if;

  select id into v_id from public.invoices where extension_id = p_extension;
  if found then return v_id; end if;

  select * into b from public.bookings where id = e.booking_id;
  select * into o from public.org_settings where id;
  select * into p from public.profiles where id = b.customer_id;

  v_number := 'SMO-' || to_char(v_issued, 'YYYY') || '-'
              || lpad(nextval('public.invoice_number_seq')::text, 6, '0');

  insert into public.invoices (
    booking_id, extension_id, number, issued_at,
    seller_name, seller_vat_number, seller_cr_number, seller_address,
    buyer_name, buyer_phone,
    rental_total, addons_total, discount_amount, wallet_amount,
    vat_rate, vat_amount, total, lines, qr_base64
  ) values (
    b.id, e.id, v_number, v_issued,
    o.seller_name, o.vat_number, o.cr_number,
    btrim(concat_ws('، ', nullif(o.address, ''), nullif(o.city, ''))),
    p.full_name, p.phone,
    e.amount, 0, 0, 0,
    e.vat_rate, e.vat_amount, e.amount,
    jsonb_build_array(jsonb_build_object(
      'name', 'تمديد الحجز ' || b.reference || ' حتى ' || to_char(e.new_end_date, 'YYYY-MM-DD'),
      'total', e.amount)),
    public.zatca_qr(o.seller_name, o.vat_number, v_issued, e.amount, e.vat_amount)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.issue_extension_invoice_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'paid' and coalesce(old.payment_status, 'unpaid') <> 'paid' then
    perform public.issue_invoice_for_extension(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists booking_extensions_issue_invoice on public.booking_extensions;
create trigger booking_extensions_issue_invoice
  after update of payment_status on public.booking_extensions
  for each row execute function public.issue_extension_invoice_on_payment();

revoke all on function public.issue_invoice_for_extension(uuid) from public;
