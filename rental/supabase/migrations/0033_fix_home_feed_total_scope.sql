-- total_available referenced the `base` CTE from the previous statement,
-- where it no longer exists — the whole call raised 42P01 rather than
-- returning a feed. Counted in its own statement instead.
--
-- The lesson worth keeping: a CTE lives for exactly one statement. Anything
-- a later statement in the same function needs has to be captured in a
-- variable or recomputed.
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
  -- When the customer has picked dates, a car they cannot have has no
  -- business on the home screen either.
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
  )
  select jsonb_object_agg(k, v) into v_cars
    from (
      -- A deliberate mix rather than a single ordering: one strong car from
      -- each category, so the first rail shows the range of the fleet
      -- instead of five economy sedans.
      select 'picks' as k, coalesce(jsonb_agg(to_jsonb(p) - 'rn' order by p.rn), '[]'::jsonb) as v
        from (
          select b.*, row_number() over (partition by b.category
                                         order by b.rating_avg desc nulls last,
                                                  b.daily_price asc) as rn
            from base b
        ) p
       where p.rn = 1

      union all

      -- Real demand over the same window the badge uses, so the rail and
      -- the "most booked" label can never disagree. Falls back to views
      -- while the fleet is young and has no booking history yet.
      select 'popular',
             coalesce(jsonb_agg(to_jsonb(q) - 'n' order by q.n desc, q.view_count desc), '[]'::jsonb)
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

      union all

      select 'economy',
             coalesce(jsonb_agg(to_jsonb(e) order by e.daily_price), '[]'::jsonb)
        from (
          select b.* from base b
           where b.category = 'economy'
           order by b.daily_price
           limit 6
        ) e
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
