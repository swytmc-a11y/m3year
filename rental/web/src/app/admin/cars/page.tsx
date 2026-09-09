import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setCarStatus } from "@/app/actions/cars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CarStatusBadge } from "@/components/cars/status-badge";
import { cn } from "@/lib/utils";
import {
  CAR_CATEGORY_LABELS,
  TRANSMISSION_LABELS,
  FUEL_LABELS,
  CAR_STATUS_LABELS,
  CONFIRMATION_MODE_LABELS,
  formatSar,
  carTitle,
  type CarStatus,
} from "@/lib/cars/constants";

const STATUS_FILTERS: { value: CarStatus | "all"; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "available", label: CAR_STATUS_LABELS.available },
  { value: "draft", label: CAR_STATUS_LABELS.draft },
  { value: "maintenance", label: CAR_STATUS_LABELS.maintenance },
  { value: "hidden", label: CAR_STATUS_LABELS.hidden },
];

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; branch?: string }>;
}) {
  const { status, branch } = await searchParams;
  const activeStatus =
    status && STATUS_FILTERS.some((f) => f.value === status) ? (status as CarStatus | "all") : "all";

  const supabase = await createClient();

  let query = supabase
    .from("cars")
    .select("*, branch:branches(id, name, city)")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (activeStatus !== "all") query = query.eq("status", activeStatus);
  if (branch) query = query.eq("branch_id", branch);

  const [{ data, error }, { data: branches }, { data: allStatuses }] = await Promise.all([
    query,
    supabase.from("branches").select("id, name, city").order("name"),
    supabase.from("cars").select("status"),
  ]);

  const cars = (data ?? []) as NonNullable<typeof data>;

  const counts = (allStatuses ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  const total = allStatuses?.length ?? 0;

  const noBranches = (branches ?? []).length === 0;

  function hrefFor(next: { status?: string; branch?: string }) {
    const p = new URLSearchParams();
    const s = next.status ?? (activeStatus === "all" ? undefined : activeStatus);
    const b = next.branch ?? branch;
    if (s && s !== "all") p.set("status", s);
    if (b) p.set("branch", b);
    const qs = p.toString();
    return `/admin/cars${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-admin-text">
          السيارات
          <span className="ms-2 text-base font-normal text-admin-text-muted">({total})</span>
        </h1>
        {noBranches ? null : (
          <Button asChild variant="brand" size="sm">
            <Link href="/admin/cars/new">إضافة سيارة</Link>
          </Button>
        )}
      </div>

      {noBranches ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          أضف فرعًا أولًا — كل سيارة يجب أن تتبع فرعًا.
          <div className="mt-3">
            <Button asChild variant="brand" size="sm">
              <Link href="/admin/branches/new">إضافة فرع</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex gap-1 overflow-x-auto sm:gap-2">
            {STATUS_FILTERS.map((f) => (
              <Link
                key={f.value}
                href={hrefFor({ status: f.value })}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  activeStatus === f.value
                    ? "bg-admin-primary text-admin-on-primary"
                    : "bg-admin-surface text-admin-text-muted hover:text-admin-text",
                )}
              >
                {f.label}
                {f.value !== "all" ? (
                  <span className="ms-1 opacity-70">({counts[f.value] ?? 0})</span>
                ) : null}
              </Link>
            ))}
          </div>

          <div className="mb-8 flex gap-1 overflow-x-auto sm:gap-2">
            <Link
              href={hrefFor({ branch: "" })}
              className={cn(
                "shrink-0 rounded-full border border-admin-border px-3 py-1.5 text-[13px] transition-colors",
                !branch ? "bg-admin-surface-2 text-admin-text" : "text-admin-text-muted hover:text-admin-text",
              )}
            >
              كل الفروع
            </Link>
            {(branches ?? []).map((b) => (
              <Link
                key={b.id}
                href={hrefFor({ branch: b.id })}
                className={cn(
                  "shrink-0 rounded-full border border-admin-border px-3 py-1.5 text-[13px] transition-colors",
                  branch === b.id
                    ? "bg-admin-surface-2 text-admin-text"
                    : "text-admin-text-muted hover:text-admin-text",
                )}
              >
                {b.name}
              </Link>
            ))}
          </div>

          {error ? (
            <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
              تعذّر تحميل السيارات الآن.
            </Card>
          ) : cars.length === 0 ? (
            <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
              لا توجد سيارات في هذا التصنيف.
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {cars.map((car) => (
                <Card key={car.id} className="border-admin-border bg-admin-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    {car.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={car.cover_image}
                        alt=""
                        className="h-20 w-32 shrink-0 rounded-lg bg-admin-bg object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg bg-admin-bg text-[11px] text-admin-text-muted">
                        بلا صورة
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold text-admin-text">{carTitle(car)}</h2>
                        <CarStatusBadge status={car.status} />
                      </div>
                      <p className="mt-1 text-[13px] text-admin-text-muted">
                        {car.branch?.name ?? "بلا فرع"} · {CAR_CATEGORY_LABELS[car.category]} ·{" "}
                        {TRANSMISSION_LABELS[car.transmission]} · {FUEL_LABELS[car.fuel]} ·{" "}
                        {car.seats} مقاعد
                      </p>
                      <p className="mt-1 font-mono text-[13px] font-bold text-admin-text">
                        {formatSar(Number(car.daily_price))}
                        <span className="font-normal text-admin-text-muted"> / يوم</span>
                        {car.monthly_price ? (
                          <span className="font-normal text-admin-text-muted">
                            {" "}
                            · شهري {formatSar(Number(car.monthly_price))}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-[12px] text-admin-text-muted">
                        {CONFIRMATION_MODE_LABELS[car.confirmation_mode]}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/cars/${car.id}/edit`}>تعديل</Link>
                      </Button>
                      {car.status !== "available" ? (
                        <form action={setCarStatus}>
                          <input type="hidden" name="id" value={car.id} />
                          <input type="hidden" name="status" value="available" />
                          <Button type="submit" variant="verify" size="sm">
                            إتاحة
                          </Button>
                        </form>
                      ) : (
                        <form action={setCarStatus}>
                          <input type="hidden" name="id" value={car.id} />
                          <input type="hidden" name="status" value="hidden" />
                          <Button type="submit" variant="ghost" size="sm">
                            إخفاء
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
