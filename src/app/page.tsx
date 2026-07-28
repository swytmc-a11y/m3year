import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CaliperMark } from "@/components/caliper-mark";
import { SiteHeader } from "@/components/site-header";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 600;

/**
 * The public landing page.
 *
 * The platform's product is trust, so the page has to earn some before asking
 * for a signup: it explains what verification actually means (and what it
 * explicitly does not), shows real counts rather than invented ones, and
 * states the platform's limits plainly instead of burying them in the terms.
 */
export default async function Home() {
  const counts = await getPublishedCounts();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <header className="grid-bg flex flex-col items-center px-6 py-24 text-center sm:px-12">
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
            <Link href="/dashboard/listings/new">وثّق مشروعك</Link>
          </Button>
          <Button asChild variant="ghost" size="default">
            <Link href="/listings">
              <span className="inline-flex items-center gap-2">
                <CaliperMark className="text-verify text-[13px]" />
                تصفح المشاريع الموثّقة
              </span>
            </Link>
          </Button>
        </div>

        {counts ? (
          <dl className="mt-14 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            <Stat value={counts.listings} label="فرصة منشورة" />
            <Stat value={counts.franchises} label="امتياز تجاري" />
            <Stat value={counts.verified} label="إعلان موثّق ماليًا" />
          </dl>
        ) : null}
      </header>

      <section className="border-t border-grid bg-white px-6 py-20 sm:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-3 text-center font-heading text-3xl font-extrabold text-ink">
            كيف تعمل المنصة
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-ink/60">
            أربع خطوات واضحة، من نشر الإعلان إلى التواصل مع شريك جاد.
          </p>

          <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Step
              n="١"
              title="انشر مشروعك"
              body="أضف إيراد مشروعك الشهري والنسبة التي تطرحها للشراكة. النشر مجاني بالكامل."
            />
            <Step
              n="٢"
              title="اطلب التوثيق"
              body="محاسب مستقل مسجَّل في المنصة يراجع قوائمك المالية ويؤكد الأرقام المُعلنة."
            />
            <Step
              n="٣"
              title="احصل على مؤشر معيار"
              body="درجة تعكس اكتمال بياناتك ومستوى توثيقها، تظهر لكل من يتصفح إعلانك."
            />
            <Step
              n="٤"
              title="تواصل مباشرة"
              body="الممولون المهتمون يراسلونك داخل المنصة. الاتفاق يتم بينكما مباشرة."
            />
          </ol>
        </div>
      </section>

      <section className="border-t border-grid px-6 py-20 sm:px-12">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-heading text-3xl font-extrabold text-ink">
              ماذا يعني «موثّق» في معيار؟
            </h2>
            <p className="mb-4 text-ink/70">
              التوثيق يعني أن محاسبًا مستقلًا اطّلع على القوائم المالية للمشروع
              وأكّد أن الأرقام المنشورة تطابقها. هذا كل شيء — لا أكثر ولا أقل.
            </p>
            <p className="text-ink/70">
              وضوح هذا التعريف هو أساس قيمة الشارة: شارة تعني كل شيء لا تعني
              شيئًا.
            </p>
          </div>

          <div className="rounded-lg border border-grid bg-white p-8">
            <h3 className="mb-5 font-heading text-lg font-bold text-ink">
              ما لا تفعله معيار
            </h3>
            <ul className="space-y-4 text-sm text-ink/70">
              <NotItem>
                لا نضمن نجاح أي مشروع ولا نقدّم توصية استثمارية. القرار قرارك.
              </NotItem>
              <NotItem>
                لا ننفّذ الصفقة ولا ننقل الملكية. الاتفاق يتم بينك وبين الطرف
                الآخر خارج المنصة.
              </NotItem>
              <NotItem>
                لا نحتفظ بأي أموال كوسيط — لا يوجد ضمان أو حساب معلّق.
              </NotItem>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-grid bg-white px-6 py-20 sm:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center font-heading text-3xl font-extrabold text-ink">
            أسئلة شائعة
          </h2>
          <div className="space-y-8">
            <Faq q="هل نشر الإعلان مجاني؟">
              نعم، نشر المشاريع والامتيازات مجاني بالكامل. الخدمة المدفوعة
              الوحيدة اختيارية: تمييز الإعلان ليظهر في أعلى نتائج التصفح لمدة
              محددة.
            </Faq>
            <Faq q="من يقوم بالتوثيق المالي؟">
              محاسبون مستقلون مسجَّلون في المنصة، وليس فريق معيار. المنصة تنظّم
              العملية ولا تنفّذ المراجعة بنفسها.
            </Faq>
            <Faq q="هل تظهر بياناتي المالية للجميع؟">
              لا. أنت تحدد مستوى المشاركة: فورًا، أو عند الطلب، أو عدم المشاركة.
              وبيانات السجل التجاري تبقى سرّية ولا تظهر إلا للمحاسب المكلّف
              وفريق المراجعة.
            </Faq>
            <Faq q="كيف أتواصل مع صاحب مشروع؟">
              من داخل التطبيق مباشرة. تبدأ محادثة على الإعلان، ويستمر النقاش
              بينكما دون وسيط.
            </Faq>
          </div>
        </div>
      </section>

      <footer className="border-t border-grid bg-white px-6 py-12 sm:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 text-sm text-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md leading-relaxed">
            معيار — منصة إعلانات وتواصل وتوثيق مالي. لا تُنفّذ المنصة أي صفقة
            تمويل أو نقل ملكية.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/listings" className="hover:text-ink">
              المشاريع
            </Link>
            <Link href="/franchises" className="hover:text-ink">
              الامتيازات
            </Link>
            <a href="mailto:support@miyear.site" className="hover:text-ink">
              الدعم
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Real counts only. If the query fails the block is omitted entirely rather
 * than rendering zeros or placeholders — an invented number on a page about
 * trustworthy numbers is not a tradeoff worth making.
 */
async function getPublishedCounts() {
  try {
    const supabase = createPublicClient();
    const [listings, franchises, verified] = await Promise.all([
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("franchises").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("verification_status", "verified"),
    ]);

    if (listings.error || franchises.error || verified.error) return null;
    return {
      listings: listings.count ?? 0,
      franchises: franchises.count ?? 0,
      verified: verified.count ?? 0,
    };
  } catch (err) {
    console.error("[home] counts failed", err);
    return null;
  }
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <dd className="font-mono text-3xl font-semibold text-ink">{value}</dd>
      <dt className="text-xs tracking-wide text-ink/50">{label}</dt>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex flex-col gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-verify/30 font-mono text-sm text-verify">
        {n}
      </span>
      <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>
      <p className="text-sm leading-relaxed text-ink/60">{body}</p>
    </li>
  );
}

function NotItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-1 text-amber">
        ✕
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-grid pb-6 last:border-0">
      <h3 className="mb-2 font-heading text-lg font-bold text-ink">{q}</h3>
      <p className="leading-relaxed text-ink/65">{children}</p>
    </div>
  );
}
