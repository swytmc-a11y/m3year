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

/**
 * Returns the signed-in user only if they are an admin; otherwise redirects.
 * Authorization is checked server-side via the is_admin() RPC — never trust the
 * client. RLS is the final backstop, this is defense in depth + routing.
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
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return user;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

/**
 * Returns the signed-in user plus their accountant row, if any (null if they
 * have never applied). Does NOT require is_active — the accountant portal
 * itself shows a "pending approval" state for inactive accountants.
 */
export async function requireAccountantContext() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: accountant } = await supabase
    .from("accountants")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, accountant };
}
