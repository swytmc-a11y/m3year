import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
  {
    variants: {
      variant: {
        neutral: "bg-paper text-ink/70",
        verify: "bg-verify/10 text-verify",
        amber: "bg-amber/10 text-amber",
        pending: "bg-amber/10 text-amber",
        danger: "bg-red-100 text-red-700",
        muted: "bg-grid/40 text-ink/50",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
