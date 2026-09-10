import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { BillingForms } from "@/components/admin/billing-forms";
import { formatSar, formatDate } from "@/lib/cars/constants";

export default async function AdminBillingPage() {
  const supabase = await createClient();
  const [{ data: org }, { data: wallet }, { data: invoices }] = await Promise.all([
    supabase.from("org_settings").select("*").maybeSingle(),
    supabase.from("wallet_settings").select("*").maybeSingle(),
    supabase
      .from("invoices")
      .select("id, number, issued_at, total, vat_amount, buyer_name, extension_id")
      .order("issued_at", { ascending: false })
      .limit(25),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-admin-text">
        الفوترة والمحفظة
      </h1>
      <p className="mb-8 text-[13px] leading-relaxed text-admin-text-muted">
        بيانات المنشأة تُطبع على كل فاتورة ضريبية وتُرمَّز داخل رمز QR. تغييرها يسري على
        الفواتير القادمة ولا يعدّل فاتورة صدرت.
      </p>

      {!org?.vat_number ? (
        <Card className="mb-6 border-admin-amber/40 bg-admin-amber/10 text-[13px] leading-relaxed text-admin-text">
          الرقم الضريبي غير مُدخل. الفواتير الصادرة الآن تحمل رمز QR بلا رقم ضريبي، وهو غير
          مقبول نظاميًا — أدخله قبل استقبال أي دفعة.
        </Card>
      ) : null}

      <BillingForms
        org={org ?? null}
        wallet={wallet ?? null}
      />

      <h2 className="mb-4 mt-10 font-heading text-lg font-bold text-admin-text">
        آخر الفواتير
      </h2>
      {(invoices ?? []).length === 0 ? (
        <Card className="border-admin-border bg-admin-surface text-center text-[13px] text-admin-text-muted">
          لم تصدر فواتير بعد. تصدر الفاتورة تلقائيًا فور اكتمال الدفع.
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {(invoices ?? []).map((inv) => (
            <Card
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-3 border-admin-border bg-admin-surface p-3"
            >
              <div className="min-w-0">
                <div className="font-mono text-[13px] font-bold text-admin-text">
                  {inv.number}
                  {inv.extension_id ? (
                    <span className="ms-2 text-[11px] font-normal text-admin-text-muted">تمديد</span>
                  ) : null}
                </div>
                <div className="text-[12px] text-admin-text-muted">
                  {inv.buyer_name || "—"} · {formatDate(inv.issued_at)}
                </div>
              </div>
              <div className="text-end">
                <div className="font-mono text-[14px] font-bold text-admin-text">
                  {formatSar(Number(inv.total))}
                </div>
                <div className="text-[11px] text-admin-text-muted">
                  ضريبة {formatSar(Number(inv.vat_amount))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
