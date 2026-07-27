import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { VerifiedBadge } from "@/components/listings/verified-badge";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { Button } from "@/components/ui/button";
import { SECTOR_LABELS } from "@/lib/listings/constants";
import { formatSar, formatSarRange, formatDate } from "@/lib/franchises/constants";

export default async function FranchiseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: franchise } = await supabase
    .from("franchises")
    .select("*")
    .eq("id", id)
    .single();

  if (!franchise) {
    notFound();
  }

  const isVerified = franchise.verification_status === "verified";
  const isPreview = franchise.status !== "published";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="grid-bg flex-1 px-6 py-10 sm:px-12">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/franchises"
            className="mb-6 inline-block text-sm text-ink/50 hover:text-ink"
          >
            ← كل الامتيازات
          </Link>

          {isPreview ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-grid bg-white px-4 py-3 text-sm text-ink/60">
              <span>معاينة — هذا الامتياز غير منشور للعامة.</span>
              <ListingStatusBadge status={franchise.status} />
            </div>
          ) : null}

          <div className="rounded-xl border border-grid bg-white p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-extrabold text-ink">
                  {franchise.brand_name}
                </h1>
                <p className="mt-1 text-sm text-ink/50">
                  قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city}
                </p>
              </div>
              {isVerified ? <VerifiedBadge /> : null}
            </div>

            <div className="mb-6 flex flex-wrap gap-10 border-y border-dashed border-grid py-5">
              <div>
                <div className="mb-1 text-xs text-ink/50">رسوم الامتياز</div>
                <div className="font-mono text-2xl font-semibold text-ink">
                  {formatSar(franchise.franchise_fee)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-ink/50">الاستثمار المبدئي</div>
                <div className="font-mono text-2xl font-semibold text-amber">
                  {formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max)}
                </div>
              </div>
              {franchise.royalty_percentage != null ? (
                <div>
                  <div className="mb-1 text-xs text-ink/50">نسبة الإتاوة</div>
                  <div className="font-mono text-2xl font-semibold text-ink">
                    {franchise.royalty_percentage}٪
                  </div>
                </div>
              ) : null}
            </div>

            {franchise.description ? (
              <p className="mb-6 whitespace-pre-line leading-8 text-ink/80">
                {franchise.description}
              </p>
            ) : null}

            <div className="mb-6 flex flex-col gap-1 text-[13px] text-ink/50">
              {franchise.current_branches_count != null ? (
                <div>عدد الفروع الحالية: {franchise.current_branches_count}</div>
              ) : null}
              {franchise.founding_year != null ? (
                <div>سنة تأسيس العلامة: {franchise.founding_year}</div>
              ) : null}
              {franchise.required_space_sqm != null ? (
                <div>المساحة المطلوبة: {franchise.required_space_sqm} م²</div>
              ) : null}
              {franchise.required_employees_count != null ? (
                <div>عدد الموظفين المطلوب: {franchise.required_employees_count}</div>
              ) : null}
              {franchise.expected_payback_months != null ? (
                <div>مدة استرداد رأس المال: {franchise.expected_payback_months} شهرًا</div>
              ) : null}
              <div>تدريب المشغّل: {franchise.training_provided ? "متاح" : "غير متاح"}</div>
              {franchise.operational_support ? (
                <div>الدعم التشغيلي: {franchise.operational_support}</div>
              ) : null}
              {franchise.marketing_support ? (
                <div>الدعم التسويقي: {franchise.marketing_support}</div>
              ) : null}
              <div>
                {isVerified && franchise.verified_at
                  ? `تحقق محاسبي: ${formatDate(franchise.verified_at)}`
                  : "لم يُوثّق هذا الامتياز ماليًا بعد."}
              </div>
            </div>

            {isPreview ? null : (
              <div className="rounded-lg bg-paper p-4 text-center text-sm text-ink/60">
                {user
                  ? "التواصل الداخلي مع صاحب الامتياز يُفعّل في مرحلة قادمة."
                  : "سجّل الدخول للتواصل مع صاحب الامتياز (يُفعّل قريبًا)."}
                {!user ? (
                  <div className="mt-3">
                    <Button asChild size="sm">
                      <Link href="/auth">تسجيل الدخول</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-ink/40">
            معيار منصة إعلانات وتوثيق فقط — اتفاقية الامتياز تتم خارج المنصة.
          </p>
        </div>
      </div>
    </div>
  );
}
