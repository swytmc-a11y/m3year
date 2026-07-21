import Link from "next/link";
import { enterDemo } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

// TEMPORARY preview-only page. Remove before public launch (see enterDemo).
export default async function DemoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="grid-bg flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <Logo />
      </div>

      <div className="w-full max-w-sm rounded-xl border border-grid bg-white p-8">
        <span className="mb-4 inline-block rounded-full bg-amber/10 px-3 py-1 text-xs font-bold text-amber">
          دخول تجريبي للمعاينة
        </span>
        <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink">
          جرّب معيار
        </h1>
        <p className="mb-8 text-sm text-ink/60">
          تسجيل الدخول عبر الجوال يُفعّل لاحقًا بمزوّد رسائل نصية. لأغراض
          المعاينة، ادخل بحساب تجريبي بضغطة واحدة.
        </p>

        {error ? (
          <p role="alert" className="mb-4 text-sm text-amber">
            تعذّر الدخول التجريبي الآن. حاول مرة أخرى.
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <form action={enterDemo}>
            <input type="hidden" name="as" value="owner" />
            <Button type="submit" className="w-full">
              دخول كصاحب مشروع
            </Button>
          </form>
          <form action={enterDemo}>
            <input type="hidden" name="as" value="admin" />
            <Button type="submit" variant="ghost" className="w-full">
              دخول كمدير (لوحة المراجعة)
            </Button>
          </form>
        </div>
      </div>

      <Link href="/" className="mt-8 text-sm text-ink/50 hover:text-ink">
        العودة للرئيسية
      </Link>
    </div>
  );
}
