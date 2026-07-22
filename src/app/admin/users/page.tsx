import { createClient } from "@/lib/supabase/server";
import { grantAccountantAccess, activateAccountant, deactivateAccountant } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/listings/constants";
import type { Database } from "@/lib/supabase/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

const ROLE_LABELS: Record<UserRole, string> = {
  project_owner: "صاحب مشروع",
  investor: "مستثمر",
  accountant: "محاسب",
  admin: "مدير",
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
  accountant: { is_active: boolean } | null;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();

  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at")
    .order("created_at", { ascending: false });

  if (query) {
    const escaped = query.replace(/[%_]/g, "\\$&");
    profilesQuery = profilesQuery.or(
      `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
    );
  }

  const { data: profiles, error } = await profilesQuery;

  const accountantIds = (profiles ?? [])
    .filter((p) => p.role === "accountant")
    .map((p) => p.id);
  const { data: accountantRows } = accountantIds.length
    ? await supabase.from("accountants").select("id, is_active").in("id", accountantIds)
    : { data: [] as { id: string; is_active: boolean }[] };
  const accountantById = new Map((accountantRows ?? []).map((a) => [a.id, a]));

  const users: ProfileRow[] = (profiles ?? []).map((p) => ({
    ...p,
    accountant: accountantById.get(p.id) ?? null,
  }));

  const { count: total } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-verify">
        لوحة الإدارة
      </div>
      <h1 className="mb-2 font-heading text-2xl font-extrabold text-ink">
        كل الحسابات
        <span className="ms-2 text-base font-normal text-ink/40">
          ({total ?? 0})
        </span>
      </h1>
      <p className="mb-6 text-[13px] text-ink/50">
        كل مستخدم مسجَّل في التطبيق. امنح أي حساب صلاحية محاسب مباشرة، أو
        فعِّل/عطِّل من هو محاسب بالفعل.
      </p>

      <form className="mb-8" action="/admin/users">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم، البريد، أو رقم الجوال..."
          dir="rtl"
        />
      </form>

      {error ? (
        <Card className="text-center text-sm text-amber">
          تعذّر تحميل الحسابات الآن. حدّث الصفحة أو حاول لاحقًا.
        </Card>
      ) : users.length === 0 ? (
        <Card className="text-center text-ink/60">
          {query ? "لا نتائج مطابقة لبحثك." : "لا يوجد مستخدمون مسجَّلون بعد."}
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user }: { user: ProfileRow }) {
  const isAccountant = user.role === "accountant" && user.accountant;

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-ink">
            {user.full_name || "بدون اسم"}
          </h2>
          <p className="mt-1 text-[13px] text-ink/50">
            {user.email || "—"}
            {user.phone ? ` · ${user.phone}` : ""} · انضم في{" "}
            {formatDate(user.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant={user.role === "admin" ? "verify" : "neutral"}>
            {ROLE_LABELS[user.role]}
          </Badge>
          {isAccountant ? (
            <Badge variant={user.accountant!.is_active ? "verify" : "amber"}>
              {user.accountant!.is_active ? "مفعّل" : "بانتظار التفعيل"}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        {!isAccountant && user.role !== "admin" ? (
          <form action={grantAccountantAccess}>
            <input type="hidden" name="id" value={user.id} />
            <Button type="submit" size="sm">
              منح صلاحية محاسب
            </Button>
          </form>
        ) : isAccountant ? (
          user.accountant!.is_active ? (
            <form action={deactivateAccountant}>
              <input type="hidden" name="id" value={user.id} />
              <Button type="submit" variant="ghost" size="sm">
                تعطيل
              </Button>
            </form>
          ) : (
            <form action={activateAccountant}>
              <input type="hidden" name="id" value={user.id} />
              <Button type="submit" variant="verify" size="sm">
                تفعيل
              </Button>
            </form>
          )
        ) : null}
      </div>
    </Card>
  );
}
