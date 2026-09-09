"use client";

import { useState, useTransition } from "react";
import { getDocumentUrl, approveCustomerDocuments } from "@/app/actions/documents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CustomerDocuments = {
  id: string;
  national_id: string | null;
  license_number: string | null;
  id_document_path: string | null;
  license_document_path: string | null;
  documents_check: "pending" | "accepted" | "rejected" | null;
  documents_check_note: string | null;
  documents_approved_at: string | null;
};

const CHECK_LABEL: Record<string, { text: string; variant: "verify" | "muted" | "danger" }> = {
  accepted: { text: "الفحص الآلي: مقبول", variant: "verify" },
  rejected: { text: "الفحص الآلي: مرفوض", variant: "danger" },
  pending: { text: "الفحص الآلي: لم يُجرَ", variant: "muted" },
};

/**
 * The customer's identity documents, shown where the operator decides whether
 * to confirm a booking — the automated check is only a first pass, and this is
 * where a person actually looks at them.
 */
export function CustomerDocuments({ customer }: { customer: CustomerDocuments }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const check = CHECK_LABEL[customer.documents_check ?? "pending"];

  function open(path: string) {
    setError(null);
    startTransition(async () => {
      const res = await getDocumentUrl(path);
      if (res.error || !res.url) {
        setError(res.error ?? "تعذّر فتح المستند.");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="mb-3 rounded-lg border border-admin-border bg-admin-bg p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-bold text-admin-text">مستندات العميل</span>
        <Badge variant={check.variant}>{check.text}</Badge>
        {customer.documents_approved_at ? (
          <Badge variant="verify">اعتمدتها</Badge>
        ) : null}
      </div>

      {customer.documents_check_note ? (
        <p className="mb-2 text-[12.5px] text-admin-danger">{customer.documents_check_note}</p>
      ) : null}

      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-admin-text-muted">
        <span>
          الهوية:{" "}
          <bdi dir="ltr" className="font-mono text-admin-text">
            {customer.national_id || "—"}
          </bdi>
        </span>
        <span>
          الرخصة:{" "}
          <bdi dir="ltr" className="font-mono text-admin-text">
            {customer.license_number || "—"}
          </bdi>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!customer.id_document_path || pending}
          onClick={() => customer.id_document_path && open(customer.id_document_path)}
        >
          {customer.id_document_path ? "عرض الهوية" : "لا توجد هوية"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!customer.license_document_path || pending}
          onClick={() => customer.license_document_path && open(customer.license_document_path)}
        >
          {customer.license_document_path ? "عرض الرخصة" : "لا توجد رخصة"}
        </Button>

        {!customer.documents_approved_at &&
        customer.id_document_path &&
        customer.license_document_path ? (
          <form action={approveCustomerDocuments}>
            <input type="hidden" name="customer_id" value={customer.id} />
            <Button type="submit" size="sm">
              اعتماد المستندات
            </Button>
          </form>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-[12.5px] text-admin-danger">{error}</p> : null}
    </div>
  );
}
