import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-ink text-white hover:bg-ink/90",
        ghost: "border-[1.5px] border-ink text-ink hover:bg-ink/5",
        verify: "bg-verify text-white hover:bg-verify/90",
        // Admin control panel's brand accent (indigo) — opt-in so the
        // public site's monochrome "primary" button is untouched.
        brand: "bg-admin-primary text-admin-on-primary hover:bg-admin-primary-pressed focus-visible:ring-admin-primary",
        "brand-ghost": "border-[1.5px] border-admin-primary text-admin-primary hover:bg-admin-primary/5 focus-visible:ring-admin-primary",
        danger: "border-[1.5px] border-admin-danger text-admin-danger hover:bg-admin-danger/5 focus-visible:ring-admin-danger",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[13px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
