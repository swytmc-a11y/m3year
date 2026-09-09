-- Identity and licence details a branch needs before handing over a car.
--
-- These are collected once per customer, not per booking: a Saudi national ID
-- does not change between rentals, and asking again on every booking is
-- friction for no gain. The branch still verifies the physical documents at
-- pickup — what is stored here only decides whether a booking may be placed
-- at all.

create type document_check as enum (
  'pending',    -- uploaded, automated check has not run (or is not configured)
  'accepted',   -- the automated check recognised a valid document
  'rejected'    -- the automated check saw something that is not one
);

alter table public.profiles
  add column if not exists national_id text,
  add column if not exists license_number text,
  add column if not exists id_document_path text,
  add column if not exists license_document_path text,
  add column if not exists documents_check document_check,
  add column if not exists documents_check_note text,
  add column if not exists documents_checked_at timestamptz,
  -- Set by the operator when they review the documents at confirmation time.
  -- Distinct from the automated check: one is a machine's first pass, the
  -- other is a human accepting responsibility for the rental.
  add column if not exists documents_approved_at timestamptz,
  add column if not exists documents_approved_by uuid references auth.users(id);

-- A Saudi national ID / iqama is 10 digits. Enforced here rather than only in
-- the app so a malformed number cannot reach a branch as if it were checked.
alter table public.profiles
  add constraint profiles_national_id_format
  check (national_id is null or national_id ~ '^[0-9]{10}$');

-- The customer fills in their own identity fields, but must not be able to
-- award themselves an approval. guard_profile_privileges() already freezes
-- role, is_blocked and phone for non-operators; the verdict columns join them,
-- otherwise a customer could set documents_check to 'accepted' with a REST
-- call and skip the gate entirely.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or (select auth.uid()) is null then
    return new;
  end if;
  new.role := old.role;
  new.is_blocked := old.is_blocked;
  new.phone := old.phone;
  -- Verdicts are written by the checking function (service role) or an
  -- operator, never by the customer whose documents they describe.
  new.documents_check := old.documents_check;
  new.documents_check_note := old.documents_check_note;
  new.documents_checked_at := old.documents_checked_at;
  new.documents_approved_at := old.documents_approved_at;
  new.documents_approved_by := old.documents_approved_by;
  return new;
end;
$$;

-- Private bucket: unlike car photos, nothing here may be world-readable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-documents', 'customer-documents', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- Customers write only inside a folder named after their own user id, so one
-- customer cannot reach another's documents by guessing a path.
create policy "customer documents readable by owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "customer documents readable by admins"
  on storage.objects for select to authenticated
  using (bucket_id = 'customer-documents' and public.is_admin());

create policy "customer documents written by owner"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "customer documents replaced by owner"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Deletion is an operator action. A customer removing the documents behind a
-- booking a branch is about to honour would leave that branch with nothing.
create policy "customer documents deleted by admins"
  on storage.objects for delete to authenticated
  using (bucket_id = 'customer-documents' and public.is_admin());
