-- Chat attachments: a message can now carry an image or file instead of (or
-- alongside) text. attachment_path stores the STORAGE PATH (not a public URL);
-- the client resolves it to a short-lived signed URL on render, since the
-- bucket is private and scoped to conversation participants.
alter table public.messages
  add column attachment_path text,
  add column attachment_type text
    check (attachment_type is null or attachment_type in ('image', 'file')),
  add column attachment_name text;

-- body was required + non-empty; allow attachment-only messages.
alter table public.messages alter column body drop not null;
alter table public.messages drop constraint messages_body_check;
alter table public.messages
  add constraint messages_body_check
    check (body is null or (char_length(body) >= 1 and char_length(body) <= 4000));
-- Every message must carry either text or an attachment.
alter table public.messages
  add constraint messages_content_present
    check (body is not null or attachment_path is not null);

-- Private bucket for chat attachments.
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- Only participants of the conversation named by the path's first folder
-- (the conversation id) may upload or read its attachments. A blocked user
-- cannot upload (mirrors messages_insert_participant).
create policy "message_attachments_participant_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and not public.is_blocked(auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
    )
  );

create policy "message_attachments_participant_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and (
      public.is_admin()
      or exists (
        select 1 from public.conversations c
        where c.id::text = (storage.foldername(name))[1]
          and (c.owner_id = auth.uid() or c.investor_id = auth.uid())
      )
    )
  );
