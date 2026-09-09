"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInWithEmail, type ActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

const initialState: ActionState = {};

export default function AuthPage() {
  const [state, action, pending] = useActionState(signInWithEmail, initialState);

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
          أدخل بريدك الإلكتروني وكلمة السر لتسجيل الدخول.
        </p>

        <form action={action} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="example@email.com"
              dir="ltr"
              className="text-left"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">كلمة السر</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              dir="ltr"
              className="text-left"
              required
              aria-invalid={Boolean(state.error)}
              aria-describedby={state.error ? "auth-error" : undefined}
            />
          </div>

          {state.error ? (
            <p id="auth-error" role="alert" className="text-sm text-amber">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </div>

      <Link href="/" className="mt-8 text-sm text-ink/50 hover:text-ink">
        العودة للرئيسية
      </Link>
    </div>
  );
}
