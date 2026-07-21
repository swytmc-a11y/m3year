"use client";

import { useActionState } from "react";
import Link from "next/link";
import { verifyOtp, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

const initialState: ActionState = {};

export function VerifyOtpForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState(verifyOtp, initialState);

  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <Logo />
      </div>

      <div className="w-full max-w-sm rounded-xl border border-grid bg-white p-8">
        <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink">
          رمز التحقق
        </h1>
        <p className="mb-8 text-sm text-ink/60">
          أدخل الرمز المكون من 6 أرقام المرسل إلى{" "}
          <span dir="ltr" className="font-mono text-ink">
            {phone}
          </span>
        </p>

        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="phone" value={phone} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="code">رمز التحقق</Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              dir="ltr"
              className="text-center font-mono text-lg tracking-[0.5em]"
              required
              aria-invalid={Boolean(state.error)}
              aria-describedby={state.error ? "code-error" : undefined}
            />
          </div>

          {state.error ? (
            <p id="code-error" role="alert" className="text-sm text-amber">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "جارٍ التحقق..." : "تأكيد"}
          </Button>
        </form>
      </div>

      <Link href="/auth" className="mt-8 text-sm text-ink/50 hover:text-ink">
        تغيير رقم الجوال
      </Link>
    </div>
  );
}
