import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { FranchiseCard } from "@/components/franchises/franchise-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SECTOR_OPTIONS } from "@/lib/listings/constants";
import { z } from "zod";

const franchiseFilterSchema = z.object({
  q: z.string().trim().max(140).optional(),
  sector: z.enum(["cafe", "restaurant", "retail", "services", "other"]).optional(),
  verified: z
    .enum(["1", "true", "on"])
    .optional()
    .transform((value) => value !== undefined),
});

export default async function FranchisesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsedFilters = franchiseFilterSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    sector: typeof raw.sector === "string" ? raw.sector : undefined,
    verified: typeof raw.verified === "string" ? raw.verified : undefined,
  });
  const filters = parsedFilters.success
    ? parsedFilters.data
    : { q: undefined, sector: undefined, verified: false };

  const supabase = await createClient();
  let query = supabase
    .from("franchises")
    .select("*")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.sector) query = query.eq("sector", filters.sector);
  if (filters.q) query = query.ilike("brand_name", `%${filters.q}%`);
  if (filters.verified) query = query.eq("verification_status", "verified");

  const { data: franchises, error } = await query;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="grid-bg flex-1 px-6 py-10 sm:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
            امتيازات تجارية
          </div>
          <h1 className="mb-8 font-heading text-3xl font-extrabold text-ink">
            علامات جاهزة للتوسّع
          </h1>

          <form
            method="get"
            className="mb-8 grid gap-4 rounded-xl border border-grid bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="q">بحث</Label>
              <Input id="q" name="q" placeholder="اسم العلامة" defaultValue={filters.q ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sector">القطاع</Label>
              <Select id="sector" name="sector" defaultValue={filters.sector ?? ""}>
                <option value="">كل القطاعات</option>
                {SECTOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit">تطبيق</Button>

            <label className="flex items-center gap-2 text-sm text-ink/70 sm:col-span-3">
              <input
                type="checkbox"
                name="verified"
                value="1"
                defaultChecked={filters.verified}
                className="size-4 accent-verify"
              />
              الموثّقة فقط
            </label>
          </form>

          {error ? (
            <div className="rounded-xl border border-grid bg-white p-10 text-center text-sm text-amber">
              تعذّر تحميل الامتيازات الآن. حدّث الصفحة أو حاول لاحقًا.
            </div>
          ) : !franchises || franchises.length === 0 ? (
            <div className="rounded-xl border border-grid bg-white p-10 text-center text-ink/60">
              لا توجد امتيازات منشورة تطابق بحثك بعد.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {franchises.map((franchise) => (
                <FranchiseCard key={franchise.id} franchise={franchise} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
