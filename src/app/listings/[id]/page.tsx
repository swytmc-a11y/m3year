import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { VerifiedBadge } from "@/components/listings/verified-badge";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { Button } from "@/components/ui/button";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
} from "@/lib/listings/constants";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS returns the row if it is published, or if the viewer is its owner/admin.
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (!listing) {
    notFound();
  }

  const isVerified = listing.verification_status === "verified";
  const isPreview = listing.status !== "published";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="grid-bg flex-1 px-6 py-10 sm:px-12">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/listings"
            className="mb-6 inline-block text-sm text-ink/50 hover:text-ink"
          >
            ← كل المشاريع
          </Link>

          {isPreview ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-grid bg-white px-4 py-3 text-sm text-ink/60">
              <span>معاينة — هذا الإعلان غير منشور للعامة.</span>
              <ListingStatusBadge status={listing.status} />
            </div>
          ) : null}

          <div className="rounded-xl border border-grid bg-white p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-extrabold text-ink">
                  {listing.title}
                </h1>
                <p className="mt-1 text-sm text-ink/50">
                  قطاع {SECTOR_LABELS[listing.sector]} · {listing.city}
                </p>
              </div>
              {isVerified ? <VerifiedBadge /> : null}
            </div>

            <div className="mb-6 flex gap-10 border-y border-dashed border-grid py-5">
              <div>
                <div className="mb-1 text-xs text-ink/50">الإيراد الشهري</div>
                <div className="font-mono text-2xl font-semibold text-ink">
                  {formatSar(listing.monthly_revenue)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-ink/50">النسبة المطروحة</div>
                <div className="font-mono text-2xl font-semibold text-amber">
                  {formatPercentage(listing.offered_percentage)}
                </div>
              </div>
            </div>

            {listing.description ? (
              <p className="mb-6 whitespace-pre-line leading-8 text-ink/80">
                {listing.description}
              </p>
            ) : null}

            <div className="mb-6 text-[13px] text-ink/50">
              {isVerified && listing.verified_at
                ? `تحقق محاسبي: ${formatDate(listing.verified_at)}`
                : "لم يُوثّق هذا الإعلان ماليًا بعد."}
            </div>

            {isPreview ? null : (
              <div className="rounded-lg bg-paper p-4 text-center text-sm text-ink/60">
                {user
                  ? "التواصل الداخلي مع صاحب المشروع يُفعّل في مرحلة قادمة."
                  : "سجّل الدخول للتواصل مع صاحب المشروع (يُفعّل قريبًا)."}
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
            معيار منصة إعلانات وتوثيق فقط — صفقة الشراكة تتم خارج المنصة.
          </p>
        </div>
      </div>
    </div>
  );
}
