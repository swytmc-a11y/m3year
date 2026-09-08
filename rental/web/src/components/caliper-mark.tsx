import { cn } from "@/lib/utils";

export function CaliperMark({ className }: { className?: string }) {
  return <span className={cn("caliper", className)} aria-hidden="true" />;
}
