import Link from "next/link";
import { cn } from "@/lib/utils";

export type CatalogueType = "investment" | "franchise";

const TABS: { value: CatalogueType; label: string }[] = [
  { value: "investment", label: "فرص استثمارية" },
  { value: "franchise", label: "امتيازات تجارية" },
];

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) sp.set(key, value);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Switches between the investment-listing and franchise views of a merged
 * admin page — same "فرص استثمارية / امتيازات تجارية" split the mobile
 * app's Home tab uses, so the two ends of the product describe the same
 * catalogue the same way. `otherParams` carries along any other query
 * param (e.g. a status filter) so switching type doesn't reset it.
 */
export function AdminTypeTabs({
  basePath,
  type,
  otherParams,
  counts,
}: {
  basePath: string;
  type: CatalogueType;
  otherParams?: Record<string, string | undefined>;
  counts?: Record<CatalogueType, number>;
}) {
  return (
    <div className="mb-6 flex gap-2">
      {TABS.map((tab) => {
        const href = `${basePath}${buildQuery({ ...otherParams, type: tab.value === "investment" ? undefined : tab.value })}`;
        const active = type === tab.value;
        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
              active
                ? "bg-admin-primary text-admin-on-primary"
                : "border border-admin-border bg-admin-surface text-admin-text-muted hover:text-admin-text",
            )}
          >
            {tab.label}
            {counts ? <span className="ms-1.5 opacity-70">({counts[tab.value]})</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
