import { CaliperMark } from "@/components/caliper-mark";
import { cn } from "@/lib/utils";

// The caliper-wrapped "موثّق" mark — the identity's trust signal. Appears
// wherever a listing's figures have been verified by an accountant.
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-verify/10 px-2.5 py-1.5 text-xs font-bold text-verify",
        className,
      )}
    >
      <CaliperMark className="text-[11px]" />
      موثّق
    </span>
  );
}
