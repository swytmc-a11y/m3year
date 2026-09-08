import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-xl border border-grid bg-white p-6",
        className,
      )}
      {...props}
    />
  );
}

export { Card };
