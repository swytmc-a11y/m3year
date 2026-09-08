import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { AdminNav, type AdminNavCounts } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate for every /admin route: role + email allowlist + a live
  // OTP step-up (see requireAdmin). RLS is the backstop behind all of it.
  const user = await requireAdmin();

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: pendingBookings }, { count: todayPickups }, { count: todayReturns }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_confirmation"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("start_date", today)
        .in("status", ["confirmed", "active"]),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("end_date", today)
        .in("status", ["confirmed", "active"]),
    ]);

  const counts: AdminNavCounts = {
    pendingBookings: pendingBookings ?? 0,
    todayPickups: todayPickups ?? 0,
    todayReturns: todayReturns ?? 0,
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
            <span className="hidden text-[13px] text-admin-text-muted lg:inline">{user.email}</span>
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

export const metadata = {
  title: "لوحة الإدارة",
};
