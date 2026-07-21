"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeVerification } from "@/app/actions/verification";
import { emptyActionState } from "@/lib/action-state";

export function CompleteVerificationForm({ requestId }: { requestId: string }) {
  const action = completeVerification.bind(null, requestId);
  const [state, formAction, pending] = useActionState(action, emptyActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg bg-paper p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`revenue-${requestId}`}>الإيراد الشهري الموثّق (ر.س)</Label>
        <Input
          id={`revenue-${requestId}`}
          name="verifiedRevenue"
          type="number"
          inputMode="decimal"
          min={0}
          dir="ltr"
          className="text-left font-mono"
          required
        />
        {errors.verifiedRevenue ? (
          <p className="text-xs text-amber">{errors.verifiedRevenue[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`report-${requestId}`}>تقرير التوثيق (PDF)</Label>
        <input
          id={`report-${requestId}`}
          name="report"
          type="file"
          accept="application/pdf"
          required
          className="text-sm text-ink"
        />
      </div>

      {state.error ? <p className="text-xs text-amber">{state.error}</p> : null}

      <Button type="submit" variant="verify" size="sm" disabled={pending}>
        {pending ? "جارٍ الرفع..." : "إكمال التوثيق"}
      </Button>
    </form>
  );
}
