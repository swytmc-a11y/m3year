import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Shown when the database says an account is an admin but the deployment's
 * email allowlist does not list it.
 *
 * That combination used to redirect silently to the marketing page, which is
 * indistinguishable from "you are not an admin" and cost hours of guessing to
 * diagnose — the two gates are deliberately independent, so they can disagree,
 * and when they do the operator is the only one who can reconcile them. Naming
 * the cause here is the whole point of the page.
 *
 * Deliberately outside /admin: that route's layout runs the same check, so a
 * page for people failing it cannot live behind it.
 */
export default async function AdminAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-bg px-4">
      <Card className="w-full max-w-lg border-admin-border bg-admin-surface p-6 sm:p-8">
        <div className="mb-6">
          <Logo />
        </div>

        <h1 className="mb-3 font-heading text-xl font-extrabold text-admin-text">
          حسابك مسجّل كمشرف، لكنه غير مُدرج في هذه النسخة
        </h1>

        <p className="mb-4 text-[13px] leading-7 text-admin-text-muted">
          للوحة بوابتان مستقلتان عمدًا: صلاحية المشرف في قاعدة البيانات، وقائمة
          بريد مُثبّتة في إعدادات النشر. حسابك اجتاز الأولى ولم يجتز الثانية —
          ولهذا لا تفتح اللوحة رغم أن الصلاحية صحيحة.
        </p>

        {user?.email ? (
          <p className="mb-6 rounded-lg bg-admin-bg px-4 py-3 font-mono text-[13px] text-admin-text">
            {user.email}
          </p>
        ) : null}

        <p className="mb-6 text-[13px] leading-7 text-admin-text-muted">
          الحل: أضف هذا البريد إلى المتغيّر <code className="font-mono">ADMIN_ALLOWED_EMAILS</code>{" "}
          في إعدادات المشروع على منصة النشر (بريد واحد أو أكثر مفصولة بفاصلة)، ثم
          أعد النشر. وإن لم يكن المتغيّر معرّفًا أصلًا، فالنسخة المنشورة أقدم من
          آخر تحديث وتكفي إعادة النشر.
        </p>

        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            تسجيل الخروج
          </Button>
        </form>
      </Card>
    </div>
  );
}

export const metadata = {
  title: "صلاحية الدخول",
};
