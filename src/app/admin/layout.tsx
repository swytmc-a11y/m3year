import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin gate for every /admin route (RLS is the final backstop).
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex flex-col gap-3 border-b border-grid bg-white px-4 py-3 sm:flex-row sm:items-center sm:gap-8 sm:px-12 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="hidden text-sm text-ink/50 hover:text-ink sm:inline"
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
        <AdminNav />
      </nav>
      <main className="grid-bg flex-1">{children}</main>
    </div>
  );
}
