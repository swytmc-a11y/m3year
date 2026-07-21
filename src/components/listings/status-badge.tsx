import { Badge } from "@/components/ui/badge";
import {
  LISTING_STATUS_LABELS,
  type ListingStatus,
} from "@/lib/listings/constants";

const STATUS_VARIANT: Record<
  ListingStatus,
  "neutral" | "verify" | "pending" | "danger" | "muted"
> = {
  draft: "neutral",
  pending_review: "pending",
  published: "verify",
  rejected: "danger",
  archived: "muted",
};

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {LISTING_STATUS_LABELS[status]}
    </Badge>
  );
}
