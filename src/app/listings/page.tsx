import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { ListingCard } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { listingFilterSchema } from "@/lib/validations/listing";
import { SECTOR_OPTIONS } from "@/lib/listings/constants";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsedFilters = listingFilterSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    sector: typeof raw.sector === "string" ? raw.sector : undefined,
    city: typeof raw.city === "string" ? raw.city : undefined,
    verified: typeof raw.verified === "string" ? raw.verified : undefined,
  });
  // Ignore malformed query params rather than erroring the whole page.
  const filters = parsedFilters.success
    ? parsedFilters.data
    : { q: undefined, sector: undefined, city: undefined, verified: false };

  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select("*")
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.sector) query = query.eq("sector", filters.sector);
  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.q) query = query.ilike("title", `%${filters.q}%`);
  if (filters.verified) query = query.eq("verification_status", "verified");

  const { data: listings, error } = await query;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <div className="grid-bg flex-1 px-6 py-10 sm:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
            مشاريع تبحث عن شريك
          </div>
          <h1 className="mb-8 font-heading text-3xl font-extrabold text-ink">
            العروض الموثّقة والمنشورة
          </h1>

          {/* Filters (GET form -> URL params) */}
          <form
            method="get"
            className="mb-8 grid gap-4 rounded-xl border border-grid bg-white p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="q">بحث</Label>
              <Input
                id="q"
                name="q"
                placeholder="عنوان المشروع"
                defaultValue={filters.q ?? ""}
              />
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">المدينة</Label>
              <Input
                id="city"
                name="city"
                placeholder="كل المدن"
                defaultValue={filters.city ?? ""}
              />
            </div>
            <Button type="submit">تطبيق</Button>

            <label className="flex items-center gap-2 text-sm text-ink/70 sm:col-span-4">
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
              تعذّر تحميل المشاريع الآن. حدّث الصفحة أو حاول لاحقًا.
            </div>
          ) : !listings || listings.length === 0 ? (
            <div className="rounded-xl border border-grid bg-white p-10 text-center text-ink/60">
              لا توجد مشاريع منشورة تطابق بحثك بعد.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
