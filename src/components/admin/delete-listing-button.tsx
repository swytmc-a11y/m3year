"use client";

import { adminDeleteListing } from "@/app/actions/listings";
import { Button } from "@/components/ui/button";

export function DeleteListingButton({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  return (
    <form
      action={adminDeleteListing}
      onSubmit={(e) => {
        if (
          !confirm(
            `حذف الإعلان "${listingTitle}" نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={listingId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="border-red-300 text-red-700 hover:bg-red-50"
      >
        حذف
      </Button>
    </form>
  );
}
