"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { sendAdminOtp, verifyAdminOtp, type AdminOtpState } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

const initial: AdminOtpState = {};

export function AdminOtpForm({ email }: { email: string }) {
  const [sendState, sendAction, sending] = useActionState(sendAdminOtp, initial);
  const [verifyState, verifyAction, verifying] = useActionState(verifyAdminOtp, initial);
  // Once a send has ever succeeded, keep showing the code step even while a
  // failed verify attempt re-renders sendState — resending is still one tap
  // away instead of the whole flow resetting.
  const [codeStepShown, setCodeStepShown] = useState(false);
  const sentOnce = useRef(false);

  useEffect(() => {
    if (sendState.sent && !sentOnce.current) {
      sentOnce.current = true;
      setCodeStepShown(true);
    }
  }, [sendState.sent]);

  return (
    <>
      <div className="mb-10">
        <Logo />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-admin-border bg-admin-surface p-8 shadow-[0_1px_2px_rgba(20,22,26,0.04),0_8px_24px_rgba(20,22,26,0.06)]">
        <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">
          خطوة تحقق إضافية
        </div>
        <h1 className="mb-2 font-heading text-2xl font-extrabold text-admin-text">
          تأكيد الدخول للوحة الإدارة
        </h1>
        <p className="mb-8 text-sm leading-6 text-admin-text-muted">
          {codeStepShown
            ? <>أرسلنا رمزًا مكوّنًا من 6 أرقام إلى <bdi dir="ltr" className="font-mono text-admin-text">{email}</bdi>.</>
            : <>لحماية إضافية، سنرسل رمز تحقق إلى بريدك <bdi dir="ltr" className="font-mono text-admin-text">{email}</bdi> قبل الدخول للوحة الإدارة.</>}
        </p>

        {!codeStepShown ? (
          <form action={sendAction} className="flex flex-col gap-4">
            {sendState.error ? (
              <p role="alert" className="text-sm text-admin-danger">
                {sendState.error}
              </p>
            ) : null}
            <Button type="submit" disabled={sending} variant="brand">
              {sending ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
            </Button>
          </form>
        ) : (
          <form action={verifyAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">رمز التحقق</Label>
              <Input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                dir="ltr"
                className="text-center font-mono text-lg tracking-[0.4em]"
                required
                autoFocus
                aria-invalid={Boolean(verifyState.error)}
              />
            </div>

            {verifyState.error ? (
              <p role="alert" className="text-sm text-admin-danger">
                {verifyState.error}
              </p>
            ) : null}

            <Button type="submit" disabled={verifying} variant="brand">
              {verifying ? "جارٍ التحقق..." : "تأكيد والدخول"}
            </Button>
          </form>
        )}

        {codeStepShown ? (
          <form action={sendAction} className="mt-5">
            <button
              type="submit"
              disabled={sending}
              className="w-full text-center text-[13px] text-admin-text-muted hover:text-admin-primary disabled:opacity-50"
            >
              {sending ? "جارٍ إعادة الإرسال..." : "لم يصلني رمز — إعادة الإرسال"}
            </button>
          </form>
        ) : null}
      </div>

      <Link href="/dashboard" className="mt-8 text-sm text-admin-text-muted hover:text-admin-text">
        العودة للوحتي كمستخدم
      </Link>
    </>
  );
}
