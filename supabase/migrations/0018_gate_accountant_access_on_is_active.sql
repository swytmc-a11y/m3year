-- Security fix: deactivating an accountant (accountants.is_active = false)
-- previously did NOT revoke their access to verification requests, uploaded
-- financial statements, or confidential CR/entity data they were once
-- assigned to. These policies checked only `accountant_id = auth.uid()`
-- with no is_active gate, so a deactivated (e.g. fired for misconduct)
-- accountant retained full read/update access to historical stakeholder
-- data indefinitely. Add an is_active check to all three.

drop policy verification_requests_update_accountant_or_admin on public.verification_requests;
create policy verification_requests_update_accountant_or_admin on public.verification_requests
  for update
  using (
    is_admin()
    or (
      accountant_id = auth.uid()
      and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active)
    )
  )
  with check (
    is_admin()
    or (
      accountant_id = auth.uid()
      and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active)
    )
  );

drop policy verification_docs_stakeholders_select on storage.objects;
create policy verification_docs_stakeholders_select on storage.objects
  for select using (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.verification_requests vr
      where vr.id::text = (storage.foldername(name))[1]
        and (
          vr.owner_id = auth.uid()
          or is_admin()
          or (
            vr.accountant_id = auth.uid()
            and exists (select 1 from public.accountants a where a.id = auth.uid() and a.is_active)
          )
        )
    )
  );

drop policy listing_confidential_select_stakeholders on public.listing_confidential;
create policy listing_confidential_select_stakeholders on public.listing_confidential
  for select using (
    owner_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.verification_requests vr
      join public.accountants a on a.id = vr.accountant_id
      where vr.listing_id = listing_confidential.listing_id
        and vr.accountant_id = auth.uid()
        and a.is_active
    )
  );
