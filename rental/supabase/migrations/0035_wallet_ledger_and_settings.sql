-- Customer wallet.
--
-- Money the customer has with us — welcome credit, referral rewards, refunds
-- — and what they spend it on. It is a ledger, not a balance column: a
-- balance you can UPDATE is a balance two concurrent requests can both read
-- as 50 and both spend, and it can never answer "where did this come from".
-- Every movement is a row, and the balance is their sum.
--
-- Nothing here is client-writable. Rows are written only by SECURITY DEFINER
-- functions and by admins, so a customer cannot credit themselves.

create type wallet_entry_kind as enum (
  'welcome_bonus',    -- first account, once
  'referral_bonus',   -- someone signed up with this customer's code
  'booking_redeem',   -- spent on a booking (negative)
  'booking_refund',   -- that booking was cancelled, credit returned
  'admin_credit',     -- goodwill / correction from the panel
  'admin_debit',      -- correction the other way
  'expiry'            -- credit that timed out
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind wallet_entry_kind not null,
  -- Signed: credits positive, spends negative, so the balance is a plain sum
  -- and no reader has to know which kinds mean which direction.
  amount numeric(10, 2) not null,
  booking_id uuid references public.bookings(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint wallet_amount_nonzero check (amount <> 0),
  -- The sign is not the caller's choice: a 'welcome_bonus' of -50 or a
  -- 'booking_redeem' of +200 would both be a silent way to mint money.
  constraint wallet_sign_matches_kind check (
    (kind in ('welcome_bonus', 'referral_bonus', 'booking_refund', 'admin_credit')
       and amount > 0)
    or
    (kind in ('booking_redeem', 'admin_debit', 'expiry')
       and amount < 0)
  )
);

create index wallet_transactions_user_idx
  on public.wallet_transactions (user_id, created_at desc);

-- A booking spends the wallet at most once. The redemption row is adjusted in
-- place while the booking is still being priced (add-ons move the total), so
-- it must be a single identifiable row rather than a pile of deltas.
create unique index wallet_one_redeem_per_booking
  on public.wallet_transactions (booking_id)
  where kind = 'booking_redeem';

-- One welcome bonus per account, enforced by the database rather than by the
-- function that grants it — this is the row a fraudster most wants twice.
create unique index wallet_one_welcome_per_user
  on public.wallet_transactions (user_id)
  where kind = 'welcome_bonus';

alter table public.wallet_transactions enable row level security;

create policy wallet_transactions_select_own on public.wallet_transactions
  for select using (user_id = (select auth.uid()) or public.is_admin());

create policy wallet_transactions_admin_insert on public.wallet_transactions
  for insert with check (public.is_admin() and kind in ('admin_credit', 'admin_debit'));

-- Deliberately no update or delete policy, for anyone: a ledger that can be
-- rewritten is not a ledger. Corrections are new rows.

-- ------------------------------------------------------------- settings ----
-- The amounts live in a row, not in the code, because they are a marketing
-- dial the operator will want to turn during a campaign without a release.
create table public.wallet_settings (
  id boolean primary key default true,
  welcome_enabled boolean not null default true,
  welcome_bonus numeric(10, 2) not null default 50,
  referral_enabled boolean not null default true,
  referral_bonus numeric(10, 2) not null default 20,
  -- A welcome credit that can be spent on a 60-riyal booking is a 50-riyal
  -- giveaway per new phone number. This is the floor that makes it a
  -- discount on real business instead.
  min_booking_total_to_redeem numeric(10, 2) not null default 0,
  -- Ceiling on how much of one booking the wallet may cover, so a balance
  -- never produces a zero-riyal rental.
  max_redeem_percent numeric(5, 2) not null default 100,
  -- Ties credit to a verified phone rather than to an app install.
  require_phone_for_welcome boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint wallet_settings_single_row check (id),
  constraint wallet_settings_amounts_non_negative check (
    welcome_bonus >= 0 and referral_bonus >= 0 and min_booking_total_to_redeem >= 0
  ),
  constraint wallet_settings_percent_range check (max_redeem_percent between 0 and 100)
);

insert into public.wallet_settings (id) values (true);

alter table public.wallet_settings enable row level security;

-- Readable by everyone: the app advertises "ادعُ صديقًا واحصل على ٢٠ ريال"
-- and must show the number that is actually in force.
create policy wallet_settings_read on public.wallet_settings
  for select using (true);

create policy wallet_settings_admin_write on public.wallet_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------- balance -----
-- Spendable balance. Reading someone else's is an admin action; asking for
-- another customer's balance is refused rather than quietly answered with
-- your own.
create or replace function public.wallet_balance(p_user uuid default null)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user, (select auth.uid()));
begin
  if v_user is null then
    return 0;
  end if;
  if v_user <> (select auth.uid()) and not public.is_admin() then
    raise exception 'not_authorised';
  end if;

  return coalesce(
    (select sum(amount) from public.wallet_transactions where user_id = v_user),
    0
  );
end;
$$;

revoke all on function public.wallet_balance(uuid) from public;
grant execute on function public.wallet_balance(uuid) to authenticated;
