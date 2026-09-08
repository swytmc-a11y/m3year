import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { SiteHeader } from "@/components/site-header";
import { formatSar, CAR_CATEGORY_LABELS, type CarCategory } from "@/lib/cars/constants";

export const revalidate = 3600;

/**
 * Marketing page for the web. The product itself is the mobile app plus the
 * control panel — this exists to explain the service and hand visitors to
 * the app, so it stays deliberately thin.
 */
export default async function HomePage() {
  const supabase = createPublicClient();

  const [{ data: cars }, { data: branches }] = await Promise.all([
    supabase
      .from("cars")
      .select("id, make, model, year, category, daily_price, cover_image")
      .eq("status", "available")
      .order("sort_order")
      .limit(6),
    supabase.from("branches").select("id, name, city").eq("is_active", true).limit(20),
  ]);

  const cheapest = (cars ?? []).reduce<number | null>(
    (min, car) => (min === null || Number(car.daily_price) < min ? Number(car.daily_price) : min),
    null,
  );

  const cities = [...new Set((branches ?? []).map((b) => b.city))];

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="mb-4 font-mono text-[13px] tracking-widest text-verify">استأجر بثقة</p>
        <h1 className="mb-6 font-heading text-3xl font-extrabold leading-tight text-ink sm:text-5xl">
          سيارتك جاهزة،
          <br />
          واضحة السعر من أول لحظة
        </h1>
        <p className="mb-8 max-w-xl text-base leading-8 text-ink/70">
          أسعارنا شاملة الضريبة، بلا رسوم مفاجئة عند الاستلام. اختر سيارتك ومدتك،
          وكلما طالت المدة انخفض سعر اليوم.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="rounded-lg bg-ink px-6 py-3 text-sm font-bold text-white hover:bg-ink/90"
          >
            ابدأ الحجز
          </Link>
          {cheapest != null ? (
            <span className="rounded-lg border border-grid px-6 py-3 text-sm font-bold text-ink">
              من {formatSar(cheapest)} لليوم
            </span>
          ) : null}
        </div>

        {cities.length > 0 ? (
          <p className="mt-8 text-[13px] text-ink/50">
            متوفّرون في: {cities.join(" · ")}
          </p>
        ) : null}
      </section>

      {cars && cars.length > 0 ? (
        <section className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
          <h2 className="mb-6 font-heading text-xl font-extrabold text-ink">من أسطولنا</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <article key={car.id} className="overflow-hidden rounded-xl border border-grid bg-white">
                {car.cover_image ? (
                  // Remote fleet photos, so a plain img keeps this free of
                  // per-host image-optimizer configuration.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={car.cover_image}
                    alt={`${car.make} ${car.model}`}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="aspect-video w-full bg-paper" />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-ink">
                    {car.make} {car.model} {car.year}
                  </h3>
                  <p className="mt-1 text-[13px] text-ink/50">
                    {CAR_CATEGORY_LABELS[car.category as CarCategory]}
                  </p>
                  <p className="mt-3 font-mono font-bold text-ink">
                    {formatSar(Number(car.daily_price))}
                    <span className="text-[13px] font-normal text-ink/50"> / يوم</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
