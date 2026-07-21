import { createClient } from "@/lib/supabase/server";
import { activateAccountant, deactivateAccountant } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/listings/constants";

type AccountantRow = {
  id: string;
  socpa_number: string | null;
  bio: string | null;
  is_active: boolean;
  rating_avg: number;
  created_at: string;
  profile: { full_name: string | null } | null;
};

export default async function AdminAccountantsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("accountants")
    .select("*, profile:profiles(full_name)")
    .order("created_at", { ascending: false });

  const accountants = data as unknown as AccountantRow[] | null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
        لوحة الإدارة
      </div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-ink">
        المحاسبون
      </h1>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل قائمة المحاسبين الآن.
        </Card>
      ) : !accountants || accountants.length === 0 ? (
        <Card className="text-center text-ink/60">
          لا يوجد محاسبون مسجّلون بعد.
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {accountants.map((a) => (
            <Card key={a.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink">
                    {a.profile?.full_name || "بدون اسم"}
                  </h2>
                  <p className="mt-1 text-[13px] text-ink/50">
                    عضوية SOCPA: {a.socpa_number || "—"} · انضم في{" "}
                    {formatDate(a.created_at)}
                  </p>
                </div>
                <Badge variant={a.is_active ? "verify" : "amber"}>
                  {a.is_active ? "مفعّل" : "بانتظار التفعيل"}
                </Badge>
              </div>

              {a.bio ? (
                <p className="mb-4 text-[13px] leading-6 text-ink/70">{a.bio}</p>
              ) : null}

              <div className="flex gap-2">
                {a.is_active ? (
                  <form action={deactivateAccountant}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      تعطيل
                    </Button>
                  </form>
                ) : (
                  <form action={activateAccountant}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="verify" size="sm">
                      تفعيل
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
