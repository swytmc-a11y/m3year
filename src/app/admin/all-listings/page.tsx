import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adminSetVerification } from "@/app/actions/listings";
import { adminSetFranchiseVerification } from "@/app/actions/franchises";
import { DeleteListingButton } from "@/components/admin/delete-listing-button";
import { DeleteFranchiseButton } from "@/components/admin/delete-franchise-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { VerifiedBadge } from "@/components/listings/verified-badge";
import { AdminTypeTabs, type CatalogueType } from "@/components/admin/type-tabs";
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
import { formatSarRange, type Franchise } from "@/lib/franchises/constants";

type ListingWithOwner = Listing & { owner: { full_name: string | null } | null };
type FranchiseWithOwner = Franchise & { owner: { full_name: string | null } | null };

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
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const { type: typeParam, status } = await searchParams;
  const type: CatalogueType = typeParam === "franchise" ? "franchise" : "investment";
  const activeFilter =
    status && STATUS_FILTERS.some((f) => f.value === status)
      ? (status as ListingStatus | "all")
      : "all";

  const supabase = await createClient();
  const table = type === "franchise" ? "franchises" : "listings";

  let query = supabase
    .from(table)
    .select("*, owner:profiles(full_name)")
    .order("created_at", { ascending: false });
  if (activeFilter !== "all") query = query.eq("status", activeFilter);

  const [{ data, error }, { data: allStatuses }] = await Promise.all([
    query,
    supabase.from(table).select("status"),
  ]);

  const counts = (allStatuses ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});
  const total = allStatuses?.length ?? 0;
  const pendingReview = counts.pending_review ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">
        لوحة الإدارة
      </div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-2xl font-extrabold text-admin-text">
          {type === "franchise" ? "كل الامتيازات" : "كل الإعلانات"}
          <span className="ms-2 text-base font-normal text-admin-text-muted">({total})</span>
        </h1>
        {pendingReview ? (
          <Link
            href={`/admin/listings${type === "franchise" ? "?type=franchise" : ""}`}
            className="text-[13px] font-bold text-admin-amber hover:underline"
          >
            {pendingReview} بانتظار المراجعة ←
          </Link>
        ) : null}
      </div>
      <p className="mb-6 text-[13px] text-admin-text-muted">
        {type === "franchise"
          ? "تحكّم كامل بأي امتياز: تعديل، حذف، أو توثيق/إلغاء توثيق مباشرة."
          : "تحكّم كامل بأي إعلان: تعديل، حذف، أو توثيق/إلغاء توثيق مباشرة — بلا المرور بتدفّق التوثيق المحاسبي المعتاد."}
      </p>

      <AdminTypeTabs
        basePath="/admin/all-listings"
        type={type}
        otherParams={activeFilter !== "all" ? { status: activeFilter } : undefined}
      />

      <div className="mb-8 flex gap-1 overflow-x-auto sm:gap-2">
        {STATUS_FILTERS.map((f) => {
          const params = new URLSearchParams();
          if (type === "franchise") params.set("type", "franchise");
          if (f.value !== "all") params.set("status", f.value);
          const qs = params.toString();
          return (
            <Link
              key={f.value}
              href={`/admin/all-listings${qs ? `?${qs}` : ""}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                activeFilter === f.value
                  ? "bg-admin-primary text-admin-on-primary"
                  : "bg-admin-surface text-admin-text-muted hover:text-admin-text",
              )}
            >
              {f.label}
              {f.value !== "all" ? <span className="ms-1 opacity-70">({counts[f.value] ?? 0})</span> : null}
            </Link>
          );
        })}
      </div>

      {error ? (
        <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
          تعذّر تحميل القائمة الآن. حدّث الصفحة أو حاول لاحقًا.
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
          لا توجد نتائج في هذا التصنيف.
        </Card>
      ) : type === "franchise" ? (
        <div className="flex flex-col gap-4">
          {(data as unknown as FranchiseWithOwner[]).map((franchise) => (
            <AllFranchisesRow key={franchise.id} franchise={franchise} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {(data as unknown as ListingWithOwner[]).map((listing) => (
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
    <Card className="border-admin-border bg-admin-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-admin-text">{listing.title}</h2>
          <p className="mt-1 text-[13px] text-admin-text-muted">
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city} ·{" "}
            {listing.owner?.full_name || "مالك بلا اسم"} · أُنشئ في {formatDate(listing.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ListingStatusBadge status={listing.status} />
          {isVerified ? <VerifiedBadge /> : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 border-y border-dashed border-admin-border py-3 sm:gap-8">
        <div>
          <div className="text-xs text-admin-text-muted">الإيراد الشهري</div>
          <div className="font-mono font-semibold text-admin-text">{formatSar(listing.monthly_revenue)}</div>
        </div>
        <div>
          <div className="text-xs text-admin-text-muted">النسبة المطروحة</div>
          <div className="font-mono font-semibold text-admin-amber">
            {formatPercentage(listing.offered_percentage)}
          </div>
        </div>
        {listing.asking_price != null ? (
          <div>
            <div className="text-xs text-admin-text-muted">
              السعر المطلوب{listing.price_negotiable ? " (قابل للتفاوض)" : ""}
            </div>
            <div className="font-mono font-semibold text-admin-text">{formatSar(listing.asking_price)}</div>
          </div>
        ) : null}
      </div>

      {listing.status === "rejected" && listing.rejection_reason ? (
        <p className="mb-5 rounded-lg bg-admin-danger-tint px-3 py-2 text-[13px] text-admin-danger">
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
          <Button type="submit" variant={isVerified ? "ghost" : "verify"} size="sm">
            {isVerified ? "إلغاء التوثيق" : "توثيق مباشر"}
          </Button>
        </form>

        <DeleteListingButton listingId={listing.id} listingTitle={listing.title} />
      </div>
    </Card>
  );
}

function AllFranchisesRow({ franchise }: { franchise: FranchiseWithOwner }) {
  const isVerified = franchise.verification_status === "verified";

  return (
    <Card className="border-admin-border bg-admin-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-admin-text">{franchise.brand_name}</h2>
          <p className="mt-1 text-[13px] text-admin-text-muted">
            قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city} ·{" "}
            {franchise.owner?.full_name || "مالك بلا اسم"} · أُنشئ في {formatDate(franchise.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <ListingStatusBadge status={franchise.status} />
          {isVerified ? <VerifiedBadge /> : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 border-y border-dashed border-admin-border py-3 sm:gap-8">
        <div>
          <div className="text-xs text-admin-text-muted">رسوم الامتياز</div>
          <div className="font-mono font-semibold text-admin-text">{formatSar(franchise.franchise_fee)}</div>
        </div>
        <div>
          <div className="text-xs text-admin-text-muted">الاستثمار المبدئي</div>
          <div className="font-mono font-semibold text-admin-amber">
            {formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max)}
          </div>
        </div>
      </div>

      {franchise.status === "rejected" && franchise.rejection_reason ? (
        <p className="mb-5 rounded-lg bg-admin-danger-tint px-3 py-2 text-[13px] text-admin-danger">
          سبب الرفض: {franchise.rejection_reason}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/all-franchises/${franchise.id}/edit`}>تعديل</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/franchises/${franchise.id}`}>معاينة عامة</Link>
        </Button>

        <form action={adminSetFranchiseVerification}>
          <input type="hidden" name="id" value={franchise.id} />
          <input type="hidden" name="verify" value={isVerified ? "0" : "1"} />
          <Button type="submit" variant={isVerified ? "ghost" : "verify"} size="sm">
            {isVerified ? "إلغاء التوثيق" : "توثيق مباشر"}
          </Button>
        </form>

        <DeleteFranchiseButton franchiseId={franchise.id} franchiseName={franchise.brand_name} />
      </div>
    </Card>
  );
}
