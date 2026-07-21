"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { assignAccountant } from "@/app/actions/verification";
import { emptyActionState } from "@/lib/action-state";

export function AssignAccountantForm({
  requestId,
  accountants,
}: {
  requestId: string;
  accountants: { id: string; full_name: string | null }[];
}) {
  const action = assignAccountant.bind(null, requestId);
  const [state, formAction, pending] = useActionState(action, emptyActionState);

  if (accountants.length === 0) {
    return (
      <p className="text-[13px] text-amber">
        لا يوجد محاسبون مفعّلون بعد. فعّل محاسبًا من صفحة «المحاسبون» أولًا.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:w-72">
      <Select name="accountantId" required defaultValue="">
        <option value="" disabled>
          اختر محاسبًا
        </option>
        {accountants.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name || "بدون اسم"}
          </option>
        ))}
      </Select>
      {state.fieldErrors?.accountantId ? (
        <p className="text-xs text-amber">{state.fieldErrors.accountantId[0]}</p>
      ) : null}

      <Input
        name="feeAmount"
        type="number"
        inputMode="decimal"
        min={0}
        placeholder="رسوم التوثيق (اختياري، ر.س)"
        dir="ltr"
        className="text-left font-mono"
      />

      {state.error ? <p className="text-xs text-amber">{state.error}</p> : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "جارٍ الإسناد..." : "إسناد للمحاسب"}
      </Button>
    </form>
  );
}
