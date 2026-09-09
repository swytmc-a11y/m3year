-- Reviews existed as a table with policies and no interface at all. This
-- turns them into something the app can actually show: an aggregate on the
-- car and the branch, a display name that does not require reading another
-- customer's profile, and a moderation switch that is not "delete".

-- Hiding beats deleting: an abusive review stops being visible without
-- destroying the record behind a rating the operator may need to explain.
alter table public.reviews
  add column if not exists is_hidden boolean not null default false;

-- profiles_select_own means one customer can never read another's row, so a
-- review cannot join to its author at display time. The name is captured
-- here instead, by a trigger the customer cannot influence.
alter table public.reviews
  add column if not exists author_name text;

alter table public.cars
  add column if not exists rating_avg numeric(3, 2),
  add column if not exists rating_count integer not null default 0;

alter table public.branches
  add column if not exists rating_avg numeric(3, 2),
  add column if not exists rating_count integer not null default 0;

-- Shown as "أحمد م." — enough to read as a real person, not enough to
-- identify one. Runs as definer because the author's profile is not
-- readable by the author's own INSERT statement under RLS.
create or replace function public.set_review_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full text;
  v_parts text[];
begin
  select full_name into v_full from public.profiles where id = new.author_id;
  v_full := nullif(btrim(coalesce(v_full, '')), '');

  if v_full is null then
    new.author_name := 'عميل';
  else
    v_parts := regexp_split_to_array(v_full, '\s+');
    if array_length(v_parts, 1) = 1 then
      new.author_name := v_parts[1];
    else
      new.author_name := v_parts[1] || ' ' || left(v_parts[array_length(v_parts, 1)], 1) || '.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_review_author_name on public.reviews;
create trigger set_review_author_name
  before insert on public.reviews
  for each row execute function public.set_review_author_name();

-- Aggregates are recomputed rather than incremented: a hide/unhide flips a
-- row in or out of the average, and an incremental counter would drift.
-- Definer because a customer writing a review has no write access to cars.
create or replace function public.recalc_rating_aggregates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_car_ids uuid[];
  v_branch_ids uuid[];
begin
  v_car_ids := array_remove(array[new.car_id, old.car_id], null);
  v_branch_ids := array_remove(array[new.branch_id, old.branch_id], null);

  update public.cars c
     set rating_avg = agg.avg_rating,
         rating_count = agg.n
    from (
      select t.id,
             round(avg(r.rating)::numeric, 2) as avg_rating,
             count(r.id)::integer as n
        from unnest(v_car_ids) as t(id)
        left join public.reviews r
          on r.car_id = t.id and not r.is_hidden
       group by t.id
    ) agg
   where c.id = agg.id;

  update public.branches b
     set rating_avg = agg.avg_rating,
         rating_count = agg.n
    from (
      select t.id,
             round(avg(r.rating)::numeric, 2) as avg_rating,
             count(r.id)::integer as n
        from unnest(v_branch_ids) as t(id)
        left join public.reviews r
          on r.branch_id = t.id and not r.is_hidden
       group by t.id
    ) agg
   where b.id = agg.id;

  return null;
end;
$$;

drop trigger if exists recalc_rating_aggregates on public.reviews;
create trigger recalc_rating_aggregates
  after insert or update or delete on public.reviews
  for each row execute function public.recalc_rating_aggregates();

-- A hidden review must disappear for everyone except the operator.
drop policy if exists reviews_select_public on public.reviews;
create policy reviews_select_public on public.reviews
  for select to anon, authenticated
  using (not is_hidden or public.is_admin());

-- The moderation switch itself.
drop policy if exists reviews_update_admin on public.reviews;
create policy reviews_update_admin on public.reviews
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists reviews_car_id_idx on public.reviews (car_id) where not is_hidden;
create index if not exists reviews_branch_id_idx on public.reviews (branch_id) where not is_hidden;
