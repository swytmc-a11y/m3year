-- Banners could only be uploaded images, which means every campaign needs a
-- designer and a round of exporting before it can go live. Most of them are
-- the same shape anyway: a headline, a line of detail, a call to action and
-- one big number doing the visual work.
--
-- A templated banner stores those parts and is drawn by the client, so the
-- operator writes a campaign in a form and it renders sharp on every screen
-- density. Uploaded images stay for the campaigns that genuinely want
-- artwork.
create type banner_render as enum ('image', 'template');
create type banner_template as enum ('giant_number', 'discount', 'category');

alter table public.promo_banners
  add column if not exists render banner_render not null default 'image',
  add column if not exists template banner_template,
  -- The oversized numeral behind the text: "15%", "30". Text rather than a
  -- number so it can carry its own unit.
  add column if not exists figure text,
  add column if not exists cta_label text,
  -- Which of the brand's two banner looks to use. Kept as a named choice
  -- rather than free hex so a campaign cannot invent an off-brand colour.
  add column if not exists tone text not null default 'lime';

alter table public.promo_banners
  add constraint promo_banners_tone_valid check (tone in ('lime', 'ink'));

-- image_url is required for an uploaded banner and meaningless for a
-- templated one, so it can no longer be NOT NULL at the column level.
alter table public.promo_banners alter column image_url drop not null;

create or replace function public.check_banner_render()
returns trigger
language plpgsql
as $$
begin
  if new.render = 'image' then
    if nullif(btrim(coalesce(new.image_url, '')), '') is null then
      raise exception 'banner_image_required';
    end if;
    -- Nothing template-shaped should linger on an image banner.
    new.template := null;
    new.figure := null;
  else
    if new.template is null then
      raise exception 'banner_template_required';
    end if;
    if nullif(btrim(coalesce(new.title, '')), '') is null then
      raise exception 'banner_title_required';
    end if;
    if new.template in ('giant_number', 'discount')
       and nullif(btrim(coalesce(new.figure, '')), '') is null then
      raise exception 'banner_figure_required';
    end if;
    new.image_url := null;
  end if;

  return new;
end;
$$;

drop trigger if exists check_banner_render on public.promo_banners;
create trigger check_banner_render
  before insert or update on public.promo_banners
  for each row execute function public.check_banner_render();
