import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase.rpc("is_admin");
    isAdmin = data === true;
  }

  return (
    <nav className="flex items-center justify-between border-b border-grid bg-white px-6 py-4 sm:px-12">
      <div className="flex items-center gap-8">
        <Logo />
        <div className="hidden gap-6 text-sm text-ink/60 sm:flex">
          <Link href="/listings" className="hover:text-ink">
            تصفح المشاريع
          </Link>
          <Link href="/franchises" className="hover:text-ink">
            الامتيازات التجارية
          </Link>
          {isAdmin ? (
            <Link href="/admin/listings" className="hover:text-ink">
              لوحة الإدارة
            </Link>
          ) : null}
        </div>
      </div>

      {user ? (
        <Button asChild size="sm">
          <Link href="/dashboard/listings">لوحتي</Link>
        </Button>
      ) : (
        <Button asChild size="sm">
          <Link href="/auth">ابدأ الآن</Link>
        </Button>
      )}
    </nav>
  );
}
