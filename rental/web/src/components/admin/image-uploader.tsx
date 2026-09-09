"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const BUCKET = "car-images";
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Uploads straight from the browser to Supabase Storage and keeps the
 * resulting public URLs in a hidden field, so the surrounding server action
 * receives plain text and never has to handle a multipart file body.
 *
 * The first image is the cover — hence "اجعلها الغلاف" reordering rather
 * than a separate cover picker.
 */
export function ImageUploader({ name, defaultValue }: { name: string; defaultValue: string[] }) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: الحجم يتجاوز ٥ ميجابايت.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (uploadError) {
        console.error("[image-uploader] upload failed", uploadError);
        setError("تعذّر رفع إحدى الصور. تأكد من صلاحيات حسابك وحاول مجددًا.");
        continue;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }

    setUrls((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    setUrls((prev) => prev.filter((u) => u !== url));
  }

  function makeCover(url: string) {
    setUrls((prev) => [url, ...prev.filter((u) => u !== url)]);
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={urls.join("\n")} />

      {urls.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url, i) => (
            <div key={url} className="overflow-hidden rounded-lg border border-admin-border">
              {/* Remote storage URLs; a plain img avoids per-host optimizer config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-video w-full bg-admin-bg object-cover" />
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="text-[11px] font-bold text-admin-text-muted">
                  {i === 0 ? "الغلاف" : `صورة ${i + 1}`}
                </span>
                <div className="flex gap-1">
                  {i !== 0 ? (
                    <button
                      type="button"
                      onClick={() => makeCover(url)}
                      className="rounded px-1.5 py-0.5 text-[11px] text-admin-primary hover:bg-admin-primary/10"
                    >
                      اجعلها الغلاف
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(url)}
                    className="rounded px-1.5 py-0.5 text-[11px] text-admin-danger hover:bg-admin-danger-tint"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="hidden"
          id={`${name}-file`}
        />
        <Button
          type="button"
          variant="brand-ghost"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "جارٍ الرفع..." : "رفع صور"}
        </Button>
        <span className="text-[12px] text-admin-text-muted">
          JPG أو PNG أو WebP · حتى ٥ ميجابايت للصورة
        </span>
      </div>

      {error ? <p className="text-[12px] text-admin-danger">{error}</p> : null}
    </div>
  );
}
