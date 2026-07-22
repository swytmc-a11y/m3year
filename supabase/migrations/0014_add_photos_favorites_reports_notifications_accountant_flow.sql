-- 1. Listing photos
alter table public.listings
  add column photo_urls text[] not null default '{}';

-- 2. Favorites
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);
alter table public.favorites enable row level security;

create policy favorites_select_own on public.favorites
  for select using (user_id = auth.uid());
create policy favorites_insert_own on public.favorites
  for insert with check (user_id = auth.uid());
create policy favorites_delete_own on public.favorites
  for delete using (user_id = auth.uid());

-- 3. Reports (listing or user)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'user')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());
create policy reports_select_admin on public.reports
  for select using (is_admin());
create policy reports_update_admin on public.reports
  for update using (is_admin()) with check (is_admin());

-- 4. In-app notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

-- Trusted, server-side-only inserter (no insert policy is granted to clients).
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_related_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, type, title, body, related_id)
  values (p_user_id, p_type, p_title, p_body, p_related_id);
end;
$$;
revoke execute on function public.create_notification(uuid, text, text, text, uuid) from public, anon, authenticated;

-- Notify listing owner when review outcome changes.
create or replace function public.trg_notify_listing_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'published' then
      perform public.create_notification(
        new.owner_id, 'listing_published', 'تم نشر إعلانك',
        'تمت الموافقة على "' || new.title || '" وهو الآن مرئي للعامة.', new.id
      );
    elsif new.status = 'rejected' then
      perform public.create_notification(
        new.owner_id, 'listing_rejected', 'تم رفض إعلانك',
        coalesce('سبب الرفض: ' || new.rejection_reason, 'راجع تفاصيل الإعلان لمزيد من المعلومات.'), new.id
      );
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_notify_listing_status() from public, anon, authenticated;

create trigger notify_listing_status_change
  after update on public.listings
  for each row execute function public.trg_notify_listing_status();

-- Notify listing owner when a verification request is completed/rejected.
create or replace function public.trg_notify_verification_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      perform public.create_notification(
        new.owner_id, 'verification_completed', 'اكتمل التوثيق المالي',
        'تم توثيق مشروعك ماليًا بنجاح.', new.listing_id
      );
    elsif new.status = 'rejected' then
      perform public.create_notification(
        new.owner_id, 'verification_rejected', 'تعذّر إتمام التوثيق',
        coalesce(new.notes, 'راجع طلب التوثيق لمزيد من التفاصيل.'), new.listing_id
      );
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_notify_verification_status() from public, anon, authenticated;

create trigger notify_verification_status_change
  after update on public.verification_requests
  for each row execute function public.trg_notify_verification_status();

-- Notify the recipient on a new message (in-app; push already handled separately).
create or replace function public.trg_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_investor_id uuid;
  v_recipient uuid;
begin
  select owner_id, investor_id into v_owner_id, v_investor_id
  from public.conversations where id = new.conversation_id;

  v_recipient := case when new.sender_id = v_owner_id then v_investor_id else v_owner_id end;

  perform public.create_notification(
    v_recipient, 'new_message', 'رسالة جديدة',
    left(new.body, 140), new.conversation_id
  );
  return new;
end;
$$;
revoke execute on function public.trg_notify_new_message() from public, anon, authenticated;

create trigger notify_new_message_insert
  after insert on public.messages
  for each row execute function public.trg_notify_new_message();

-- 5. Accountants can self-claim an unassigned, open verification request.
create policy verification_requests_claim_accountant on public.verification_requests
  for update
  using (
    accountant_id is null
    and status = 'requested'
    and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active)
  )
  with check (
    accountant_id = auth.uid()
    and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active)
  );

create policy verification_requests_select_open_accountant on public.verification_requests
  for select using (
    (status = 'requested' and accountant_id is null
      and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active))
  );

-- 6. Storage buckets
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

-- Public bucket objects are readable via the public URL, which bypasses RLS;
-- no broad SELECT policy on storage.objects is added (avoids bucket-listing exposure).
create policy listing_photos_owner_insert on storage.objects
  for insert with check (bucket_id = 'listing-photos' and owner = auth.uid());
create policy listing_photos_owner_delete on storage.objects
  for delete using (bucket_id = 'listing-photos' and owner = auth.uid());

create policy verification_docs_stakeholders_select on storage.objects
  for select using (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.verification_requests vr
      where vr.id::text = (storage.foldername(name))[1]
        and (vr.owner_id = auth.uid() or vr.accountant_id = auth.uid() or is_admin())
    )
  );
create policy verification_docs_accountant_insert on storage.objects
  for insert with check (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.verification_requests vr
      where vr.id::text = (storage.foldername(name))[1]
        and (vr.accountant_id = auth.uid() or is_admin())
    )
  );
