import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBranch } from "@/app/actions/branches";
import { BranchForm } from "@/components/admin/branch-form";

export default async function EditBranchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: branch } = await supabase.from("branches").select("*").eq("id", id).maybeSingle();
  if (!branch) notFound();

  const action = updateBranch.bind(null, branch.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">
        تعديل فرع — {branch.name}
      </h1>
      <BranchForm branch={branch} action={action} />
    </div>
  );
}
