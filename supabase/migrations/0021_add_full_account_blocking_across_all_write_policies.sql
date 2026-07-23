-- 1) Block flag + helper, same pattern as is_admin().
alter table public.profiles
  add column is_blocked boolean not null default false;

create or replace function public.is_blocked(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce((select p.is_blocked from public.profiles p where p.id = uid), false);
$$;

-- 2) Column guard: only an admin may change is_blocked. Without this, RLS
-- alone would let a blocked user simply PATCH their own profile row back to
-- is_blocked = false (profiles_update_own_or_admin already permits
-- self-update of the row; nothing previously restricted this column).
create or replace function public.guard_profile_block_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_blocked is distinct from old.is_blocked and not public.is_admin() then
    raise exception 'not authorized to modify block status' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_profile_block_status() from public, anon, authenticated;

create trigger profiles_guard_block_status
  before update on public.profiles
  for each row execute function public.guard_profile_block_status();

-- 3) Add "and not is_blocked(auth.uid())" to every write policy where the
-- acting user is a non-admin party (self, or an accountant acting on their
-- own assignment). Admin-only policies (accountants_insert_admin,
-- reports_update_admin) are untouched -- an admin cannot block themselves.

drop policy accountants_insert_own on public.accountants;
create policy accountants_insert_own on public.accountants
  for insert with check (
    auth.uid() = id
    and not is_blocked(auth.uid())
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'accountant')
  );

drop policy accountants_update_own_or_admin on public.accountants;
create policy accountants_update_own_or_admin on public.accountants
  for update
  using ((auth.uid() = id or is_admin()) and not is_blocked(auth.uid()))
  with check ((auth.uid() = id or is_admin()) and not is_blocked(auth.uid()));

drop policy conversations_insert_investor on public.conversations;
create policy conversations_insert_investor on public.conversations
  for insert with check (
    investor_id = auth.uid()
    and owner_id <> auth.uid()
    and not is_blocked(auth.uid())
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = public.conversations.owner_id and l.status = 'published'
    )
  );

drop policy favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert with check (user_id = auth.uid() and not is_blocked(auth.uid()));

drop policy listing_confidential_insert_owner on public.listing_confidential;
create policy listing_confidential_insert_owner on public.listing_confidential
  for insert with check (
    owner_id = auth.uid()
    and not is_blocked(auth.uid())
    and exists (select 1 from public.listings l where l.id = listing_confidential.listing_id and l.owner_id = auth.uid())
  );

drop policy listing_confidential_update_owner_or_admin on public.listing_confidential;
create policy listing_confidential_update_owner_or_admin on public.listing_confidential
  for update
  using ((owner_id = auth.uid() or is_admin()) and not is_blocked(auth.uid()))
  with check ((owner_id = auth.uid() or is_admin()) and not is_blocked(auth.uid()));

drop policy listings_insert_own on public.listings;
create policy listings_insert_own on public.listings
  for insert with check (owner_id = auth.uid() and not is_blocked(auth.uid()));

drop policy listings_update_own_or_admin on public.listings;
create policy listings_update_own_or_admin on public.listings
  for update
  using ((owner_id = auth.uid() or is_admin()) and not is_blocked(auth.uid()))
  with check ((owner_id = auth.uid() or is_admin()) and not is_blocked(auth.uid()));

drop policy messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages
  for insert with check (
    sender_id = auth.uid()
    and not is_blocked(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  );

drop policy messages_update_mark_read on public.messages;
create policy messages_update_mark_read on public.messages
  for update
  using (
    sender_id <> auth.uid()
    and not is_blocked(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and not is_blocked(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  );

drop policy notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update
  using (user_id = auth.uid() and not is_blocked(auth.uid()))
  with check (user_id = auth.uid() and not is_blocked(auth.uid()));

drop policy profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id and not is_blocked(auth.uid()));

drop policy profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
  for update
  using ((auth.uid() = id or is_admin()) and not is_blocked(auth.uid()))
  with check ((auth.uid() = id or is_admin()) and not is_blocked(auth.uid()));

drop policy push_tokens_insert_own on public.push_tokens;
create policy push_tokens_insert_own on public.push_tokens
  for insert with check (user_id = auth.uid() and not is_blocked(auth.uid()));

drop policy push_tokens_update_own on public.push_tokens;
create policy push_tokens_update_own on public.push_tokens
  for update
  using (user_id = auth.uid() and not is_blocked(auth.uid()))
  with check (user_id = auth.uid() and not is_blocked(auth.uid()));

drop policy ratings_insert_after_contact on public.ratings;
create policy ratings_insert_after_contact on public.ratings
  for insert with check (
    rater_id = auth.uid()
    and rated_id <> auth.uid()
    and not is_blocked(auth.uid())
    and exists (
      select 1 from public.conversations c
      where (c.owner_id = auth.uid() and c.investor_id = public.ratings.rated_id)
         or (c.investor_id = auth.uid() and c.owner_id = public.ratings.rated_id)
    )
  );

drop policy ratings_update_own on public.ratings;
create policy ratings_update_own on public.ratings
  for update
  using (rater_id = auth.uid() and not is_blocked(auth.uid()))
  with check (rater_id = auth.uid() and not is_blocked(auth.uid()));

drop policy reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid() and not is_blocked(auth.uid()));

drop policy verification_requests_insert_owner on public.verification_requests;
create policy verification_requests_insert_owner on public.verification_requests
  for insert with check (
    owner_id = auth.uid()
    and not is_blocked(auth.uid())
    and exists (select 1 from public.listings l where l.id = verification_requests.listing_id and l.owner_id = auth.uid())
  );

drop policy verification_requests_update_owner on public.verification_requests;
create policy verification_requests_update_owner on public.verification_requests
  for update
  using (owner_id = auth.uid() and not is_blocked(auth.uid()))
  with check (owner_id = auth.uid() and not is_blocked(auth.uid()));

drop policy verification_requests_update_accountant_or_admin on public.verification_requests;
create policy verification_requests_update_accountant_or_admin on public.verification_requests
  for update
  using (
    is_admin()
    or (accountant_id = auth.uid() and not is_blocked(auth.uid())
        and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active))
  )
  with check (
    is_admin()
    or (accountant_id = auth.uid() and not is_blocked(auth.uid())
        and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active))
  );

drop policy verification_requests_claim_accountant on public.verification_requests;
create policy verification_requests_claim_accountant on public.verification_requests
  for update
  using (
    accountant_id is null and status = 'requested' and not is_blocked(auth.uid())
    and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active)
  )
  with check (
    accountant_id = auth.uid() and not is_blocked(auth.uid())
    and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active)
  );
