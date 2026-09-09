import { CAR_CATEGORY_LABELS, type CarCategory } from "@/lib/cars/constants";

export type MarketingCar = {
  id: string;
  make: string;
  make_latin: string | null;
  model: string;
  year: number;
  category: CarCategory;
  transmission: string;
  seats: number;
  daily_price: number | string;
  cover_image: string | null;
  rating_avg: number | string | null;
  rating_count: number;
  badge?: string | null;
  branch?: { name: string } | null;
};

/** Same vocabulary as the app's card — both read car_badges(). */
const BADGES: Record<string, { label: string; accent: boolean }> = {
  most_booked: { label: "الأكثر حجزًا", accent: true },
  top_rated: { label: "الأعلى تقييمًا", accent: true },
  smart_choice: { label: "خيار ذكي", accent: false },
  family: { label: "للرحلات العائلية", accent: false },
  unlimited_km: { label: "كيلومترات بلا حد", accent: false },
  extra_km: { label: "كيلومترات إضافية", accent: false },
};

const TRANSMISSION: Record<string, string> = { automatic: "أوتوماتيك", manual: "عادي" };

export function MarketingCarCard({ car }: { car: MarketingCar }) {
  const badge = car.badge ? BADGES[car.badge] : undefined;
  const rating = car.rating_avg == null ? null : Number(car.rating_avg);

  return (
    <article className="overflow-hidden rounded-2xl border border-grid bg-white">
      {/* The same neutral well as the app, so a studio cut-out and an
          ordinary photo sit on the card as the same kind of object. */}
      <div className="relative flex h-40 items-center justify-center bg-[#F2F2EF]">
        {car.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={car.cover_image}
            alt={`${car.make} ${car.model}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[12px] text-ink/40">لا توجد صورة</span>
        )}

        {badge ? (
          <span
            className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              badge.accent
                ? "bg-[#C8F250] text-[#111113]"
                : "border border-grid bg-white text-ink/60"
            }`}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading text-[15px] font-extrabold text-ink">
              {car.make} {car.model}
            </h3>
            <span className="font-mono text-[12px] text-ink/45">{car.year}</span>
          </div>
          <p className="mt-0.5 text-[12px] text-ink/50">
            {car.make_latin ? `${car.make_latin} · ` : ""}
            {CAR_CATEGORY_LABELS[car.category]}
          </p>
        </div>

        <p className="text-[11.5px] text-ink/50">
          {TRANSMISSION[car.transmission] ?? car.transmission} · {car.seats} ركاب
        </p>

        <div className="border-t border-grid pt-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-[22px] font-bold text-ink">
              {Math.round(Number(car.daily_price))}
            </span>
            <span className="text-[11px] text-ink/50">ر.س / يوم</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-ink/50">
          <span className="truncate">{car.branch?.name ?? ""}</span>
          {rating != null && car.rating_count > 0 ? (
            <span className="shrink-0 font-mono font-bold text-ink">
              ★ {rating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
