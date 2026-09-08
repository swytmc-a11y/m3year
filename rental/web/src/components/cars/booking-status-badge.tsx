import { Badge } from "@/components/ui/badge";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/lib/cars/constants";

const STATUS_VARIANT: Record<BookingStatus, "neutral" | "verify" | "pending" | "danger" | "muted"> = {
  pending_payment: "pending",
  pending_confirmation: "pending",
  confirmed: "verify",
  active: "verify",
  completed: "neutral",
  cancelled: "muted",
  rejected: "danger",
  expired: "muted",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{BOOKING_STATUS_LABELS[status]}</Badge>;
}
