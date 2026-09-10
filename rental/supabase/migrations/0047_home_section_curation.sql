-- "اختيارات تستاهل المشوار" is hard-coded to one car per category (5 max,
-- whatever the fleet's actual size) and "الأكثر حجزًا" is pure booking
-- counts — neither had a way for an operator to just pick which cars show.
-- content_block_cars is that: an optional manual roster per section. When
-- it has rows for a slug, home_feed uses exactly those cars in the chosen
-- order; when it's empty, the section falls back to its existing computed
-- logic unchanged. So curating is opt-in per section, and an operator who
-- never touches this table sees no behaviour change at all.
create table public.content_block_cars (
  block_slug text not null references public.content_blocks(slug) on delete cascade,
  car_id uuid not null references public.cars(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (block_slug, car_id)
);

create index content_block_cars_slug_idx on public.content_block_cars (block_slug, sort_order);

alter table public.content_block_cars enable row level security;

-- Same shape as content_blocks itself: public read (the home feed needs
-- it), admin-only write.
create policy content_block_cars_select_public on public.content_block_cars
  for select to anon, authenticated
  using (true);

create policy content_block_cars_all_admin on public.content_block_cars
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- home_feed, rewritten so each of picks/popular/economy prefers a manual
-- roster (joined against `base`, so a curated-but-currently-unavailable-for
-- these-dates car silently drops out rather than showing a dead card) and
-- only falls back to the prior computed query when that roster is empty.
create or replace function public.home_feed(
  p_start date default null,
  p_end date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_taken uuid[] := '{}';
  v_cars jsonb;
  v_total integer;
  v_result jsonb;
begin
  if p_start is not null and p_end is not null then
    select coalesce(array_agg(x), '{}') into v_taken
      from public.cars_unavailable_between(p_start, p_end) x;
  end if;

  select count(*) into v_total
    from public.cars c
   where c.status = 'available'
     and not (c.id = any(v_taken));

  with badged as (
    select car_id, badge from public.car_badges() where badge is not null
  ),
  base as (
    select c.id, c.make, c.make_latin, c.model, c.year, c.category,
           c.transmission, c.fuel, c.seats, c.daily_price, c.monthly_price,
           c.cover_image, c.rating_avg, c.rating_count, c.daily_km_limit,
           c.sort_order, c.created_at, c.view_count,
           bd.badge,
           jsonb_build_object('id', br.id, 'name', br.name, 'city', br.city) as branch
      from public.cars c
      join public.branches br on br.id = c.branch_id
      left join badged bd on bd.car_id = c.id
     where c.status = 'available'
       and not (c.id = any(v_taken))
  ),
  manual as (
    select cbc.block_slug, b.*, cbc.sort_order as manual_order
      from public.content_block_cars cbc
      join base b on b.id = cbc.car_id
  )
  select jsonb_object_agg(k, v) into v_cars
    from (
      select 'picks' as k,
        case when exists (select 1 from manual m where m.block_slug = 'home.picks')
          then coalesce((
                 select jsonb_agg(to_jsonb(m) - 'block_slug' - 'manual_order' order by m.manual_order)
                   from manual m where m.block_slug = 'home.picks'
               ), '[]'::jsonb)
          else coalesce((
                 select jsonb_agg(to_jsonb(p) - 'rn' order by p.rn)
                   from (
                     select b.*, row_number() over (partition by b.category
                                                    order by b.rating_avg desc nulls last,
                                                             b.daily_price asc) as rn
                       from base b
                   ) p
                  where p.rn = 1
               ), '[]'::jsonb)
        end as v

      union all

      select 'popular',
        case when exists (select 1 from manual m where m.block_slug = 'home.popular')
          then coalesce((
                 select jsonb_agg(to_jsonb(m) - 'block_slug' - 'manual_order' order by m.manual_order)
                   from manual m where m.block_slug = 'home.popular'
               ), '[]'::jsonb)
          else coalesce((
                 select jsonb_agg(to_jsonb(q) - 'n' order by q.n desc, q.view_count desc)
                   from (
                     select b.*, coalesce((
                              select count(*) from public.bookings bk
                               where bk.car_id = b.id
                                 and bk.created_at >= now() - interval '60 days'
                                 and bk.status not in ('cancelled','rejected','expired')
                            ), 0) as n
                       from base b
                      order by n desc, b.view_count desc
                      limit 6
                   ) q
               ), '[]'::jsonb)
        end

      union all

      select 'economy',
        case when exists (select 1 from manual m where m.block_slug = 'home.economy')
          then coalesce((
                 select jsonb_agg(to_jsonb(m) - 'block_slug' - 'manual_order' order by m.manual_order)
                   from manual m where m.block_slug = 'home.economy'
               ), '[]'::jsonb)
          else coalesce((
                 select jsonb_agg(to_jsonb(e) order by e.daily_price)
                   from (
                     select b.* from base b
                      where b.category = 'economy'
                      order by b.daily_price
                      limit 6
                   ) e
               ), '[]'::jsonb)
        end
    ) rails;

  select jsonb_build_object(
    'copy', coalesce((
       select jsonb_object_agg(cb.slug, jsonb_build_object('title', cb.title, 'subtitle', cb.subtitle))
         from public.content_blocks cb
    ), '{}'::jsonb),
    'sections', coalesce(v_cars, '{}'::jsonb),
    'banners', coalesce((
       select jsonb_agg(to_jsonb(pb) order by pb.sort_order, pb.created_at desc)
         from public.promo_banners pb
        where pb.is_active
          and (pb.starts_at is null or now() >= pb.starts_at)
          and (pb.ends_at is null or now() < pb.ends_at)
    ), '[]'::jsonb),
    'total_available', v_total
  ) into v_result;

  return v_result;
end;
$$;
