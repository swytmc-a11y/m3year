-- Miyar (معيار) — closes three gaps found in a full-app security pass.
--
-- 1) listing-photos/franchise-photos upload policies only checked ownership,
--    unlike message-attachments which also checks is_blocked. A blocked
--    account could still upload arbitrary files to these buckets — the
--    block feature (migration on profiles.is_blocked) never covered them.
--
-- 2) recompute_all_miyar_index() is a standalone maintenance procedure, never
--    called from any client code (confirmed by search) — it's meant to be
--    run directly via SQL when recalibrating the scoring formula. It already
--    rejects non-admins internally, but leaving it directly callable via RPC
--    for anon/authenticated is unnecessary surface with no legitimate caller.
--
-- 3) log_audit() is called directly by the web admin panel and the mobile
--    app to write the audit trail, and accepts a free-form entity_type/
--    entity_id/action from the caller. That's required for it to work at
--    all (it can't be revoked without breaking every real caller), but as
--    written any authenticated user could log a fabricated entry claiming
--    an action on content they don't own, undermining the trail admins rely
--    on. Mobile only ever calls it for a listing/franchise the caller
--    themselves owns (right after an RLS-protected update on that same
--    row), so that case can be verified for real; admin callers are already
--    gated by requireAdmin() before reaching this function.

-- 1) storage: bring listing-photos/franchise-photos in line with
--    message-attachments' is_blocked check.
drop policy if exists listing_photos_owner_insert on storage.objects;
create policy listing_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos' and owner = auth.uid() and not is_blocked(auth.uid()));

drop policy if exists listing_photos_owner_delete on storage.objects;
create policy listing_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos' and owner = auth.uid() and not is_blocked(auth.uid()));

drop policy if exists franchise_photos_owner_insert on storage.objects;
create policy franchise_photos_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'franchise-photos' and owner = auth.uid() and not is_blocked(auth.uid()));

drop policy if exists franchise_photos_owner_delete on storage.objects;
create policy franchise_photos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'franchise-photos' and owner = auth.uid() and not is_blocked(auth.uid()));

-- 2) recompute_all_miyar_index: no legitimate RPC caller exists; close the
--    direct-call surface rather than relying only on the internal check.
revoke execute on function public.recompute_all_miyar_index() from public, anon, authenticated;

-- 3) log_audit: verify the actor genuinely owns the entity for the two
--    entity_types regular (non-admin) users are allowed to self-log.
--    Everything else requires is_admin() — matching how every current
--    caller of those entity_types is already gated server-side.
create or replace function public.log_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if p_entity_type = 'listing' then
      if not exists (select 1 from public.listings l where l.id = p_entity_id and l.owner_id = auth.uid()) then
        raise exception 'not authorized to log this entry' using errcode = '42501';
      end if;
    elsif p_entity_type = 'franchise' then
      if not exists (select 1 from public.franchises f where f.id = p_entity_id and f.owner_id = auth.uid()) then
        raise exception 'not authorized to log this entry' using errcode = '42501';
      end if;
    else
      raise exception 'not authorized to log this entry' using errcode = '42501';
    end if;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;
