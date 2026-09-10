-- Simplified tax invoices with the ZATCA QR code.
--
-- A simplified tax invoice in Saudi Arabia must carry a QR code holding five
-- fields in TLV form, base64-encoded: seller name, VAT registration number,
-- timestamp, invoice total including VAT, and the VAT amount. This is a
-- legal requirement, not a nicety — the app was computing VAT and showing it
-- on screen but could not produce an invoice at all.
--
-- The encoder is verified against ZATCA's own published reference vector
-- ("Bobs Records" / 310122393500003 / 2022-04-25T15:30:00Z / 1000.00 /
-- 150.00), which is what caught the base64 line-wrapping defect fixed below.

create table public.org_settings (
  id boolean primary key default true,
  seller_name text not null default 'سمو لتأجير السيارات',
  vat_number text not null default '',
  cr_number text not null default '',
  address text not null default '',
  city text not null default '',
  postal_code text not null default '',
  phone text not null default '',
  email text not null default '',
  updated_at timestamptz not null default now(),
  constraint org_settings_single_row check (id)
);

insert into public.org_settings (id) values (true);

alter table public.org_settings enable row level security;

-- Readable: the invoice screen renders the seller block from it.
create policy org_settings_read on public.org_settings for select using (true);
create policy org_settings_admin_write on public.org_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------- TLV/QR ----
-- One TLV field: a tag byte, a length byte, then the UTF-8 value. The length
-- is the byte count, not the character count — an Arabic seller name is two
-- bytes per letter, and using length() here would produce a QR that every
-- ZATCA reader rejects.
--
-- (search_path is pinned in 0042; the body is otherwise unchanged.)
create or replace function public.zatca_tlv(p_tag integer, p_value text)
returns bytea
language plpgsql
immutable
as $$
declare
  v_bytes bytea := convert_to(coalesce(p_value, ''), 'UTF8');
begin
  if octet_length(v_bytes) > 255 then
    raise exception 'zatca_tlv_value_too_long (tag %)', p_tag;
  end if;
  return decode(lpad(to_hex(p_tag), 2, '0'), 'hex')
      || decode(lpad(to_hex(octet_length(v_bytes)), 2, '0'), 'hex')
      || v_bytes;
end;
$$;

-- Postgres' encode(..., 'base64') emits MIME base64, which breaks the output
-- with a newline every 76 characters. The QR payload has to be one
-- continuous string: with the wrap in place the encoding matched ZATCA's own
-- reference vector byte for byte except for a stray newline in the middle,
-- which is exactly the kind of defect that passes every eyeball check and
-- then fails at the tax authority's reader.
create or replace function public.zatca_qr(
  p_seller_name text,
  p_vat_number text,
  p_issued_at timestamptz,
  p_total numeric,
  p_vat_amount numeric
)
returns text
language sql
immutable
as $$
  select replace(
    encode(
      public.zatca_tlv(1, p_seller_name)
      || public.zatca_tlv(2, p_vat_number)
      || public.zatca_tlv(3, to_char(p_issued_at at time zone 'UTC',
                                     'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
      || public.zatca_tlv(4, to_char(p_total, 'FM9999999990.00'))
      || public.zatca_tlv(5, to_char(p_vat_amount, 'FM9999999990.00')),
      'base64'),
    E'\n', '');
$$;

-- ------------------------------------------------------------- invoices ----
create sequence public.invoice_number_seq;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  -- One invoice per booking. 0040 relaxes this to allow an extension its own
  -- invoice, replacing it with a partial unique index.
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  number text not null unique,
  issued_at timestamptz not null default now(),

  -- The seller block is snapshotted, not joined. An invoice states what was
  -- true when it was issued; changing the company address next year must not
  -- silently rewrite last year's invoices.
  seller_name text not null,
  seller_vat_number text not null,
  seller_cr_number text not null,
  seller_address text not null,

  buyer_name text,
  buyer_phone text,

  rental_total numeric(10, 2) not null,
  addons_total numeric(10, 2) not null,
  discount_amount numeric(10, 2) not null,
  wallet_amount numeric(10, 2) not null,
  vat_rate numeric(5, 4) not null,
  vat_amount numeric(10, 2) not null,
  total numeric(10, 2) not null,

  lines jsonb not null default '[]'::jsonb,
  qr_base64 text not null,
  created_at timestamptz not null default now()
);

create index invoices_issued_idx on public.invoices (issued_at desc);

alter table public.invoices enable row level security;

create policy invoices_select_own on public.invoices
  for select using (
    public.is_admin()
    or exists (select 1 from public.bookings b
                where b.id = invoices.booking_id
                  and b.customer_id = (select auth.uid()))
  );

-- No insert/update/delete policy for anyone, admins included: invoices are
-- issued by the trigger below and are then immutable. A tax document that
-- staff can edit after the fact is worth nothing as evidence.

-- --------------------------------------------------------------- issuing ---
-- (Superseded by 0041, which adds the delivery line.)
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

  select id into v_id from public.invoices where booking_id = p_booking;
  if found then return v_id; end if;

  select * into o from public.org_settings where id;
  select * into p from public.profiles where id = b.customer_id;

  v_number := 'SMO-' || to_char(v_issued, 'YYYY') || '-'
              || lpad(nextval('public.invoice_number_seq')::text, 6, '0');

  select jsonb_agg(jsonb_build_object('name', name, 'total', total)
                   order by name)
    into v_lines
    from public.booking_addons where booking_id = p_booking;

  insert into public.invoices (
    booking_id, number, issued_at,
    seller_name, seller_vat_number, seller_cr_number, seller_address,
    buyer_name, buyer_phone,
    rental_total, addons_total, discount_amount, wallet_amount,
    vat_rate, vat_amount, total, lines, qr_base64
  ) values (
    b.id, v_number, v_issued,
    o.seller_name, o.vat_number, o.cr_number,
    btrim(concat_ws('، ', nullif(o.address, ''), nullif(o.city, ''))),
    p.full_name, p.phone,
    b.rental_total, b.addons_total, b.discount_amount, b.wallet_amount,
    b.vat_rate, b.vat_amount, b.total,
    coalesce(v_lines, '[]'::jsonb),
    public.zatca_qr(o.seller_name, o.vat_number, v_issued, b.total, b.vat_amount)
  ) returning id into v_id;

  return v_id;
end;
$$;

-- The invoice is issued the moment the rental is paid for, because that is
-- the moment the supply is consideration-complete and the customer is
-- entitled to the document.
create or replace function public.issue_invoice_on_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payment_status = 'paid' and coalesce(old.payment_status, 'unpaid') <> 'paid' then
    perform public.issue_invoice_for_booking(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists bookings_issue_invoice on public.bookings;
create trigger bookings_issue_invoice
  after update of payment_status on public.bookings
  for each row execute function public.issue_invoice_on_payment();

revoke all on function public.zatca_tlv(integer, text) from public;
revoke all on function public.zatca_qr(text, text, timestamptz, numeric, numeric) from public;
revoke all on function public.issue_invoice_for_booking(uuid) from public;
