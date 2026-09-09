"use client";

import { useActionState } from "react";
import { blockCarDates, unblockCarDates } from "@/app/actions/cars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/cars/constants";
import type { ActionState } from "@/lib/action-state";
import type { Tables } from "@/lib/supabase/database.types";

const initial: ActionState = {};

/**
 * Maintenance windows. The server refuses a window that collides with a live
 * booking, so the operator finds out here rather than discovering a
 * double-committed car at the counter.
 */
export function CarBlocks({ carId, blocks }: { carId: string; blocks: Tables<"car_blocks">[] }) {
  const action = blockCarDates.bind(null, carId);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <Card className="border-admin-border bg-admin-surface flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <h2 className="font-heading text-base font-extrabold text-admin-text">فترات الحجب</h2>
        <p className="mt-1 text-[12px] text-admin-text-muted">
          صيانة أو فحص دوري — تختفي السيارة من التوفر خلال هذه الفترة. تاريخ النهاية غير شامل.
        </p>
      </div>

      {blocks.length > 0 ? (
        <div className="flex flex-col gap-2">
          {blocks.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-admin-border p-3"
            >
              <div>
                <p className="text-sm text-admin-text">
                  {formatDate(b.start_date)} — {formatDate(b.end_date)}
                </p>
                {b.reason ? (
                  <p className="text-[12px] text-admin-text-muted">{b.reason}</p>
                ) : null}
              </div>
              <form action={unblockCarDates}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="car_id" value={carId} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="border-admin-danger/40 text-admin-danger hover:bg-admin-danger-tint"
                >
                  إلغاء الحجب
                </Button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-admin-text-muted">لا توجد فترات محجوبة.</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="start_date">من</Label>
          <Input id="start_date" name="start_date" type="date" dir="ltr" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="end_date">إلى</Label>
          <Input id="end_date" name="end_date" type="date" dir="ltr" required />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="reason">السبب</Label>
          <Input id="reason" name="reason" placeholder="صيانة دورية" />
        </div>
        <Button type="submit" variant="brand-ghost" disabled={pending}>
          {pending ? "..." : "حجب"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="text-[13px] text-admin-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-[13px] text-admin-success">تم حجب الفترة.</p>
      ) : null}
    </Card>
  );
}
