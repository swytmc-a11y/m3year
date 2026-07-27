insert into storage.buckets (id, name, public) values ('franchise-photos', 'franchise-photos', true);

create policy "franchise_photos_owner_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'franchise-photos' and owner = auth.uid());

create policy "franchise_photos_owner_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'franchise-photos' and owner = auth.uid());
