import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in user, or redirects to /auth. Use in any Server
 * Component or Server Action that requires authentication.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return user;
}

// The control panel is meant for exactly one operator. is_admin() alone
// checks a role column that could in principle be set on more than one
// profile (an admin promoting someone by mistake, a bug, a compromised
// admin session used to self-promote another account); this allowlist is a
// second, independent gate that doesn't trust that column at all. Comma-
// separated so it can grow without a code change if that operator ever
// changes — ADMIN_ALLOWED_EMAILS in the deployment's env vars overrides the
// fallback below.
const ADMIN_ALLOWED_EMAILS = (
  process.env.ADMIN_ALLOWED_EMAILS ?? "swytmc@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowedAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && ADMIN_ALLOWED_EMAILS.includes(email.toLowerCase()));
}

/**
 * Returns the signed-in user only if they are an admin; otherwise redirects.
 *
 * Three independent checks, all server-side, none trusting the client:
 *   1. is_admin() — the RLS-backed role check every other admin query relies on.
 *   2. The email allowlist above — a fixed, out-of-band second gate.
 *   3. admin_otp_verifications — a fresh email OTP step-up completed within
 *      the last 12h (see /admin-verify). Being logged in and having the
 *      admin role is not enough on its own to reach the control panel; the
 *      operator must also have proven access to the admin inbox recently.
 * RLS is the final backstop for all of it — this is defense in depth + routing.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin || !isAllowedAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const { data: otp } = await supabase
    .from("admin_otp_verifications")
    .select("expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!otp || new Date(otp.expires_at) <= new Date()) {
    redirect("/admin-verify");
  }

  return user;
}

/**
 * The narrower check /admin-verify itself needs: admin role + allowlisted
 * email, but deliberately WITHOUT the OTP check (that's the very thing this
 * page exists to satisfy — requiring it here would make the page
 * unreachable). Redirects away anyone who isn't even eligible to be here.
 */
export async function requireAdminPendingOtp(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin || !isAllowedAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  return user;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}
