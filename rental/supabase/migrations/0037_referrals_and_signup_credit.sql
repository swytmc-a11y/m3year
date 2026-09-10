-- Referrals.
--
-- Every account carries a code; signing up with someone's code credits both
-- sides from wallet_settings. The amounts are deliberately not written here.

alter table public.profiles add column referral_code text unique;

-- Ambiguous glyphs are removed: this code gets read off a screen, spoken
-- aloud and retyped, and an O/0 or I/1 mix-up turns a working code into a
-- support ticket.
create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_try integer := 0;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from public.profiles where referral_code = v_code);

    v_try := v_try + 1;
    if v_try > 50 then
      raise exception 'could_not_generate_referral_code';
    end if;
  end loop;
  return v_code;
end;
$$;

create or replace function public.set_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code
  before insert on public.profiles
  for each row execute function public.set_referral_code();

update public.profiles
   set referral_code = public.generate_referral_code()
 where referral_code is null;

alter table public.profiles alter column referral_code set not null;

-- ------------------------------------------------------------ referrals ----
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  -- One account is referred once, ever. This is the constraint the whole
  -- scheme rests on, so it is a key rather than a check in a function.
  referred_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null,
  referrer_bonus numeric(10, 2) not null,
  referred_bonus numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  constraint referrals_no_self check (referrer_id <> referred_id)
);

create index referrals_referrer_idx on public.referrals (referrer_id, created_at desc);

alter table public.referrals enable row level security;

create policy referrals_select_own on public.referrals
  for select using (
    referrer_id = (select auth.uid())
    or referred_id = (select auth.uid())
    or public.is_admin()
  );

-- No client write policy: rows appear only through activate_signup_credit().

-- ------------------------------------------------------------ activation ---
-- Called once by the app on the first run of a signed-in account, with the
-- referral code from the invite link if there was one.
--
-- Idempotent by construction: the welcome credit is guarded by a unique
-- index and the referral by the unique referred_id, so a double call, a
-- retry after a dropped connection, or a reinstall cannot pay twice.
create or replace function public.activate_signup_credit(p_code text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s public.wallet_settings%rowtype;
  v_user uuid := (select auth.uid());
  me public.profiles%rowtype;
  ref public.profiles%rowtype;
  v_code text := nullif(btrim(upper(coalesce(p_code, ''))), '');
  v_welcome numeric := 0;
  v_referred boolean := false;
  v_reason text := null;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into s from public.wallet_settings where id;
  select * into me from public.profiles where id = v_user;

  -- Credit follows a verified phone, not an app install: without this the
  -- welcome bonus is payable once per reinstall.
  if s.require_phone_for_welcome and nullif(btrim(coalesce(me.phone, '')), '') is null then
    return jsonb_build_object(
      'welcome', 0, 'referred', false, 'reason', 'phone_required',
      'balance', public.wallet_balance(v_user));
  end if;

  -- 1. The welcome credit, for any first-time account.
  if s.welcome_enabled and s.welcome_bonus > 0 then
    insert into public.wallet_transactions (user_id, kind, amount, note)
    values (v_user, 'welcome_bonus', s.welcome_bonus, 'رصيد ترحيبي')
    on conflict do nothing;
    -- Reports what THIS call granted, so a second call correctly says zero.
    get diagnostics v_welcome = row_count;
    v_welcome := v_welcome * s.welcome_bonus;
  end if;

  -- 2. The referral, if a code came with them.
  if v_code is not null and s.referral_enabled then
    select * into ref from public.profiles where referral_code = v_code;

    if not found then
      v_reason := 'unknown_code';
    elsif ref.id = v_user then
      v_reason := 'self_referral';
    elsif exists (select 1 from public.referrals where referred_id = v_user) then
      v_reason := 'already_referred';
    else
      insert into public.referrals (referrer_id, referred_id, code,
                                    referrer_bonus, referred_bonus)
      values (ref.id, v_user, v_code, s.referral_bonus, 0);

      insert into public.wallet_transactions (user_id, kind, amount, note)
      values (ref.id, 'referral_bonus', s.referral_bonus,
              'دعوة صديق: ' || coalesce(nullif(btrim(me.full_name), ''), 'عميل جديد'));

      v_referred := true;
    end if;
  end if;

  return jsonb_build_object(
    'welcome', v_welcome,
    'referred', v_referred,
    'reason', v_reason,
    'balance', public.wallet_balance(v_user));
end;
$$;

revoke all on function public.generate_referral_code() from public;
revoke all on function public.activate_signup_credit(text) from public;
grant execute on function public.activate_signup_credit(text) to authenticated;

-- What the invite screen shows: my code, how many took it up, what it earned.
create or replace function public.my_referral_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  s public.wallet_settings%rowtype;
begin
  if v_user is null then raise exception 'not_authenticated'; end if;
  select * into s from public.wallet_settings where id;

  return jsonb_build_object(
    'code', (select referral_code from public.profiles where id = v_user),
    'invited', (select count(*) from public.referrals where referrer_id = v_user),
    'earned', coalesce((select sum(amount) from public.wallet_transactions
                         where user_id = v_user and kind = 'referral_bonus'), 0),
    'referrer_bonus', s.referral_bonus,
    'welcome_bonus', s.welcome_bonus,
    'enabled', s.referral_enabled);
end;
$$;

revoke all on function public.my_referral_summary() from public;
grant execute on function public.my_referral_summary() to authenticated;
