import * as React from "react";

import { cn } from "@/lib/utils";

// A styled native <select>. Native controls give the best mobile experience and
// keyboard accessibility for free, which suits this mobile-first product.
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "flex h-11 w-full appearance-none rounded-lg border border-grid bg-white px-4 pe-10 text-sm text-ink outline-none transition-colors focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink/40"
      >
        ▾
      </span>
    </div>
  );
}

export { Select };
