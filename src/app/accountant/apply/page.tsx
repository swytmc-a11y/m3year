import { redirect } from "next/navigation";
import { requireAccountantContext } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ApplyAccountantForm } from "@/components/verification/apply-accountant-form";

export default async function AccountantApplyPage() {
  const { accountant } = await requireAccountantContext();

  if (accountant) {
    redirect("/accountant/requests");
  }

  return (
    <div className="mx-auto w-full max-w-md px-6 py-12">
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink">
        انضم كمحاسب مستقل
      </h1>
      <p className="mb-8 text-sm text-ink/60">
        بعد الإرسال، يراجع فريق معيار طلبك ويفعّل حسابك للبدء باستلام طلبات
        التوثيق.
      </p>
      <Card>
        <ApplyAccountantForm />
      </Card>
    </div>
  );
}
