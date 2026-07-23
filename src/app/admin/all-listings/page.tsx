import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSetVerification } from "@/app/actions/listings";
import { DeleteListingButton } from "@/components/admin/delete-listing-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { VerifiedBadge } from "@/components/listings/verified-badge";
import { cn } from "@/lib/utils";
import {
  SECTOR_LABELS,
  LISTING_STATUS_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
  type ListingStatus,
} from "@/lib/listings/constants";

type ListingWithOwner = Listing & {
  owner: { full_name: string | null } | null;
};

const STATUS_FILTERS: { value: ListingStatus | "all"; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "pending_review", label: LISTING_STATUS_LABELS.pending_review },
  { value: "published", label: LISTING_STATUS_LABELS.published },
  { value: "draft", label: LISTING_STATUS_LABELS.draft },
  { value: "rejected", label: LISTING_STATUS_LABELS.rejected },
  { value: "archived", label: LISTING_STATUS_LABELS.archived },
];

export default async function AdminAllListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter =
    status && STATUS_FILTERS.some((f) => f.value === status)
      ? (status as ListingStatus | "all")
      : "all";

  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select("*, owner:profiles(full_name)")
    .order("created_at", { ascending: false });

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data, error } = await query;
  const listings = data as unknown as ListingWithOwner[] | null;

  // Counts per status for the filter tabs + the review-queue callout, in one
  // lightweight query independent of the current filter.
  const { data: allStatuses } = await supabase.from("listings").select("status");
  const counts = (allStatuses ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const total = allStatuses?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
        لوحة الإدارة
      </div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          كل الإعلانات
          <span className="ms-2 text-base font-normal text-ink/40">
            ({total})
          </span>
        </h1>
        {counts.pending_review ? (
          <Link
            href="/admin/listings"
            className="text-[13px] font-bold text-amber hover:underline"
          >
            {counts.pending_review} بانتظار المراجعة ←
          </Link>
        ) : null}
      </div>
      <p className="mb-6 text-[13px] text-ink/50">
        تحكّم كامل بأي إعلان: تعديل، حذف، أو توثيق/إلغاء توثيق مباشرة — بلا
        المرور بتدفّق التوثيق المحاسبي المعتاد.
      </p>

      <div className="mb-8 flex gap-1 overflow-x-auto sm:gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/admin/all-listings" : `/admin/all-listings?status=${f.value}`}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              activeFilter === f.value
                ? "bg-ink text-white"
                : "bg-white text-ink/60 hover:text-ink",
            )}
          >
            {f.label}
            {f.value !== "all" ? (
              <span className="ms-1 opacity-60">
                ({counts[f.value] ?? 0})
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل الإعلانات الآن. حدّث الصفحة أو حاول لاحقًا.
        </Card>
      ) : !listings || listings.length === 0 ? (
        <Card className="text-center text-ink/60">
          لا توجد إعلانات في هذا التصنيف.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((listing) => (
            <AllListingsRow key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function AllListingsRow({ listing }: { listing: ListingWithOwner }) {
  const isVerified = listing.verification_status === "verified";

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{listing.title}</h2>
          <p className="mt-1 text-[13px] text-ink/50">
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city} ·{" "}
            {listing.owner?.full_name || "مالك بلا اسم"} · أُنشئ في{" "}
            {formatDate(listing.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ListingStatusBadge status={listing.status} />
          {isVerified ? <VerifiedBadge /> : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 border-y border-dashed border-grid py-3 sm:gap-8">
        <div>
          <div className="text-xs text-ink/50">الإيراد الشهري</div>
          <div className="font-mono font-semibold text-ink">
            {formatSar(listing.monthly_revenue)}
          </div>
        </div>
        <div>
          <div className="text-xs text-ink/50">النسبة المطروحة</div>
          <div className="font-mono font-semibold text-amber">
            {formatPercentage(listing.offered_percentage)}
          </div>
        </div>
        {listing.asking_price != null ? (
          <div>
            <div className="text-xs text-ink/50">
              السعر المطلوب{listing.price_negotiable ? " (قابل للتفاوض)" : ""}
            </div>
            <div className="font-mono font-semibold text-ink">
              {formatSar(listing.asking_price)}
            </div>
          </div>
        ) : null}
      </div>

      {listing.status === "rejected" && listing.rejection_reason ? (
        <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">
          سبب الرفض: {listing.rejection_reason}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/all-listings/${listing.id}/edit`}>تعديل</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/listings/${listing.id}`}>معاينة عامة</Link>
        </Button>

        <form action={adminSetVerification}>
          <input type="hidden" name="id" value={listing.id} />
          <input type="hidden" name="verify" value={isVerified ? "0" : "1"} />
          <Button
            type="submit"
            variant={isVerified ? "ghost" : "verify"}
            size="sm"
          >
            {isVerified ? "إلغاء التوثيق" : "توثيق مباشر"}
          </Button>
        </form>

        <DeleteListingButton listingId={listing.id} listingTitle={listing.title} />
      </div>
    </Card>
  );
}
