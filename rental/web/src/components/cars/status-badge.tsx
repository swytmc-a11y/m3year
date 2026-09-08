import { Badge } from "@/components/ui/badge";
import { CAR_STATUS_LABELS, type CarStatus } from "@/lib/cars/constants";

const STATUS_VARIANT: Record<CarStatus, "neutral" | "verify" | "pending" | "danger" | "muted"> = {
  draft: "neutral",
  available: "verify",
  maintenance: "pending",
  hidden: "muted",
};

export function CarStatusBadge({ status }: { status: CarStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{CAR_STATUS_LABELS[status]}</Badge>;
}
