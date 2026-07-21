"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestOtp, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

const initialState: ActionState = {};

export default function AuthPage() {
  const [state, action, pending] = useActionState(requestOtp, initialState);

  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <Logo />
      </div>

      <div className="w-full max-w-sm rounded-xl border border-grid bg-white p-8">
        <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink">
          تسجيل الدخول
        </h1>
        <p className="mb-8 text-sm text-ink/60">
          أدخل رقم جوالك وسنرسل لك رمز تحقق عبر رسالة نصية.
        </p>

        <form action={action} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">رقم الجوال</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="05xxxxxxxx"
              dir="ltr"
              className="text-left font-mono"
              required
              aria-invalid={Boolean(state.error)}
              aria-describedby={state.error ? "phone-error" : undefined}
            />
          </div>

          {state.error ? (
            <p id="phone-error" role="alert" className="text-sm text-amber">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
          </Button>
        </form>
      </div>

      <Link
        href="/auth/demo"
        className="mt-8 text-sm font-bold text-verify hover:underline"
      >
        أو جرّب المنصة بحساب تجريبي ←
      </Link>
      <Link href="/" className="mt-4 text-sm text-ink/50 hover:text-ink">
        العودة للرئيسية
      </Link>
    </div>
  );
}
