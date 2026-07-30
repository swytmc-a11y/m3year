"use client";

import { adminDeleteFranchise } from "@/app/actions/franchises";
import { Button } from "@/components/ui/button";

export function DeleteFranchiseButton({
  franchiseId,
  franchiseName,
}: {
  franchiseId: string;
  franchiseName: string;
}) {
  return (
    <form
      action={adminDeleteFranchise}
      onSubmit={(e) => {
        if (
          !confirm(
            `حذف الامتياز "${franchiseName}" نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={franchiseId} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="border-admin-danger/40 text-admin-danger hover:bg-admin-danger-tint"
      >
        حذف
      </Button>
    </form>
  );
}
