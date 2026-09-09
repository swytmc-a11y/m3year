-- Fleet photos are marketing material: world-readable by design, written
-- only by the operator.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'car-images', 'car-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "car images readable by anyone"
  on storage.objects for select
  using (bucket_id = 'car-images');

create policy "car images written by admins"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'car-images' and public.is_admin());

create policy "car images updated by admins"
  on storage.objects for update to authenticated
  using (bucket_id = 'car-images' and public.is_admin())
  with check (bucket_id = 'car-images' and public.is_admin());

create policy "car images deleted by admins"
  on storage.objects for delete to authenticated
  using (bucket_id = 'car-images' and public.is_admin());
