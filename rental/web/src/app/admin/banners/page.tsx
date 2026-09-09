import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleBannerActive, deleteBanner } from "@/app/actions/banners";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, CAR_CATEGORY_LABELS } from "@/lib/cars/constants";
import type { Tables } from "@/lib/supabase/database.types";

type Banner = Tables<"promo_banners">;

function describeTarget(b: Banner): string {
  switch (b.target_kind) {
    case "car":
      return "يفتح صفحة سيارة";
    case "branch":
      return "يفتح الفروع";
    case "category":
      return `يفتح فئة ${b.target_category ? CAR_CATEGORY_LABELS[b.target_category] : ""}`;
    case "coupon":
      return `يعرض رمز ${b.target_coupon_code}`;
    case "url":
      return "يفتح رابطًا خارجيًا";
    default:
      return "للعرض فقط";
  }
}

/**
 * A true-to-life miniature of the banner. A templated banner has no image
 * to show, and a grey rectangle in its place would tell the operator
 * nothing about what they just wrote — so the template is drawn here the
 * same way the app draws it.
 */
function BannerThumb({ banner }: { banner: Banner }) {
  if (banner.render === "image" && banner.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={banner.image_url} alt="" className="h-24 w-full rounded-lg object-cover sm:w-56" />
    );
  }

  const lime = banner.tone === "lime";
  return (
    <div
      className={`relative h-24 w-full overflow-hidden rounded-lg sm:w-56 ${
        lime ? "bg-[#EDF7D4]" : "bg-[#111113]"
      }`}
    >
      {banner.figure ? (
        <span
          aria-hidden="true"
          className={`absolute -bottom-3 left-2 select-none text-[64px] font-extrabold leading-none ${
            lime ? "text-[#C8F250]" : "text-white/10"
          }`}
        >
          {banner.figure}
        </span>
      ) : null}
      <span
        className={`absolute inset-x-3 top-3 text-right text-[12px] font-bold ${
          lime ? "text-[#111113]" : "text-white"
        }`}
      >
        {banner.title}
      </span>
    </div>
  );
}

function statusOf(b: Banner): { label: string; variant: "verify" | "muted" | "danger" } {
  const now = Date.now();
  if (!b.is_active) return { label: "موقوف", variant: "muted" };
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return { label: "منتهي", variant: "danger" };
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return { label: "مجدول", variant: "muted" };
  return { label: "ظاهر الآن", variant: "verify" };
}

export default async function AdminBannersPage() {
  const supabase = await createClient();

  // is_admin() in the select policy is what lets this page see scheduled and
  // stopped banners; a customer's query returns only what is live.
  const { data, error } = await supabase
    .from("promo_banners")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const banners = data ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>

      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-admin-text">البنرات الإعلانية</h1>
        <Button asChild variant="brand">
          <Link href="/admin/banners/new">بنر جديد</Link>
        </Button>
      </div>
      <p className="mb-6 text-sm text-admin-text-muted">
        تظهر أعلى الصفحة الرئيسية في التطبيق.
      </p>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل البنرات الآن.
        </Card>
      ) : banners.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد بنرات بعد. أضف بنرًا لعرض أحدث عروضك في مقدمة التطبيق.
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => {
            const status = statusOf(b);
            return (
              <Card key={b.id} className="border-admin-border bg-admin-surface">
                <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start">
                  <BannerThumb banner={b} />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-bold text-admin-text">
                        {b.title || "بلا عنوان"}
                      </span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    {b.subtitle ? (
                      <p className="mb-1 text-[12.5px] text-admin-text-muted">{b.subtitle}</p>
                    ) : null}

                    <p className="mb-1 text-[12.5px] text-admin-text-muted">{describeTarget(b)}</p>

                    <p className="mb-3 text-[12px] text-admin-text-muted">
                      {b.starts_at ? `من ${formatDate(b.starts_at)}` : "بلا تاريخ بدء"}
                      {" · "}
                      {b.ends_at ? `حتى ${formatDate(b.ends_at)}` : "بلا انتهاء"}
                      {" · "}
                      ترتيب {b.sort_order}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/admin/banners/${b.id}/edit`}>تعديل</Link>
                      </Button>
                      <form action={toggleBannerActive}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="active" value={b.is_active ? "false" : "true"} />
                        <Button type="submit" size="sm" variant="ghost">
                          {b.is_active ? "إيقاف" : "تفعيل"}
                        </Button>
                      </form>
                      <form action={deleteBanner}>
                        <input type="hidden" name="id" value={b.id} />
                        <Button type="submit" size="sm" variant="danger">
                          حذف
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
