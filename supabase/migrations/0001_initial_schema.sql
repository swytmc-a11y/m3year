-- Miyar (معيار) — Phase 2: core data model
-- Tables: profiles, accountants, listings, verification_requests,
--         conversations, messages, ratings, audit_log
--
-- Regulatory scope note: this schema deliberately has NO tables for executing
-- the equity/partnership sale itself (no contracts, ownership transfer, or
-- escrow of deal funds). The platform is only an advertising + messaging +
-- paid-verification layer. Do not add deal-execution tables without a CMA
-- licensing review.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('project_owner', 'investor', 'accountant', 'admin');
create type public.business_sector as enum ('cafe', 'restaurant', 'retail', 'services', 'other');
create type public.listing_status as enum ('draft', 'published', 'archived');
create type public.verification_status as enum ('none', 'pending', 'verified', 'rejected');
create type public.verification_request_status as enum ('requested', 'assigned', 'in_review', 'completed', 'rejected');

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Creates a profile row automatically when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'project_owner')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- Non-sensitive display info only. Phone stays in auth.users (never duplicated
-- here) so it is not exposed through any public/table read path.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'project_owner',
  full_name text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- accountants
-- Extends a profile with accountant-specific data. `is_active` gates whether
-- the accountant can receive verification requests and is admin-approved.
-- ---------------------------------------------------------------------------
create table public.accountants (
  id uuid primary key references public.profiles (id) on delete cascade,
  socpa_number text,
  bio text,
  is_active boolean not null default false,
  rating_avg numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accountants_set_updated_at
  before update on public.accountants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- listings (الإعلانات)
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  sector public.business_sector not null,
  city text not null check (char_length(city) between 2 and 60),
  monthly_revenue numeric(12, 2) not null check (monthly_revenue >= 0),
  offered_percentage numeric(5, 2) not null check (offered_percentage > 0 and offered_percentage <= 100),
  description text check (char_length(description) <= 5000),
  status public.listing_status not null default 'draft',
  verification_status public.verification_status not null default 'none',
  verified_at timestamptz,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_status_idx on public.listings (status);
create index listings_owner_idx on public.listings (owner_id);
create index listings_sector_idx on public.listings (sector);
create index listings_city_idx on public.listings (city);
create index listings_verification_idx on public.listings (verification_status);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- verification_requests (طلبات التوثيق)
-- ---------------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  accountant_id uuid references public.accountants (id) on delete set null,
  status public.verification_request_status not null default 'requested',
  fee_amount numeric(10, 2) check (fee_amount is null or fee_amount >= 0),
  verified_revenue numeric(12, 2) check (verified_revenue is null or verified_revenue >= 0),
  report_path text, -- path in the private storage bucket (populated in phase 4)
  notes text check (notes is null or char_length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index verification_requests_listing_idx on public.verification_requests (listing_id);
create index verification_requests_owner_idx on public.verification_requests (owner_id);
create index verification_requests_accountant_idx on public.verification_requests (accountant_id);
create index verification_requests_status_idx on public.verification_requests (status);

create trigger verification_requests_set_updated_at
  before update on public.verification_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations (محادثة بين صاحب المشروع وممول مهتم حول إعلان)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  investor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_distinct_parties check (owner_id <> investor_id),
  constraint conversations_unique_per_investor unique (listing_id, investor_id)
);

create index conversations_owner_idx on public.conversations (owner_id);
create index conversations_investor_idx on public.conversations (investor_id);
create index conversations_listing_idx on public.conversations (listing_id);

-- ---------------------------------------------------------------------------
-- messages (الرسائل الداخلية)
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

-- ---------------------------------------------------------------------------
-- ratings (التقييمات المتبادلة بعد التواصل)
-- ---------------------------------------------------------------------------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  rater_id uuid not null references public.profiles (id) on delete cascade,
  rated_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  score smallint not null check (score between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ratings_distinct_parties check (rater_id <> rated_id),
  constraint ratings_unique_per_pair_listing unique (rater_id, rated_id, listing_id)
);

create index ratings_rated_idx on public.ratings (rated_id);
create index ratings_rater_idx on public.ratings (rater_id);

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log (سجل تدقيق للعمليات الحساسة)
-- Written only through the security-definer public.log_audit() function.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_idx on public.audit_log (actor_id);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index audit_log_created_idx on public.audit_log (created_at);
