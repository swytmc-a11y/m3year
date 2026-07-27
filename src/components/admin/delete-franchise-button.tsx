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
        className="border-red-300 text-red-700 hover:bg-red-50"
      >
        حذف
      </Button>
    </form>
  );
}
