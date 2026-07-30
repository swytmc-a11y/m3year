import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approveListing } from "@/app/actions/listings";
import { approveFranchise } from "@/app/actions/franchises";
import { RejectListingForm } from "@/components/listings/reject-listing-form";
import { RejectFranchiseForm } from "@/components/franchises/reject-franchise-form";
import { TrustFieldsPanel } from "@/components/listings/trust-fields-panel";
import { FranchiseConfidentialPanel } from "@/components/franchises/franchise-confidential-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminTypeTabs, type CatalogueType } from "@/components/admin/type-tabs";
import {
  SECTOR_LABELS,
  formatSar,
  formatPercentage,
  formatDate,
  type Listing,
  type ListingConfidential,
} from "@/lib/listings/constants";
import {
  formatSarRange,
  type Franchise,
  type FranchiseConfidential,
} from "@/lib/franchises/constants";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const type: CatalogueType = typeParam === "franchise" ? "franchise" : "investment";

  const supabase = await createClient();

  // Both counts are fetched regardless of the active tab, purely so the tab
  // labels can carry a live badge — mirrors the pattern in AdminNav.
  const [{ count: pendingListingsCount }, { count: pendingFranchisesCount }] =
    await Promise.all([
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      supabase.from("franchises").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    ]);

  const counts = {
    investment: pendingListingsCount ?? 0,
    franchise: pendingFranchisesCount ?? 0,
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">
        لوحة الإدارة
      </div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-admin-text">
        إعلانات بانتظار المراجعة
      </h1>

      <AdminTypeTabs basePath="/admin/listings" type={type} counts={counts} />

      {type === "investment" ? <PendingListings /> : <PendingFranchises />}
    </div>
  );
}

async function PendingListings() {
  const supabase = await createClient();

  const { data: listings, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const listingIds = (listings ?? []).map((l) => l.id);
  const { data: confidentialRows } = listingIds.length
    ? await supabase.from("listing_confidential").select("*").in("listing_id", listingIds)
    : { data: [] as ListingConfidential[] };

  const confidentialByListing = new Map((confidentialRows ?? []).map((c) => [c.listing_id, c]));

  if (error) {
    return (
      <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
        تعذّر تحميل قائمة المراجعة الآن. حدّث الصفحة أو حاول لاحقًا.
      </Card>
    );
  }

  if (!listings || listings.length === 0) {
    return (
      <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
        لا توجد إعلانات استثمارية بانتظار المراجعة حاليًا.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {listings.map((listing) => (
        <ListingReviewRow
          key={listing.id}
          listing={listing}
          confidential={confidentialByListing.get(listing.id) ?? null}
        />
      ))}
    </div>
  );
}

async function PendingFranchises() {
  const supabase = await createClient();

  const { data: franchises, error } = await supabase
    .from("franchises")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const franchiseIds = (franchises ?? []).map((f) => f.id);
  const { data: confidentialRows } = franchiseIds.length
    ? await supabase.from("franchise_confidential").select("*").in("franchise_id", franchiseIds)
    : { data: [] as FranchiseConfidential[] };

  const confidentialByFranchise = new Map((confidentialRows ?? []).map((c) => [c.franchise_id, c]));

  if (error) {
    return (
      <Card className="border-admin-border bg-admin-surface text-center text-sm text-admin-amber">
        تعذّر تحميل قائمة المراجعة الآن. حدّث الصفحة أو حاول لاحقًا.
      </Card>
    );
  }

  if (!franchises || franchises.length === 0) {
    return (
      <Card className="border-admin-border bg-admin-surface text-center text-admin-text-muted">
        لا توجد امتيازات بانتظار المراجعة حاليًا.
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {franchises.map((franchise) => (
        <FranchiseReviewRow
          key={franchise.id}
          franchise={franchise}
          confidential={confidentialByFranchise.get(franchise.id) ?? null}
        />
      ))}
    </div>
  );
}

function ListingReviewRow({
  listing,
  confidential,
}: {
  listing: Listing;
  confidential: ListingConfidential | null;
}) {
  return (
    <Card className="border-admin-border bg-admin-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-admin-text">{listing.title}</h2>
          <p className="mt-1 text-[13px] text-admin-text-muted">
            قطاع {SECTOR_LABELS[listing.sector]} · {listing.city} · قُدّم في{" "}
            {formatDate(listing.created_at)}
          </p>
        </div>
        <Link
          href={`/listings/${listing.id}`}
          className="shrink-0 text-[13px] font-bold text-admin-text hover:underline"
        >
          معاينة ←
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 border-y border-dashed border-admin-border py-3 sm:gap-8">
        <div>
          <div className="text-xs text-admin-text-muted">الإيراد الشهري</div>
          <div className="font-mono font-semibold text-admin-text">
            {formatSar(listing.monthly_revenue)}
          </div>
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
            <div className="font-mono font-semibold text-admin-text">
              {formatSar(listing.asking_price)}
            </div>
          </div>
        ) : null}
        {listing.monthly_profit != null ? (
          <div>
            <div className="text-xs text-admin-text-muted">
              صافي الربح الشهري{listing.show_profit ? "" : " (يظهر عند التواصل)"}
            </div>
            <div className="font-mono font-semibold text-admin-text">
              {formatSar(listing.monthly_profit)}
            </div>
          </div>
        ) : null}
      </div>

      {listing.description ? (
        <p className="mb-5 whitespace-pre-line text-[13px] leading-7 text-admin-text/70">
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

function FranchiseReviewRow({
  franchise,
  confidential,
}: {
  franchise: Franchise;
  confidential: FranchiseConfidential | null;
}) {
  return (
    <Card className="border-admin-border bg-admin-surface p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-admin-text">{franchise.brand_name}</h2>
          <p className="mt-1 text-[13px] text-admin-text-muted">
            قطاع {SECTOR_LABELS[franchise.sector]} · {franchise.city} · قُدّم في{" "}
            {formatDate(franchise.created_at)}
          </p>
        </div>
        <Link
          href={`/franchises/${franchise.id}`}
          className="shrink-0 text-[13px] font-bold text-admin-text hover:underline"
        >
          معاينة ←
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-6 border-y border-dashed border-admin-border py-3 sm:gap-8">
        <div>
          <div className="text-xs text-admin-text-muted">رسوم الامتياز</div>
          <div className="font-mono font-semibold text-admin-text">
            {formatSar(franchise.franchise_fee)}
          </div>
        </div>
        <div>
          <div className="text-xs text-admin-text-muted">الاستثمار المبدئي</div>
          <div className="font-mono font-semibold text-admin-amber">
            {formatSarRange(franchise.initial_investment_min, franchise.initial_investment_max)}
          </div>
        </div>
      </div>

      {franchise.description ? (
        <p className="mb-5 whitespace-pre-line text-[13px] leading-7 text-admin-text/70">
          {franchise.description}
        </p>
      ) : null}

      <div className="mb-5">
        <FranchiseConfidentialPanel confidential={confidential} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <form action={approveFranchise}>
          <input type="hidden" name="id" value={franchise.id} />
          <Button type="submit" variant="verify" size="sm">
            الموافقة والنشر
          </Button>
        </form>
        <div className="sm:w-72">
          <RejectFranchiseForm franchiseId={franchise.id} />
        </div>
      </div>
    </Card>
  );
}
