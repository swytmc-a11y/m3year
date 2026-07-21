-- Miyar (معيار) — Phase 2: RLS, authorization helpers, and column guards.
--
-- Principle: every table has RLS ENABLED. Policies grant only what a given
-- user actually needs. The single "public to everyone" case is a PUBLISHED
-- listing, which is intentionally public content.

-- ---------------------------------------------------------------------------
-- Authorization helper functions (security definer -> bypass RLS, no recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Audit writer. The only supported path for inserting into audit_log.
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
  insert into public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke execute on function public.log_audit(text, text, uuid, jsonb) from public;
grant execute on function public.log_audit(text, text, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Column-guard triggers: prevent privilege escalation / self-verification that
-- row-level policies alone cannot express (RLS is row-, not column-scoped).
-- ---------------------------------------------------------------------------

-- A non-admin may only ever hold role 'project_owner' or 'investor'.
-- Becoming an 'accountant' or 'admin' requires an admin.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if new.role not in ('project_owner', 'investor') then
      raise exception 'not authorized to assign role %', new.role
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before insert or update on public.profiles
  for each row execute function public.guard_profile_role();

-- Owners may edit their listing content but never self-verify or self-feature.
create or replace function public.guard_listing_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if new.verification_status is distinct from old.verification_status
       or new.verified_at is distinct from old.verified_at
       or new.is_featured is distinct from old.is_featured then
      raise exception 'not authorized to modify protected listing fields'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_guard_protected
  before update on public.listings
  for each row execute function public.guard_listing_protected_columns();

-- Accountants cannot self-activate or inflate their own rating.
create or replace function public.guard_accountant_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.is_active is distinct from false or new.rating_avg is distinct from 0 then
        raise exception 'not authorized to set protected accountant fields'
          using errcode = '42501';
      end if;
    elsif tg_op = 'UPDATE' then
      if new.is_active is distinct from old.is_active
         or new.rating_avg is distinct from old.rating_avg then
        raise exception 'not authorized to modify protected accountant fields'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger accountants_guard_protected
  before insert or update on public.accountants
  for each row execute function public.guard_accountant_protected_columns();

-- ===========================================================================
-- Enable RLS on every table
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.accountants enable row level security;
alter table public.listings enable row level security;
alter table public.verification_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

-- Counterparts in a shared conversation can see each other's display profile.
create policy "profiles_select_conversation_counterparts"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where (c.owner_id = auth.uid() and c.investor_id = public.profiles.id)
         or (c.investor_id = auth.uid() and c.owner_id = public.profiles.id)
    )
  );

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ---------------------------------------------------------------------------
-- accountants
-- Active accountants are publicly readable (needed to show "verified by X").
-- ---------------------------------------------------------------------------
create policy "accountants_select_active_public"
  on public.accountants for select
  using (is_active = true);

create policy "accountants_select_own_or_admin"
  on public.accountants for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create policy "accountants_insert_own"
  on public.accountants for insert
  to authenticated
  with check (auth.uid() = id);

create policy "accountants_update_own_or_admin"
  on public.accountants for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------
create policy "listings_select_published_public"
  on public.listings for select
  using (status = 'published');

create policy "listings_select_own_or_admin"
  on public.listings for select
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

create policy "listings_insert_own"
  on public.listings for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "listings_update_own_or_admin"
  on public.listings for update
  to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "listings_delete_own_or_admin"
  on public.listings for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- verification_requests
-- ---------------------------------------------------------------------------
create policy "verification_requests_select_stakeholders"
  on public.verification_requests for select
  to authenticated
  using (
    owner_id = auth.uid()
    or accountant_id = auth.uid()
    or public.is_admin()
  );

-- The owner may open a request only for a listing they own.
create policy "verification_requests_insert_owner"
  on public.verification_requests for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- The assigned accountant (working the request) or an admin may update it.
create policy "verification_requests_update_accountant_or_admin"
  on public.verification_requests for update
  to authenticated
  using (accountant_id = auth.uid() or public.is_admin())
  with check (accountant_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create policy "conversations_select_participants"
  on public.conversations for select
  to authenticated
  using (owner_id = auth.uid() or investor_id = auth.uid() or public.is_admin());

-- An investor starts a conversation on a published listing; owner_id must be
-- the real listing owner (prevents forging the counterpart).
create policy "conversations_insert_investor"
  on public.conversations for insert
  to authenticated
  with check (
    investor_id = auth.uid()
    and owner_id <> auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.owner_id = public.conversations.owner_id
        and l.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create policy "messages_select_participants"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
    or public.is_admin()
  );

create policy "messages_insert_participant"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- ratings
-- Publicly readable (trust signal); writable only by someone who has actually
-- talked to the rated party through a conversation.
-- ---------------------------------------------------------------------------
create policy "ratings_select_public"
  on public.ratings for select
  using (true);

create policy "ratings_insert_after_contact"
  on public.ratings for insert
  to authenticated
  with check (
    rater_id = auth.uid()
    and rated_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where (c.owner_id = auth.uid() and c.investor_id = public.ratings.rated_id)
         or (c.investor_id = auth.uid() and c.owner_id = public.ratings.rated_id)
    )
  );

create policy "ratings_update_own"
  on public.ratings for update
  to authenticated
  using (rater_id = auth.uid())
  with check (rater_id = auth.uid());

create policy "ratings_delete_own_or_admin"
  on public.ratings for delete
  to authenticated
  using (rater_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- audit_log
-- Readable by admins only. No INSERT/UPDATE/DELETE policy exists, so direct
-- client writes are denied; the only writer is public.log_audit() (definer).
-- ---------------------------------------------------------------------------
create policy "audit_log_select_admin"
  on public.audit_log for select
  to authenticated
  using (public.is_admin());
