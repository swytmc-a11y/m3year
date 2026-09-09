-- Foundations for the redesigned home screen: the Latin brand line the new
-- card shows under the model name, and the editable marketing copy that
-- lets section headings and banner wording change without a deployment.

-- Cards read "TOYOTA · اقتصادية". Only the Arabic make was stored, and
-- transliterating in the client would put brand spelling in three codebases.
alter table public.cars
  add column if not exists make_latin text;

-- Backfill what the fleet actually holds today. Anything added later that
-- the operator leaves blank simply shows no Latin line — the card treats it
-- as optional rather than printing a guess.
update public.cars set make_latin = m.latin
  from (values
    ('تويوتا', 'TOYOTA'),
    ('هيونداي', 'HYUNDAI'),
    ('نيسان', 'NISSAN'),
    ('شيفروليه', 'CHEVROLET'),
    ('لكزس', 'LEXUS'),
    ('مرسيدس', 'MERCEDES'),
    ('كيا', 'KIA'),
    ('فورد', 'FORD'),
    ('جي إم سي', 'GMC'),
    ('هوندا', 'HONDA'),
    ('مازدا', 'MAZDA'),
    ('بي إم دبليو', 'BMW'),
    ('أودي', 'AUDI')
  ) as m(arabic, latin)
 where public.cars.make = m.arabic
   and public.cars.make_latin is null;

-- Marketing copy the operator can edit. Keyed by a stable slug the code
-- asks for, so a missing row falls back to the wording shipped in the app
-- rather than rendering an empty heading.
create table public.content_blocks (
  slug text primary key,
  title text,
  subtitle text,
  updated_at timestamptz not null default now(),

  constraint content_blocks_slug_format check (slug ~ '^[a-z0-9_.-]{2,64}$')
);

create trigger touch_content_blocks before update on public.content_blocks
  for each row execute function public.touch_updated_at();

alter table public.content_blocks enable row level security;

create policy content_blocks_select_public on public.content_blocks
  for select to anon, authenticated
  using (true);

create policy content_blocks_all_admin on public.content_blocks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.content_blocks (slug, title, subtitle) values
  ('home.hero',      'اختر سيارتك. وانطلق على راحتك.', 'خيارات أكثر، حجز أسهل، ورحلة تستحقها.'),
  ('home.picks',     'اختيارات تستاهل المشوار',        'سيارات مختارة لرحلتك القادمة'),
  ('home.popular',   'الأكثر حجزًا',                    'ما يختاره عملاؤنا أكثر من غيره'),
  ('home.offers',    'مساحة أكبر للتوفير',             'عروض تنتهي، وفرص تستحق'),
  ('home.economy',   'اقتصادية وتكفي',                  'أقل سعر لليوم، بلا مفاجآت')
on conflict (slug) do nothing;
