import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateListing } from "@/app/actions/listings";
import { ListingForm } from "@/components/listings/listing-form";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { Card } from "@/components/ui/card";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  // RLS already restricts SELECT to the owner/admin; this is a clarity guard.
  if (!listing || listing.owner_id !== user.id) {
    notFound();
  }

  const updateAction = updateListing.bind(null, listing.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link
        href="/dashboard/listings"
        className="mb-6 inline-block text-sm text-ink/50 hover:text-ink"
      >
        ← إعلاناتي
      </Link>
      <div className="mb-2 flex items-center gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          تعديل الإعلان
        </h1>
        <ListingStatusBadge status={listing.status} />
      </div>

      {listing.status === "rejected" && listing.rejection_reason ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="font-bold">سبب الرفض:</span>{" "}
          {listing.rejection_reason}
        </div>
      ) : (
        <p className="mb-8 text-sm text-ink/60">
          أي تعديل على إعلان منشور يعيده لقائمة المراجعة قبل إعادة نشره.
        </p>
      )}

      <Card>
        <ListingForm action={updateAction} listing={listing} />
      </Card>
    </div>
  );
}
