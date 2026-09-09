import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleCouponActive } from "@/app/actions/coupons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/cars/constants";

function describe(c: {
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_discount: number | null;
  min_total: number | null;
}): string {
  const value =
    c.discount_type === "percent" ? `${c.discount_value}٪` : `${c.discount_value} ر.س`;
  const cap = c.discount_type === "percent" && c.max_discount ? ` (بحد أقصى ${c.max_discount} ر.س)` : "";
  const min = c.min_total ? ` · للحجوزات من ${c.min_total} ر.س` : "";
  return `خصم ${value}${cap}${min}`;
}

/** Live, not yet started, finished, or switched off — said in one word. */
function statusOf(c: {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}): { label: string; variant: "verify" | "muted" | "danger" } {
  const now = Date.now();
  if (!c.is_active) return { label: "موقوف", variant: "muted" };
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return { label: "منتهي", variant: "danger" };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: "لم يبدأ", variant: "muted" };
  return { label: "فعّال", variant: "verify" };
}

export default async function AdminCouponsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  const coupons = data ?? [];

  // How many times each code has actually been used, counted from bookings
  // so a cancellation is reflected rather than a stale counter.
  const { data: usedRows } = await supabase
    .from("bookings")
    .select("coupon_id, status")
    .not("coupon_id", "is", null);

  const used = (usedRows ?? []).reduce<Record<string, number>>((acc, row) => {
    if (["cancelled", "rejected", "expired"].includes(row.status)) return acc;
    if (row.coupon_id) acc[row.coupon_id] = (acc[row.coupon_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-admin-text">رموز الخصم</h1>
        <Button asChild variant="brand">
          <Link href="/admin/coupons/new">رمز جديد</Link>
        </Button>
      </div>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل رموز الخصم الآن.
        </Card>
      ) : coupons.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد رموز خصم بعد. أنشئ رمزًا ترحيبيًا للعملاء الجدد.
        </Card>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => {
            const status = statusOf(c);
            const count = used[c.id] ?? 0;
            return (
              <Card key={c.id} className="border-admin-border bg-admin-surface">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-bold tracking-wide text-admin-text" dir="ltr">
                    {c.code}
                  </span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="ms-auto text-[12px] text-admin-text-muted">
                    استُخدم {count}
                    {c.max_redemptions ? ` من ${c.max_redemptions}` : ""}
                  </span>
                </div>

                <p className="mb-1 text-[13px] text-admin-text">{describe(c)}</p>

                {c.description ? (
                  <p className="mb-2 text-[12.5px] text-admin-text-muted">{c.description}</p>
                ) : null}

                <p className="mb-3 text-[12px] text-admin-text-muted">
                  {c.starts_at ? `من ${formatDate(c.starts_at)}` : "بلا تاريخ بدء"}
                  {" · "}
                  {c.ends_at ? `حتى ${formatDate(c.ends_at)}` : "بلا انتهاء"}
                  {" · "}
                  {c.max_per_customer} لكل عميل
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/admin/coupons/${c.id}/edit`}>تعديل</Link>
                  </Button>
                  <form action={toggleCouponActive}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={c.is_active ? "false" : "true"} />
                    <Button type="submit" size="sm" variant={c.is_active ? "danger" : "ghost"}>
                      {c.is_active ? "إيقاف" : "تفعيل"}
                    </Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
