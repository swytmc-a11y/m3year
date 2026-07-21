import { Badge } from "@/components/ui/badge";
import type { Database } from "@/lib/supabase/database.types";

type RequestStatus = Database["public"]["Enums"]["verification_request_status"];

const LABELS: Record<RequestStatus, string> = {
  requested: "بانتظار الإسناد",
  assigned: "مُسند لمحاسب",
  in_review: "قيد المراجعة",
  completed: "مكتمل",
  rejected: "مرفوض",
};

const VARIANTS: Record<
  RequestStatus,
  "neutral" | "verify" | "pending" | "danger" | "muted"
> = {
  requested: "pending",
  assigned: "neutral",
  in_review: "neutral",
  completed: "verify",
  rejected: "danger",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
