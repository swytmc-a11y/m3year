import { describe, expect, it } from "vitest";
import { formatDate, formatDateShort } from "@/lib/constants";

describe("formatDate", () => {
  it("renders Gregorian months, not Hijri", () => {
    // toLocaleDateString("ar-SA") gave "٢٨ ربيع الأول ١٤٤٨ هـ" for this day.
    expect(formatDate("2026-09-10")).toBe("10 سبتمبر 2026");
    expect(formatDateShort("2026-09-10")).toBe("10 سبتمبر");
  });

  it("keeps a calendar day on its own day", () => {
    // Parsed as UTC midnight, this renders as the 31st west of Greenwich.
    expect(formatDate("2026-01-01")).toBe("1 يناير 2026");
    expect(formatDate("2026-12-31")).toBe("31 ديسمبر 2026");
  });

  it("handles a full timestamp too", () => {
    expect(formatDate("2026-09-10T14:30:00+03:00")).toContain("سبتمبر");
  });

  it("has a dash for nothing and for nonsense", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("")).toBe("—");
    expect(formatDate("not-a-date")).toBe("—");
  });
});
