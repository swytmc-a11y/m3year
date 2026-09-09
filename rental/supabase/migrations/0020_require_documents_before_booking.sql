-- The app will stop a customer with incomplete details before they reach the
-- booking screen, but that check lives in the client and the REST API is
-- open to anyone holding a session — so the rule is enforced here too, where
-- it cannot be skipped.
--
-- What is required to book, matching the operator's decision:
--   * national id and a photo of it — always
--   * a licence photo — always (someone must drive the car)
--   * licence NUMBER — optional, so it is not required here
--   * the automated check must not have REJECTED the documents; 'pending' is
--     allowed through, because the check is dormant until an API key exists
--     and a missing key must not stop the business from taking bookings
create or replace function public.is_documents_ready()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select national_id is not null
        and id_document_path is not null
        and license_document_path is not null
        and coalesce(documents_check, 'pending') <> 'rejected'
     from public.profiles
     where id = (select auth.uid())),
    false
  );
$$;

revoke execute on function public.is_documents_ready() from public;
grant execute on function public.is_documents_ready() to anon, authenticated;

drop policy bookings_insert_own on public.bookings;
create policy bookings_insert_own on public.bookings
  for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and not public.is_blocked()
    and public.is_documents_ready()
  );
