import Link from "next/link";
import { requireUser, isCurrentUserAdmin } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const isAdmin = await isCurrentUserAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-grid bg-white px-6 py-4 sm:px-12">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden gap-6 text-sm text-ink/60 sm:flex">
            <Link href="/dashboard/listings" className="hover:text-ink">
              إعلاناتي
            </Link>
            <Link href="/listings" className="hover:text-ink">
              تصفح المشاريع
            </Link>
            {isAdmin ? (
              <Link href="/admin/listings" className="hover:text-ink">
                لوحة الإدارة
              </Link>
            ) : null}
          </div>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            تسجيل الخروج
          </Button>
        </form>
      </nav>
      <main className="grid-bg flex-1">{children}</main>
    </div>
  );
}
