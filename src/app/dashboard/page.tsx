import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-grid bg-white px-6 py-4 sm:px-12">
        <Logo />
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            تسجيل الخروج
          </Button>
        </form>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="mb-3 font-heading text-3xl font-extrabold text-ink">
          أهلاً بك في معيار
        </h1>
        <p className="max-w-md text-ink/60">
          تم تسجيل دخولك برقم{" "}
          <span dir="ltr" className="font-mono text-ink">
            {user.phone}
          </span>
          . نشر الإعلانات وطلب التوثيق المالي سيتوفران في المراحل القادمة.
        </p>
      </main>
    </div>
  );
}
