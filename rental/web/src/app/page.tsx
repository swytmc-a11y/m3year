import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { SiteHeader } from "@/components/site-header";
import { MarketingCarCard, type MarketingCar } from "@/components/marketing/car-card";
import { MarketingPromoCard, type MarketingBanner } from "@/components/marketing/promo-card";
import { CAR_CATEGORY_OPTIONS } from "@/lib/cars/constants";

export const revalidate = 3600;

type HomeFeed = {
  copy?: Record<string, { title: string | null; subtitle: string | null } | undefined>;
  sections?: Record<string, MarketingCar[] | undefined>;
  banners?: MarketingBanner[];
  total_available?: number;
};

function copyFor(
  feed: HomeFeed | null,
  slug: string,
  fallback: { title: string; subtitle?: string },
) {
  const block = feed?.copy?.[slug];
  return {
    title: block?.title?.trim() || fallback.title,
    subtitle: block?.subtitle?.trim() || fallback.subtitle || null,
  };
}

/**
 * Marketing page for the web. It reads the same home_feed() the app does, so
 * the site and the app can never advertise a different fleet, different
 * headlines or a campaign that has already expired in one of them.
 */
export default async function HomePage() {
  const supabase = createPublicClient();

  const [{ data: feedData }, { data: branches }] = await Promise.all([
    supabase.rpc("home_feed"),
    supabase.from("branches").select("id, name, city").eq("is_active", true).limit(20),
  ]);

  const feed = (feedData ?? null) as HomeFeed | null;
  const picks = feed?.sections?.picks ?? [];
  const popular = feed?.sections?.popular ?? [];
  const banners = feed?.banners ?? [];
  const cities = [...new Set((branches ?? []).map((b) => b.city))];

  const hero = copyFor(feed, "home.hero", {
    title: "اختر سيارتك. وانطلق على راحتك.",
    subtitle: "خيارات أكثر، حجز أسهل، ورحلة تستحقها.",
  });

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="relative overflow-hidden rounded-3xl bg-[#111113] p-8 sm:p-14">
          <p className="mb-3 font-mono text-[12px] tracking-widest text-[#C8F250]">
            وجهتك القادمة تبدأ مع سمو
          </p>
          <h1 className="mb-4 max-w-2xl font-heading text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            {hero.title}
          </h1>
          <p className="mb-8 max-w-xl text-[15px] leading-8 text-white/60">{hero.subtitle}</p>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/auth"
              className="rounded-xl bg-[#C8F250] px-7 py-3.5 text-sm font-bold text-[#111113] transition-opacity hover:opacity-90"
            >
              ابدأ الحجز
            </Link>
            {feed?.total_available ? (
              <span className="rounded-xl border border-white/15 px-6 py-3.5 font-mono text-sm text-white/80">
                {feed.total_available} سيارة متاحة
              </span>
            ) : null}
          </div>

          {cities.length > 0 ? (
            <p className="mt-8 text-[13px] text-white/40">متوفّرون في: {cities.join(" · ")}</p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
        <h2 className="mb-4 font-heading text-xl font-extrabold text-ink">لكل رحلة، سيارة</h2>
        <div className="flex flex-wrap gap-2">
          {CAR_CATEGORY_OPTIONS.map((o) => (
            <span
              key={o.value}
              className="rounded-full border border-grid bg-white px-4 py-2 text-[13px] text-ink/70"
            >
              {o.label}
            </span>
          ))}
        </div>
      </section>

      {picks.length > 0 ? (
        <CarSection
          {...copyFor(feed, "home.picks", {
            title: "اختيارات تستاهل المشوار",
            subtitle: "سيارات مختارة لرحلتك القادمة",
          })}
          cars={picks}
        />
      ) : null}

      {banners.length > 0 ? (
        <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6">
          <div className="mb-5">
            <h2 className="font-heading text-xl font-extrabold text-ink">
              {copyFor(feed, "home.offers", { title: "مساحة أكبر للتوفير" }).title}
            </h2>
            <p className="mt-1 text-[13px] text-ink/50">
              {copyFor(feed, "home.offers", { title: "", subtitle: "عروض تنتهي، وفرص تستحق" }).subtitle}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {banners.map((b) => (
              <MarketingPromoCard key={b.id} banner={b} />
            ))}
          </div>
        </section>
      ) : null}

      {popular.length > 0 ? (
        <CarSection
          {...copyFor(feed, "home.popular", {
            title: "الأكثر حجزًا",
            subtitle: "ما يختاره عملاؤنا أكثر من غيره",
          })}
          cars={popular}
        />
      ) : null}

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border border-grid bg-white p-8 text-center">
          <h2 className="mb-2 font-heading text-xl font-extrabold text-ink">
            الحجز كله من التطبيق
          </h2>
          <p className="mb-6 text-[14px] leading-7 text-ink/60">
            أسعارنا شاملة الضريبة، بلا رسوم مفاجئة عند الاستلام. وكلما طالت المدة انخفض سعر اليوم.
          </p>
          <Link
            href="/auth"
            className="inline-block rounded-xl bg-[#C8F250] px-7 py-3.5 text-sm font-bold text-[#111113] transition-opacity hover:opacity-90"
          >
            ابدأ الحجز
          </Link>
        </div>
      </section>
    </div>
  );
}

function CarSection({
  title,
  subtitle,
  cars,
}: {
  title: string;
  subtitle: string | null;
  cars: MarketingCar[];
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6">
      <div className="mb-5">
        <h2 className="font-heading text-xl font-extrabold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-[13px] text-ink/50">{subtitle}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((car) => (
          <MarketingCarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  );
}
