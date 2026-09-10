-- The rental contract.
--
-- The contract itself is signed on paper at the branch — that stays as it is.
-- What was missing is the customer's copy: once the car is handed over, staff
-- upload the signed contract here and it appears in the customer's booking.
-- Before handover there is nothing to show, so the customer sees nothing.

create table public.booking_contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  -- Path inside the private 'contracts' bucket, always <booking_id>/<file>.
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes integer,
  note text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index booking_contracts_uploaded_idx on public.booking_contracts (uploaded_at desc);

alter table public.booking_contracts enable row level security;

-- The customer sees their contract only once the rental has actually started.
-- A contract attached to a booking that has not been collected yet is a draft
-- from the customer's point of view, and showing it invites arguments about a
-- document neither side has signed.
create policy booking_contracts_select_own on public.booking_contracts
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
       where b.id = booking_contracts.booking_id
         and b.customer_id = (select auth.uid())
         and b.status in ('active', 'completed')
    )
  );

create policy booking_contracts_admin_write on public.booking_contracts
  for all using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------- storage ---
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts', 'contracts', false, 16777216,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- Only staff put contracts in. A customer uploading into this bucket would be
-- filing their own version of the agreement.
create policy "contracts written by admins"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts' and public.is_admin());

create policy "contracts replaced by admins"
  on storage.objects for update to authenticated
  using (bucket_id = 'contracts' and public.is_admin())
  with check (bucket_id = 'contracts' and public.is_admin());

create policy "contracts deleted by admins"
  on storage.objects for delete to authenticated
  using (bucket_id = 'contracts' and public.is_admin());

create policy "contracts readable by admins"
  on storage.objects for select to authenticated
  using (bucket_id = 'contracts' and public.is_admin());

-- The customer reads the object only under the same condition as the row:
-- their own booking, and only once it is active or completed. The folder is
-- the booking id, which is what ties an object back to a booking.
create policy "contracts readable by the renter after pickup"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'contracts'
    and exists (
      select 1 from public.bookings b
       where b.id::text = (storage.foldername(name))[1]
         and b.customer_id = (select auth.uid())
         and b.status in ('active', 'completed')
    )
  );
