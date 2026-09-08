-- Miyar Rental — security hardening
--
-- Found by running Supabase's security advisor against the fresh database.
-- Two of these were real holes, not lint noise:
--
--   1. expire_stale_bookings() was reachable as a REST RPC by anyone, so any
--      caller could have expired every pending booking in the system.
--   2. log_audit() accepted arbitrary entries from any signed-in user, which
--      makes an audit trail worthless — a forged trail is worse than none.
--
-- The rest closes the gap between "revoked from anon and authenticated" and
-- "actually not callable": Postgres grants EXECUTE to PUBLIC on every new
-- function, and Supabase additionally grants it to anon/authenticated by
-- default privilege, so a revoke has to name all three to take effect.

-- ---------------------------------------------------- pinned search_path ----
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.set_car_defaults()
returns trigger language plpgsql set search_path = public as $$
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

create or replace function public.generate_booking_reference()
returns text language plpgsql volatile set search_path = public as $$
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
returns trigger language plpgsql set search_path = public as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.generate_booking_reference();
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------- forgery-proof log ----
create or replace function public.log_audit(
  p_action text, p_entity_type text default null,
  p_entity_id text default null, p_metadata jsonb default '{}'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), p_action, p_entity_type, p_entity_id, p_metadata);
end;
$$;

-- ------------------------------------------------------------- execute acl ----
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_privileges() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.set_car_defaults() from public, anon, authenticated;
revoke execute on function public.set_booking_reference() from public, anon, authenticated;
revoke execute on function public.check_booking_not_blocked() from public, anon, authenticated;
revoke execute on function public.check_block_not_booked() from public, anon, authenticated;
revoke execute on function public.generate_booking_reference() from public, anon, authenticated;
revoke execute on function public.expire_stale_bookings() from public, anon, authenticated;
revoke execute on function public.is_blocked(uuid) from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.log_audit(text, text, text, jsonb) from public, anon;
revoke execute on function public.quote_booking(uuid, date, date, uuid[]) from public;
revoke execute on function public.car_unavailable_ranges(uuid) from public;

-- Deliberately reachable without an account: browsing quotes a price and
-- greys out unavailable dates before anyone signs up.
grant execute on function public.quote_booking(uuid, date, date, uuid[]) to anon, authenticated;
grant execute on function public.car_unavailable_ranges(uuid) to anon, authenticated;

-- Signed-in only. log_audit additionally refuses non-admins internally.
grant execute on function public.is_admin() to authenticated;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;

-- btree_gist backs the EXCLUDE constraints and has no business sitting in
-- the API-exposed public schema. Verified after the move that overlapping
-- bookings are still rejected.
alter extension btree_gist set schema extensions;
