import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approveListing } from "@/app/actions/listings";
import { RejectListingForm } from "@/components/listings/reject-listing-form";
import { TrustFieldsPanel } from "@/components/listings/trust-fields-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
  type ListingConfidential,
} from "@/lib/listings/constants";

export default async function AdminListingsPage() {
  const supabase = await createClient();

  // Admin RLS policy lets admins read every listing; filter to the queue.
  const { data: listings, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  // Confidential legal-entity details (entity type + CR number) live in a
  // separate table; admins may read them via is_admin() in RLS. Fetch the
  // matching rows in one query and index by listing_id for the review cards.
  const listingIds = (listings ?? []).map((l) => l.id);
  const { data: confidentialRows } = listingIds.length
    ? await supabase
        .from("listing_confidential")
        .select("*")
        .in("listing_id", listingIds)
    : { data: [] as ListingConfidential[] };

  const confidentialByListing = new Map(
    (confidentialRows ?? []).map((c) => [c.listing_id, c]),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
        لوحة الإدارة
      </div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-ink">
        إعلانات بانتظار المراجعة
        {listings && listings.length > 0 ? (
          <span className="ms-2 text-base font-normal text-ink/40">
            ({listings.length})
          </span>
        ) : null}
      </h1>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل قائمة المراجعة الآن. حدّث الصفحة أو حاول لاحقًا.
        </Card>
      ) : !listings || listings.length === 0 ? (
        <Card className="text-center text-ink/60">
          لا توجد إعلانات بانتظار المراجعة حاليًا.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((listing) => (
            <ReviewRow
              key={listing.id}
              listing={listing}
              confidential={confidentialByListing.get(listing.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewRow({
  listing,
  confidential,
}: {
  listing: Listing;
  confidential: ListingConfidential | null;
}) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{listing.title}</h2>
          <p className="mt-1 text-[13px] text-ink/50">
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city} · قُدّم في{" "}
            {formatDate(listing.created_at)}
          </p>
        </div>
        <Link
          href={`/listings/${listing.id}`}
          className="shrink-0 text-[13px] font-bold text-ink hover:underline"
        >
          معاينة ←
        </Link>
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
      </div>

      {listing.description ? (
        <p className="mb-5 whitespace-pre-line text-[13px] leading-7 text-ink/70">
          {listing.description}
        </p>
      ) : null}

      <div className="mb-5">
        <TrustFieldsPanel listing={listing} confidential={confidential} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <form action={approveListing}>
          <input type="hidden" name="id" value={listing.id} />
          <Button type="submit" variant="verify" size="sm">
            الموافقة والنشر
          </Button>
        </form>
        <div className="sm:w-72">
          <RejectListingForm listingId={listing.id} />
        </div>
      </div>
    </Card>
  );
}
