-- One-time in-app nudge: "verify your phone, get the welcome credit."
--
-- Fired from the client the moment activate_signup_credit() reports
-- reason = 'phone_required' — which only happens for an account that is
-- genuinely missing a phone AND still eligible for the welcome bonus. That
-- moment already runs after any WhatsApp-flow phone attachment has
-- completed (it happens once a session exists, and phone is attached
-- before the session is minted), so this never fires for a fresh WhatsApp
-- signup mid-flow — only for an account that truly has no phone at all,
-- i.e. the email-only signup path.
--
-- category = 'offers': the app already carries an unused 'offers' column on
-- notification_preferences (nothing has broadcast one before this), so this
-- is the first thing that respects it rather than a new bespoke toggle.
--
-- Verified live (rolled-back simulation): fires once, is a silent no-op on
-- every call after, and stops applying entirely once the account's phone is
-- actually set.
create or replace function public.maybe_nudge_phone_verification()
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user uuid := (select auth.uid());
  s public.wallet_settings%rowtype;
  v_wants_offers boolean;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  -- Already has a phone, or the incentive itself isn't live — nothing to
  -- nudge about.
  if exists (select 1 from public.profiles
              where id = v_user and phone is not null) then
    return false;
  end if;

  select * into s from public.wallet_settings where id;
  if not (s.welcome_enabled and s.require_phone_for_welcome) then
    return false;
  end if;

  -- Absent means "all on", the same default listNotifications/preferences
  -- reads everywhere else in this project.
  select coalesce(offers, true) into v_wants_offers
    from public.notification_preferences where user_id = v_user;
  if v_wants_offers is null then
    v_wants_offers := true;
  end if;
  if not v_wants_offers then
    return false;
  end if;

  -- Once, ever, per account — a customer who dismisses this and comes back
  -- the next day should not find it waiting for them again.
  if exists (select 1 from public.notifications
              where user_id = v_user
                and category = 'offers'
                and data ->> 'kind' = 'verify_phone_bonus') then
    return false;
  end if;

  insert into public.notifications (user_id, category, title, body, data)
  values (
    v_user,
    'offers',
    'وثّق جوالك واربح رصيدًا',
    'وثّق رقم جوالك واحصل على ' || trim(to_char(s.welcome_bonus, 'FM999999990')) || ' ر.س في محفظتك فورًا.',
    jsonb_build_object('kind', 'verify_phone_bonus', 'action', 'verify_phone')
  );

  return true;
end;
$$;

revoke all on function public.maybe_nudge_phone_verification() from public, anon, authenticated;
grant execute on function public.maybe_nudge_phone_verification() to authenticated;

insert into public.rpc_allowlist (proname, allow_anon, allow_authenticated, reason)
values ('maybe_nudge_phone_verification', false, true, 'seeds the one-time verify-phone wallet nudge')
on conflict (proname) do update set allow_authenticated = true, reason = excluded.reason;
