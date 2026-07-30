"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavCounts = {
  listings: number;
  franchises: number;
  verifications: number;
  accountants: number;
  reports: number;
};

type NavLink = {
  href: string;
  label: string;
  countKey?: keyof AdminNavCounts;
};

type NavGroup = {
  label: string;
  links: NavLink[];
};

// Grouped rather than one flat row: at nine-plus destinations a flat list
// stops communicating anything, and "what kind of thing is this" (review
// queue vs. full catalogue vs. account management) is exactly what an
// operator needs to scan for.
const GROUPS: NavGroup[] = [
  {
    label: "نظرة عامة",
    links: [{ href: "/admin", label: "الرئيسية" }],
  },
  {
    label: "المراجعة",
    links: [
      { href: "/admin/listings", label: "إعلانات بانتظار المراجعة", countKey: "listings" },
      { href: "/admin/franchises", label: "امتيازات بانتظار المراجعة", countKey: "franchises" },
      { href: "/admin/verification-requests", label: "طلبات التوثيق", countKey: "verifications" },
      { href: "/admin/reports", label: "البلاغات", countKey: "reports" },
    ],
  },
  {
    label: "الكتالوج الكامل",
    links: [
      { href: "/admin/all-listings", label: "كل الإعلانات" },
      { href: "/admin/all-franchises", label: "كل الامتيازات" },
    ],
  },
  {
    label: "الحسابات",
    links: [
      { href: "/admin/accountants", label: "المحاسبون", countKey: "accountants" },
      { href: "/admin/users", label: "كل الحسابات" },
    ],
  },
  {
    label: "النظام",
    links: [{ href: "/admin/errors", label: "سجل الأخطاء" }],
  },
];

export function AdminNav({ counts }: { counts: AdminNavCounts }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-5 overflow-x-auto pb-1">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex shrink-0 items-center gap-1.5">
          <span className="hidden text-[11px] font-bold uppercase tracking-wide text-admin-text-muted/70 md:inline">
            {group.label}
          </span>
          {group.links.map((link) => {
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            const count = link.countKey ? counts[link.countKey] : 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-admin-primary text-admin-on-primary"
                    : "text-admin-text-muted hover:bg-admin-bg hover:text-admin-text",
                )}
              >
                {link.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[11px] font-bold",
                      active
                        ? "bg-white/20 text-admin-on-primary"
                        : "bg-admin-amber-tint text-admin-amber",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
