"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  saveBookingContract,
  deleteBookingContract,
  contractSignedUrl,
} from "@/app/actions/contracts";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/cars/constants";

const MAX_BYTES = 16 * 1024 * 1024;

export type ExistingContract = {
  file_name: string;
  storage_path: string;
  uploaded_at: string;
} | null;

/**
 * Files the signed contract against a booking.
 *
 * The file goes from the browser straight to the private bucket, so the
 * server action only records the path and never handles a multipart body.
 * The path is always <booking_id>/<file>, because that folder name is what
 * the storage policy matches the booking against.
 */
export function ContractUpload({
  bookingId,
  contract,
}: {
  bookingId: string;
  contract: ExistingContract;
}) {
  const [current, setCurrent] = useState(contract);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("الحجم يتجاوز ١٦ ميجابايت.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("contracts")
      .upload(path, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) {
      console.error("[contract-upload] upload failed", uploadError);
      setError("تعذّر رفع الملف. تأكد من صلاحيات حسابك.");
      setBusy(false);
      return;
    }

    const res = await saveBookingContract({
      bookingId,
      storagePath: path,
      fileName: file.name,
      contentType: file.type || null,
      sizeBytes: file.size,
    });
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";

    if (res.error) {
      // The row is what the customer actually reads, so a file with no row
      // is dead weight — clear it rather than leaving it behind.
      await supabase.storage.from("contracts").remove([path]);
      setError(res.error);
      return;
    }
    setCurrent({ file_name: file.name, storage_path: path, uploaded_at: new Date().toISOString() });
  }

  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface p-4">
      <div className="mb-1 font-heading text-[13px] font-bold text-admin-text">عقد الإيجار</div>
      <p className="mb-3 text-[12px] leading-relaxed text-admin-text-muted">
        ارفع العقد الموقّع بعد تسليم السيارة. تظهر نسخة العميل في التطبيق فور بدء الإيجار.
      </p>

      {current ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-admin-text">
            {current.file_name} · {formatDate(current.uploaded_at)}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const url = await contractSignedUrl(current.storage_path);
                if (url) window.open(url, "_blank", "noopener");
              })
            }
          >
            فتح
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteBookingContract(bookingId);
                if (res.error) setError(res.error);
                else setCurrent(null);
              })
            }
          >
            حذف
          </Button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-[12px] text-admin-text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-admin-primary file:px-3 file:py-2 file:text-[12px] file:text-white"
        />
      )}

      {busy ? <p className="mt-2 text-[12px] text-admin-text-muted">جارٍ الرفع…</p> : null}
      {error ? <p className="mt-2 text-[12px] text-admin-danger">{error}</p> : null}
    </div>
  );
}
