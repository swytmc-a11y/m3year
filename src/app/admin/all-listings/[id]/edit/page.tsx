import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateListing } from "@/app/actions/listings";
import { ListingForm } from "@/components/listings/listing-form";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { Card } from "@/components/ui/card";

export default async function AdminEditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!listing) notFound();

  const updateAction = updateListing.bind(null, listing.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/admin/all-listings"
        className="mb-6 inline-block text-sm text-ink/50 hover:text-ink"
      >
        ← كل الإعلانات
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          تعديل الإعلان (كمدير)
        </h1>
        <ListingStatusBadge status={listing.status} />
      </div>

      <Card>
        <ListingForm action={updateAction} listing={listing} isAdmin />
      </Card>
    </div>
  );
}
