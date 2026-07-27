"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "نظرة عامة" },
  { href: "/admin/listings", label: "مراجعة الإعلانات" },
  { href: "/admin/all-listings", label: "كل الإعلانات" },
  { href: "/admin/franchises", label: "مراجعة الامتيازات" },
  { href: "/admin/all-franchises", label: "كل الامتيازات" },
  { href: "/admin/verification-requests", label: "طلبات التوثيق" },
  { href: "/admin/accountants", label: "المحاسبون" },
  { href: "/admin/users", label: "كل الحسابات" },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto sm:gap-2">
      {LINKS.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-ink text-white"
                : "text-ink/60 hover:bg-paper hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
