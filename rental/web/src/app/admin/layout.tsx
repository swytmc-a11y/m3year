import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { AdminNav, type AdminNavCounts } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin gate for every /admin route: role + email allowlist +
  // a live OTP step-up (see requireAdmin in lib/auth.ts). RLS is the final
  // backstop for all of it.
  const user = await requireAdmin();

  // Counts feed the small badges on the nav — fetched once here (server
  // component) rather than in the client nav, so the nav itself can stay a
  // thin client component that only owns active-path highlighting.
  const supabase = await createClient();
  const [
    { count: pendingListings },
    { count: pendingFranchises },
    { count: openVerifications },
    { count: pendingAccountants },
    { count: openReports },
  ] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("franchises").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("accountants").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const counts: AdminNavCounts = {
    listings: pendingListings ?? 0,
    franchises: pendingFranchises ?? 0,
    verifications: openVerifications ?? 0,
    accountants: pendingAccountants ?? 0,
    reports: openReports ?? 0,
  };

  return (
    <div className="admin-shell">
      <nav className="sticky top-0 z-20 flex flex-col gap-3 border-b border-admin-border bg-admin-surface/90 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-admin-primary/10 px-2.5 py-1 text-[11px] font-bold text-admin-primary sm:inline">
              لوحة الإدارة
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-[13px] text-admin-text-muted lg:inline">
              {user.email}
            </span>
            <Link
              href="/dashboard"
              className="hidden text-sm text-admin-text-muted hover:text-admin-text sm:inline"
            >
              لوحتي كمستخدم
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                تسجيل الخروج
              </Button>
            </form>
          </div>
        </div>
        <AdminNav counts={counts} />
      </nav>
      <main className="flex-1 bg-admin-bg pb-16">{children}</main>
    </div>
  );
}
