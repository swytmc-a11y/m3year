import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default async function AccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-grid bg-white px-6 py-4 sm:px-12">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="flex gap-6 text-sm text-ink/60">
            <Link href="/accountant/requests" className="hover:text-ink">
              طلباتي
            </Link>
            <Link href="/dashboard" className="hover:text-ink">
              لوحتي
            </Link>
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
