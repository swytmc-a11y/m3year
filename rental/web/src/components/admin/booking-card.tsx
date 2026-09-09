import Link from "next/link";
import {
  confirmBooking,
  rejectBooking,
  startBooking,
  completeBooking,
  cancelBookingAsAdmin,
  markRefunded,
} from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingStatusBadge } from "@/components/cars/booking-status-badge";
import {
  formatSar,
  formatDate,
  carTitle,
  RATE_TIER_LABELS,
  PAYMENT_STATUS_LABELS,
  type RateTier,
} from "@/lib/cars/constants";

export type BookingWithRelations = {
  id: string;
  reference: string;
  start_date: string;
  end_date: string;
  pickup_time: string;
  return_time: string;
  days: number;
  rate_tier: string;
  daily_rate: number;
  rental_total: number;
  addons_total: number;
  vat_amount: number;
  total: number;
  status: "pending_payment" | "pending_confirmation" | "confirmed" | "active" | "completed" | "cancelled" | "rejected" | "expired";
  payment_status: "unpaid" | "paid" | "refunded" | "partially_refunded" | "failed";
  customer_note: string | null;
  admin_note: string | null;
  cancellation_reason: string | null;
  refund_amount: number | null;
  car: { id: string; make: string; model: string; year: number } | null;
  branch: { name: string; city: string } | null;
  customer: { full_name: string | null; phone: string | null; email: string | null } | null;
};

export function BookingCard({ booking }: { booking: BookingWithRelations }) {
  const b = booking;
  const isOpen = ["pending_confirmation", "confirmed", "active"].includes(b.status);

  return (
    <Card className="border-admin-border bg-admin-surface p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-admin-primary">{b.reference}</span>
            <BookingStatusBadge status={b.status} />
            <Badge variant={b.payment_status === "paid" ? "verify" : "muted"}>
              {PAYMENT_STATUS_LABELS[b.payment_status]}
            </Badge>
          </div>
          <h2 className="mt-1 font-bold text-admin-text">
            {b.car ? carTitle(b.car) : "سيارة محذوفة"}
          </h2>
          <p className="mt-1 text-[13px] text-admin-text-muted">
            {b.branch ? `${b.branch.name} — ${b.branch.city}` : "—"}
          </p>
        </div>
        <div className="text-end">
          <div className="font-mono text-lg font-extrabold text-admin-text">
            {formatSar(Number(b.total))}
          </div>
          <div className="text-[12px] text-admin-text-muted">شامل الضريبة</div>
        </div>
      </div>

      <div className="mb-3 grid gap-3 border-y border-dashed border-admin-border py-3 sm:grid-cols-2">
        <div>
          <div className="text-xs text-admin-text-muted">الاستلام</div>
          <div className="font-mono text-[13px] text-admin-text">
            {formatDate(b.start_date)} · {b.pickup_time.slice(0, 5)}
          </div>
        </div>
        <div>
          <div className="text-xs text-admin-text-muted">التسليم</div>
          <div className="font-mono text-[13px] text-admin-text">
            {formatDate(b.end_date)} · {b.return_time.slice(0, 5)}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-admin-text-muted">
        <span>
          {b.days} يوم · {RATE_TIER_LABELS[b.rate_tier as RateTier] ?? b.rate_tier} ·{" "}
          {formatSar(Number(b.daily_rate))}/يوم
        </span>
        {Number(b.addons_total) > 0 ? <span>إضافات {formatSar(Number(b.addons_total))}</span> : null}
        <span>ضريبة {formatSar(Number(b.vat_amount))}</span>
      </div>

      <div className="mb-4 text-[13px] text-admin-text">
        <span className="text-admin-text-muted">العميل: </span>
        {b.customer?.full_name || "بلا اسم"}
        {b.customer?.phone ? (
          <>
            {" · "}
            <a href={`tel:${b.customer.phone}`} className="font-mono text-admin-primary hover:underline">
              <bdi dir="ltr">{b.customer.phone}</bdi>
            </a>
          </>
        ) : null}
      </div>

      {b.customer_note ? (
        <p className="mb-3 rounded-lg bg-admin-bg px-3 py-2 text-[13px] text-admin-text">
          <span className="text-admin-text-muted">ملاحظة العميل: </span>
          {b.customer_note}
        </p>
      ) : null}

      {b.cancellation_reason ? (
        <p className="mb-3 rounded-lg bg-admin-danger-tint px-3 py-2 text-[13px] text-admin-danger">
          السبب: {b.cancellation_reason}
        </p>
      ) : null}

      {b.refund_amount != null ? (
        <p className="mb-3 text-[12px] text-admin-text-muted">
          استُرد {formatSar(Number(b.refund_amount))}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {b.status === "pending_confirmation" ? (
          <>
            <form action={confirmBooking}>
              <input type="hidden" name="id" value={b.id} />
              <Button type="submit" variant="verify" size="sm">
                تأكيد الحجز
              </Button>
            </form>
            <form action={rejectBooking} className="flex items-center gap-2">
              <input type="hidden" name="id" value={b.id} />
              <input
                name="reason"
                placeholder="سبب الرفض"
                className="h-9 w-40 rounded-lg border border-admin-border bg-admin-surface px-3 text-[13px] text-admin-text"
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="border-admin-danger/40 text-admin-danger hover:bg-admin-danger-tint"
              >
                رفض
              </Button>
            </form>
          </>
        ) : null}

        {b.status === "confirmed" ? (
          <form action={startBooking}>
            <input type="hidden" name="id" value={b.id} />
            <Button type="submit" variant="brand" size="sm">
              تسليم السيارة
            </Button>
          </form>
        ) : null}

        {b.status === "active" ? (
          <form action={completeBooking}>
            <input type="hidden" name="id" value={b.id} />
            <Button type="submit" variant="verify" size="sm">
              استلام السيارة (إنهاء)
            </Button>
          </form>
        ) : null}

        {isOpen ? (
          <form action={cancelBookingAsAdmin} className="flex items-center gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input
              name="reason"
              placeholder="سبب الإلغاء"
              className="h-9 w-40 rounded-lg border border-admin-border bg-admin-surface px-3 text-[13px] text-admin-text"
            />
            <Button type="submit" variant="ghost" size="sm">
              إلغاء
            </Button>
          </form>
        ) : null}

        {b.payment_status === "paid" && ["cancelled", "rejected"].includes(b.status) ? (
          <form action={markRefunded} className="flex items-center gap-2">
            <input type="hidden" name="id" value={b.id} />
            <input
              name="amount"
              type="number"
              step="0.01"
              dir="ltr"
              placeholder={String(b.total)}
              className="h-9 w-28 rounded-lg border border-admin-border bg-admin-surface px-3 text-[13px] text-admin-text"
            />
            <Button type="submit" variant="brand-ghost" size="sm">
              تسجيل استرداد
            </Button>
          </form>
        ) : null}

        {b.car ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/cars/${b.car.id}/edit`}>السيارة</Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
