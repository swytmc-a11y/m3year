import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createListing } from "@/app/actions/listings";
import { ListingForm } from "@/components/listings/listing-form";
import { Card } from "@/components/ui/card";

export default async function NewListingPage() {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <Link
        href="/dashboard/listings"
        className="mb-6 inline-block text-sm text-ink/50 hover:text-ink"
      >
        ← إعلاناتي
      </Link>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink">
        إعلان جديد
      </h1>
      <p className="mb-8 text-sm text-ink/60">
        اعرض مشروعك أمام الشركاء الممولين المحتملين.
      </p>

      <Card>
        <ListingForm action={createListing} />
      </Card>
    </div>
  );
}
