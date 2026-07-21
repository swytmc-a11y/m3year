"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rejectListing } from "@/app/actions/listings";
import { emptyActionState } from "@/lib/action-state";

export function RejectListingForm({ listingId }: { listingId: string }) {
  const action = rejectListing.bind(null, listingId);
  const [state, formAction, pending] = useActionState(action, emptyActionState);
  const reasonError = state.fieldErrors?.reason?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Textarea
        name="reason"
        rows={2}
        placeholder="سبب الرفض (يظهر لصاحب الإعلان)"
        maxLength={1000}
        required
        aria-invalid={Boolean(reasonError)}
      />
      {reasonError ? (
        <p role="alert" className="text-xs text-amber">
          {reasonError}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-xs text-amber">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="self-start border-red-300 text-red-700 hover:bg-red-50"
      >
        {pending ? "جارٍ الرفض..." : "رفض"}
      </Button>
    </form>
  );
}
