import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addCarToBlock, removeCarFromBlock, moveCarInBlock, type CuratableSlug } from "@/app/actions/curation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { carTitle, formatSar } from "@/lib/cars/constants";
import { cn } from "@/lib/utils";

const SECTIONS: { slug: CuratableSlug; label: string; fallback: string }[] = [
  { slug: "home.picks", label: "اختيارات تستاهل المشوار", fallback: "تلقائي حاليًا: سيارة واحدة من كل فئة" },
  { slug: "home.popular", label: "الأكثر حجزًا", fallback: "تلقائي حاليًا: الأكثر حجزًا فعليًا آخر 60 يومًا" },
  { slug: "home.economy", label: "اقتصادية وتكفي", fallback: "تلقائي حاليًا: الأقل سعرًا من فئة الاقتصادية" },
];

export default async function AdminCurationPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const active = SECTIONS.find((s) => s.slug === section) ?? SECTIONS[0];

  const supabase = await createClient();
  const [{ data: allCars }, { data: curated }] = await Promise.all([
    supabase
      .from("cars")
      .select("id, make, model, year, daily_price, status, branch:branches(name)")
      .order("make"),
    supabase
      .from("content_block_cars")
      .select("car_id, sort_order, car:cars(id, make, model, year, daily_price, cover_image, branch:branches(name))")
      .eq("block_slug", active.slug)
      .order("sort_order"),
  ]);

  const curatedIds = new Set((curated ?? []).map((r) => r.car_id));
  const pickableCars = (allCars ?? []).filter((c) => !curatedIds.has(c.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-8">
      <div>
        <h1 className="font-heading text-xl font-extrabold text-admin-text">تخصيص أقسام الرئيسية</h1>
        <p className="mt-1 text-sm text-admin-text-muted">
          اختر السيارات التي تظهر في كل قسم من الشاشة الرئيسية للتطبيق. قسم لم تُضِف له سيارات يبقى يعمل تلقائيًا كما
          هو — تحكّمك اختياري لكل قسم على حدة.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/admin/curation?section=${s.slug}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              s.slug === active.slug
                ? "border-admin-primary bg-admin-primary text-white"
                : "border-admin-border bg-admin-surface text-admin-text hover:bg-admin-bg",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <Card className="border-admin-border bg-admin-surface flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold text-admin-text">{active.label}</h2>
          {curated && curated.length === 0 ? (
            <span className="text-[12px] text-admin-text-muted">{active.fallback}</span>
          ) : (
            <span className="text-[12px] text-admin-text-muted">مخصَّص يدويًا — {curated?.length} سيارة</span>
          )}
        </div>

        {curated && curated.length > 0 ? (
          <div className="flex flex-col gap-2">
            {curated.map((row, i) => {
              const c = row.car;
              if (!c) return null;
              return (
                <div
                  key={row.car_id}
                  className="flex items-center gap-3 rounded-lg border border-admin-border bg-admin-bg p-3"
                >
                  {c.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_image} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-16 shrink-0 rounded bg-admin-surface" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-admin-text">{carTitle(c)}</p>
                    <p className="truncate text-[12px] text-admin-text-muted">
                      {c.branch?.name ?? "بلا فرع"} · {formatSar(Number(c.daily_price))}/يوم
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <form action={moveCarInBlock}>
                      <input type="hidden" name="block_slug" value={active.slug} />
                      <input type="hidden" name="car_id" value={row.car_id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        aria-label="تحريك للأعلى"
                        className="flex h-7 w-7 items-center justify-center rounded text-admin-text hover:bg-admin-surface disabled:opacity-30"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveCarInBlock}>
                      <input type="hidden" name="block_slug" value={active.slug} />
                      <input type="hidden" name="car_id" value={row.car_id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={i === curated.length - 1}
                        aria-label="تحريك للأسفل"
                        className="flex h-7 w-7 items-center justify-center rounded text-admin-text hover:bg-admin-surface disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={removeCarFromBlock}>
                      <input type="hidden" name="block_slug" value={active.slug} />
                      <input type="hidden" name="car_id" value={row.car_id} />
                      <Button type="submit" variant="ghost" size="sm">
                        حذف
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-admin-border p-4 text-center text-sm text-admin-text-muted">
            لا سيارات مخصَّصة لهذا القسم — يعمل تلقائيًا. أضف سيارة لتبدأ التحكم اليدوي.
          </p>
        )}

        <form action={addCarToBlock} className="flex flex-wrap items-center gap-2 border-t border-admin-border pt-4">
          <input type="hidden" name="block_slug" value={active.slug} />
          <select
            name="car_id"
            required
            defaultValue=""
            className="h-11 min-w-[220px] flex-1 rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text"
          >
            <option value="" disabled>
              اختر سيارة لإضافتها...
            </option>
            {pickableCars.map((c) => (
              <option key={c.id} value={c.id}>
                {carTitle(c)} — {c.branch?.name ?? "بلا فرع"}
                {c.status !== "available" ? " (غير متاحة حاليًا)" : ""}
              </option>
            ))}
          </select>
          <Button type="submit" variant="brand" size="sm">
            إضافة
          </Button>
        </form>
      </Card>
    </div>
  );
}
