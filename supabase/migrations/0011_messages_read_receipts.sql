-- Miyar (معيار) — Phase 5: allow a conversation participant to mark messages
-- they RECEIVED (not sent) as read. No UPDATE policy existed on messages
-- before this; the guard restricts the update to read_at only.

create policy "messages_update_mark_read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  );

create or replace function public.guard_message_read_only_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.conversation_id is distinct from old.conversation_id then
    raise exception 'not authorized to modify this message, only read_at'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger messages_guard_read_only_update
  before update on public.messages
  for each row execute function public.guard_message_read_only_update();

revoke execute on function public.guard_message_read_only_update() from public, anon, authenticated;
