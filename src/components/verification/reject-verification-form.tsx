"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { rejectVerification } from "@/app/actions/verification";
import { emptyActionState } from "@/lib/action-state";

export function RejectVerificationForm({ requestId }: { requestId: string }) {
  const action = rejectVerification.bind(null, requestId);
  const [state, formAction, pending] = useActionState(action, emptyActionState);
  const notesError = state.fieldErrors?.notes?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Textarea
        name="notes"
        rows={2}
        placeholder="سبب رفض التوثيق (يظهر لصاحب الإعلان)"
        maxLength={1000}
        required
      />
      {notesError ? <p className="text-xs text-amber">{notesError}</p> : null}
      {state.error ? <p className="text-xs text-amber">{state.error}</p> : null}
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="self-start border-red-300 text-red-700 hover:bg-red-50"
      >
        {pending ? "جارٍ الرفض..." : "رفض التوثيق"}
      </Button>
    </form>
  );
}
