"use client";

import { useActionState, useTransition } from "react";
import {
  createDeliveryZone,
  setDeliveryZoneActive,
  deleteDeliveryZone,
} from "@/app/actions/delivery-zones";
import { emptyActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSar } from "@/lib/cars/constants";

type Zone = {
  id: string;
  name: string;
  city: string;
  fee: number;
  note: string | null;
  is_active: boolean;
  branch_id: string | null;
};

type Branch = { id: string; name: string; city: string };

const field =
  "h-11 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text placeholder:text-admin-text-muted";

export function DeliveryZones({ zones, branches }: { zones: Zone[]; branches: Branch[] }) {
  const [state, action, pending] = useActionState(createDeliveryZone, emptyActionState);
  const [busy, startTransition] = useTransition();

  const branchName = (id: string | null) =>
    id ? (branches.find((b) => b.id === id)?.name ?? "فرع محذوف") : "كل الفروع";

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-admin-border bg-admin-surface p-4 sm:p-5">
        <h2 className="mb-4 font-heading text-[15px] font-bold text-admin-text">إضافة منطقة</h2>
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <input name="name" placeholder="اسم المنطقة" className={field} required />
          <input name="city" placeholder="المدينة" className={field} required />
          <input
            name="fee"
            type="number"
            min="0"
            step="1"
            placeholder="الرسوم للرحلة الواحدة (ر.س)"
            className={field}
            required
          />
          <select name="branch_id" className={field} defaultValue="">
            <option value="">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.city}
              </option>
            ))}
          </select>
          <input name="note" placeholder="ملاحظة (اختياري)" className={`${field} sm:col-span-2`} />

          {state.error ? (
            <p className="text-[13px] text-admin-danger sm:col-span-2">{state.error}</p>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الإضافة…" : "أضف المنطقة"}
            </Button>
          </div>
        </form>
      </Card>

      {zones.map((z) => (
        <Card key={z.id} className="border-admin-border bg-admin-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-admin-text">{z.name}</span>
                <Badge variant={z.is_active ? "verify" : "muted"}>
                  {z.is_active ? "مفعّلة" : "معطّلة"}
                </Badge>
              </div>
              <p className="mt-1 text-[13px] text-admin-text-muted">
                {z.city} · {branchName(z.branch_id)}
              </p>
              {z.note ? (
                <p className="mt-1 text-[12px] text-admin-text-muted">{z.note}</p>
              ) : null}
            </div>
            <div className="text-end">
              <div className="font-mono text-lg font-extrabold text-admin-text">
                {formatSar(Number(z.fee))}
              </div>
              <div className="text-[12px] text-admin-text-muted">للرحلة</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() =>
                startTransition(() => {
                  setDeliveryZoneActive(z.id, !z.is_active);
                })
              }
            >
              {z.is_active ? "تعطيل" : "تفعيل"}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() =>
                startTransition(() => {
                  deleteDeliveryZone(z.id);
                })
              }
            >
              حذف
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
