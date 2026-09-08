import { createBranch } from "@/app/actions/branches";
import { BranchForm } from "@/components/admin/branch-form";

export default function NewBranchPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-2 font-mono text-[13px] tracking-wide text-admin-primary">لوحة الإدارة</div>
      <h1 className="mb-8 font-heading text-2xl font-extrabold text-admin-text">إضافة فرع</h1>
      <BranchForm action={createBranch} />
    </div>
  );
}
