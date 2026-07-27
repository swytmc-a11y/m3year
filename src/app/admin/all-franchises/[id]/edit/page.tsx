import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateFranchise } from "@/app/actions/franchises";
import { FranchiseForm } from "@/components/franchises/franchise-form";
import { ListingStatusBadge } from "@/components/listings/status-badge";
import { Card } from "@/components/ui/card";

export default async function AdminEditFranchisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: franchise } = await supabase
    .from("franchises")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!franchise) notFound();

  const updateAction = adminUpdateFranchise.bind(null, franchise.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/admin/all-franchises"
        className="mb-6 inline-block text-sm text-ink/50 hover:text-ink"
      >
        ← كل الامتيازات
      </Link>
      <div className="mb-8 flex items-center gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          تعديل الامتياز (كمدير)
        </h1>
        <ListingStatusBadge status={franchise.status} />
      </div>

      <Card>
        <FranchiseForm action={updateAction} franchise={franchise} />
      </Card>
    </div>
  );
}
