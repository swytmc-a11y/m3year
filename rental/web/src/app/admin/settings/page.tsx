import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");

  // Stored as one-element arrays; unwrap for the form.
  const settings = (data ?? []).reduce<Record<string, unknown>>((acc, row) => {
    acc[row.key] = Array.isArray(row.value) ? row.value[0] : row.value;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-admin-text">الإعدادات</h1>
      <p className="mb-8 text-[13px] text-admin-text-muted">
        تسري فورًا على التطبيق واللوحة بلا حاجة لنشر تحديث.
      </p>
      <SettingsForm settings={settings} />
    </div>
  );
}
