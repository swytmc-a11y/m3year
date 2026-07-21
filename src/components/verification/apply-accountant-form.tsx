"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyAsAccountant } from "@/app/actions/verification";
import { emptyActionState } from "@/lib/action-state";

export function ApplyAccountantForm() {
  const [state, formAction, pending] = useActionState(
    applyAsAccountant,
    emptyActionState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">الاسم الكامل</Label>
        <Input id="fullName" name="fullName" maxLength={120} required />
        {errors.fullName ? (
          <p className="text-sm text-amber">{errors.fullName[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="socpaNumber">رقم عضوية SOCPA</Label>
        <Input
          id="socpaNumber"
          name="socpaNumber"
          dir="ltr"
          className="text-left font-mono"
          maxLength={60}
          required
        />
        {errors.socpaNumber ? (
          <p className="text-sm text-amber">{errors.socpaNumber[0]}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bio">نبذة مختصرة (اختياري)</Label>
        <Textarea id="bio" name="bio" rows={4} maxLength={2000} />
        {errors.bio ? <p className="text-sm text-amber">{errors.bio[0]}</p> : null}
      </div>

      {state.error ? <p className="text-sm text-amber">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الإرسال..." : "إرسال الطلب"}
      </Button>
    </form>
  );
}
