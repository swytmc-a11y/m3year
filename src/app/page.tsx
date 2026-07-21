import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CaliperMark } from "@/components/caliper-mark";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-grid bg-white px-6 py-5 sm:px-12">
        <Logo />
        <Button asChild size="sm">
          <Link href="/auth">ابدأ الآن</Link>
        </Button>
      </nav>

      <header className="grid-bg flex flex-1 flex-col items-center px-6 py-24 text-center sm:px-12">
        <div className="mb-7 flex items-center gap-2 text-verify/80">
          <span className="font-mono text-xs tracking-[0.2em]">
            MIYAR — دقّة قبل الثقة
          </span>
        </div>

        <h1 className="mb-6 max-w-3xl font-heading text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
          قبل ما تشارك حد في مشروعك،{" "}
          <span className="text-verify">تأكد من أرقامه</span>
        </h1>

        <p className="mb-10 max-w-xl text-lg text-ink/60">
          معيار توثّق الإيرادات الفعلية لمشروعك عبر شبكة محاسبين مستقلين،
          لترفع مصداقية عرضك أمام أي شريك ممول محتمل.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="default">
            <Link href="/auth">وثّق مشروعك</Link>
          </Button>
          <Button asChild variant="ghost" size="default">
            <Link href="/auth">
              <span className="inline-flex items-center gap-2">
                <CaliperMark className="text-verify text-[13px]" />
                تصفح المشاريع الموثّقة
              </span>
            </Link>
          </Button>
        </div>
      </header>

      <footer className="border-t border-grid bg-white px-6 py-8 text-center text-sm text-ink/50">
        معيار — منصة إعلانات وتواصل وتوثيق مالي. لا تُنفّذ المنصة أي صفقة
        تمويل أو نقل ملكية.
      </footer>
    </div>
  );
}
