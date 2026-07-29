-- Miyar (معيار) — per-user creation rate limits.
--
-- Until now the only rate limit anywhere in the schema was phone_otp_throttle
-- (0035). Every other INSERT policy checked ownership and nothing else, so a
-- script could create thousands of draft listings per second (flooding the
-- admin moderation queue), file unlimited reports against a competitor, or
-- DM-spam every published listing owner. None of that is publicly visible —
-- listings still need admin approval — but the compute/storage cost and the
-- moderation burden are unbounded, which is its own kind of outage.
--
-- The counter table has RLS on with NO policies: it is reachable only through
-- the SECURITY DEFINER function below, never from PostgREST.
--
-- On the counter and rollback: when a call is refused the RAISE aborts the
-- whole transaction, including that call's own increment. That is correct —
-- the allowed calls commit and leave the counter at the limit, and every
-- subsequent attempt re-increments to limit+1, trips, and rolls back again.
-- The limit therefore holds instead of drifting upward.

create table public.rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, action, window_start)
);

alter table public.rate_limits enable row level security;

create index rate_limits_window_start_idx on public.rate_limits (window_start);

create or replace function private.enforce_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_bucket timestamptz;
  v_count integer;
begin
  -- Backend contexts (webhooks, cron, admin tooling running as service_role)
  -- have no auth.uid(); they are not who this limit is for. Same carve-out
  -- the protected-column guards use.
  if v_uid is null or public.is_admin() then
    return;
  end if;

  v_bucket := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits as rl (user_id, action, window_start, count)
    values (v_uid, p_action, v_bucket, 1)
  on conflict (user_id, action, window_start)
    do update set count = rl.count + 1
  returning rl.count into v_count;

  if v_count > p_limit then
    raise exception 'rate_limit_exceeded: % (max % per % seconds)',
      p_action, p_limit, p_window_seconds
      using errcode = '54000';
  end if;

  -- Opportunistic cleanup so the table stays bounded without extra infra.
  -- Doing it on every call would double the writes for no benefit.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
end;
$$;

revoke all on function private.enforce_rate_limit(text, integer, integer) from public;

-- Trigger wrappers. These live in public because that is where every other
-- guard trigger in this schema lives, and are revoked from the API roles the
-- same way 0004 revokes the other trigger functions — trigger execution does
-- not consult the invoking user's EXECUTE privilege.

create or replace function public.rate_limit_listing_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate_limit('listing_create', 10, 3600);
  return new;
end;
$$;

create or replace function public.rate_limit_franchise_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate_limit('franchise_create', 10, 3600);
  return new;
end;
$$;

create or replace function public.rate_limit_conversation_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate_limit('conversation_create', 20, 3600);
  return new;
end;
$$;

create or replace function public.rate_limit_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Deliberately generous: a real negotiation is a fast back-and-forth and
  -- must never feel throttled. This is an anti-scripting ceiling, not a pace.
  perform private.enforce_rate_limit('message_send', 60, 3600);
  return new;
end;
$$;

create or replace function public.rate_limit_report_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enforce_rate_limit('report_create', 10, 3600);
  return new;
end;
$$;

revoke execute on function public.rate_limit_listing_insert() from public, anon, authenticated;
revoke execute on function public.rate_limit_franchise_insert() from public, anon, authenticated;
revoke execute on function public.rate_limit_conversation_insert() from public, anon, authenticated;
revoke execute on function public.rate_limit_message_insert() from public, anon, authenticated;
revoke execute on function public.rate_limit_report_insert() from public, anon, authenticated;

create trigger listings_rate_limit before insert on public.listings
  for each row execute function public.rate_limit_listing_insert();
create trigger franchises_rate_limit before insert on public.franchises
  for each row execute function public.rate_limit_franchise_insert();
create trigger conversations_rate_limit before insert on public.conversations
  for each row execute function public.rate_limit_conversation_insert();
create trigger messages_rate_limit before insert on public.messages
  for each row execute function public.rate_limit_message_insert();
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.rate_limit_report_insert();

-- Audit finding: reports.target_id was a bare uuid with no FK and nothing
-- validating it points at a real row, so the admin queue could accumulate
-- reports linked to nothing. A trigger rather than an FK because target_id
-- points at one of three different tables depending on target_type.
create or replace function public.validate_report_target() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.target_type = 'listing' then
    if not exists (select 1 from public.listings where id = new.target_id) then
      raise exception 'reported listing does not exist' using errcode = '23503';
    end if;
  elsif new.target_type = 'franchise' then
    if not exists (select 1 from public.franchises where id = new.target_id) then
      raise exception 'reported franchise does not exist' using errcode = '23503';
    end if;
  elsif new.target_type = 'user' then
    if not exists (select 1 from public.profiles where id = new.target_id) then
      raise exception 'reported user does not exist' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_report_target() from public, anon, authenticated;

create trigger reports_validate_target before insert on public.reports
  for each row execute function public.validate_report_target();
