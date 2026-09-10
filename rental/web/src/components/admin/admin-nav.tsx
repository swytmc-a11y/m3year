"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavCounts = {
  pendingBookings: number;
  todayPickups: number;
  todayReturns: number;
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

// Ordered the way an operator actually works a day: what needs answering
// now, then the fleet, then the accounts, then the system trail.
const GROUPS: NavGroup[] = [
  {
    label: "نظرة عامة",
    links: [{ href: "/admin", label: "الرئيسية" }],
  },
  {
    label: "التشغيل",
    links: [
      { href: "/admin/bookings", label: "الحجوزات", countKey: "pendingBookings" },
      { href: "/admin/today", label: "حركة اليوم", countKey: "todayPickups" },
    ],
  },
  {
    label: "الأسطول",
    links: [
      { href: "/admin/cars", label: "السيارات" },
      { href: "/admin/branches", label: "الفروع" },
      { href: "/admin/addons", label: "الخدمات الإضافية" },
      { href: "/admin/delivery-zones", label: "مناطق التوصيل" },
    ],
  },
  {
    label: "التسويق",
    links: [
      { href: "/admin/banners", label: "البنرات" },
      { href: "/admin/curation", label: "تخصيص الرئيسية" },
      { href: "/admin/coupons", label: "رموز الخصم" },
    ],
  },
  {
    label: "الحسابات",
    links: [
      { href: "/admin/users", label: "العملاء" },
      { href: "/admin/reviews", label: "التقييمات" },
    ],
  },
  {
    label: "النظام",
    links: [
      { href: "/admin/settings", label: "الإعدادات" },
      { href: "/admin/billing", label: "الفوترة والمحفظة" },
      { href: "/admin/audit-log", label: "سجل العمليات" },
      { href: "/admin/errors", label: "سجل الأخطاء" },
    ],
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
