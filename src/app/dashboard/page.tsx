import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
      <h1 className="mb-3 font-heading text-3xl font-extrabold text-ink">
        أهلاً بك في معيار
      </h1>
      <p className="mx-auto mb-8 max-w-md text-ink/60">
        تم تسجيل دخولك برقم{" "}
        <span dir="ltr" className="font-mono text-ink">
          {user.phone}
        </span>
        . ابدأ بنشر إعلان مشروعك أو تصفّح المشاريع الموثّقة.
      </p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/dashboard/listings/new">أنشئ إعلانًا</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/listings">إعلاناتي</Link>
        </Button>
      </div>
    </div>
  );
}
