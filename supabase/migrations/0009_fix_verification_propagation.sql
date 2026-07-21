-- Miyar (معيار) — Phase 4 fix: system-triggered listing updates must bypass
-- the phase-3 owner guard trigger.
--
-- SECURITY DEFINER changes the executing privileges, not auth.uid() — the
-- guard trigger on listings still evaluates is_admin() against the real
-- calling user (the owner/accountant), so it correctly rejected the system
-- propagation update. The fix: these two trusted, non-client-callable
-- trigger functions disable triggers for just their own statement via
-- `set local session_replication_role = replica`, scoped to the current
-- transaction, then restore it immediately after.

create or replace function public.handle_verification_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  set local session_replication_role = replica;

  update public.listings
  set verification_status = 'pending'
  where id = new.listing_id
    and verification_status in ('none', 'rejected');

  set local session_replication_role = default;

  perform public.log_audit(
    'verification_request.created',
    'verification_request',
    new.id,
    jsonb_build_object('listing_id', new.listing_id)
  );

  return new;
end;
$$;

create or replace function public.handle_verification_request_resolved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    set local session_replication_role = replica;

    update public.listings
    set verification_status = 'verified',
        verified_at = now()
    where id = new.listing_id;

    set local session_replication_role = default;

    perform public.log_audit(
      'verification_request.completed',
      'verification_request',
      new.id,
      jsonb_build_object('listing_id', new.listing_id, 'verified_revenue', new.verified_revenue)
    );
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    set local session_replication_role = replica;

    update public.listings
    set verification_status = 'rejected'
    where id = new.listing_id;

    set local session_replication_role = default;

    perform public.log_audit(
      'verification_request.rejected',
      'verification_request',
      new.id,
      jsonb_build_object('listing_id', new.listing_id, 'notes', new.notes)
    );
  end if;

  return new;
end;
$$;
