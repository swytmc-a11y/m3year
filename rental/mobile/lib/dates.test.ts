import { describe, expect, it } from "vitest";
import { daysBetween, addDays, toIso } from "@/lib/dates";

/**
 * The calendar decides how many days a customer is billed for, so its date
 * arithmetic has to agree with the database's half-open daterange exactly.
 * The cases that matter are the ones plain Date maths gets wrong: month and
 * year boundaries, leap days, and the daylight-saving shifts that make a
 * "day" 23 or 25 hours long in local time.
 */

describe("daysBetween", () => {
  it("counts the pickup day but not the return day", () => {
    // The rule stated in the booking screen: 1st to 3rd is two days.
    expect(daysBetween("2026-03-01", "2026-03-03")).toBe(2);
  });

  it("is zero for a same-day range", () => {
    expect(daysBetween("2026-03-01", "2026-03-01")).toBe(0);
  });

  it("crosses a month boundary", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toBe(3);
  });

  it("crosses a year boundary", () => {
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
  });

  it("counts the leap day in a leap year", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("skips it in a common year", () => {
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
  });

  it("is unaffected by daylight-saving shifts", () => {
    // Europe springs forward on 2026-03-29 and back on 2026-10-25. A local
    // Date subtraction across either returns 23 or 25 hours and rounds to the
    // wrong day count; the UTC arithmetic here must not.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });

  it("agrees with a month-long rental", () => {
    expect(daysBetween("2026-04-01", "2026-05-01")).toBe(30);
  });
});

describe("addDays", () => {
  it("rolls over a month end", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("rolls over a year end", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("produces the leap day only in a leap year", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("steps backwards", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("round-trips with daysBetween", () => {
    const start = "2026-06-15";
    for (const n of [1, 7, 30, 45, 366]) {
      expect(daysBetween(start, addDays(start, n))).toBe(n);
    }
  });
});

describe("toIso", () => {
  it("zero-pads single-digit months and days", () => {
    // A month index of 0 is January — an off-by-one here would silently
    // shift every date on the calendar by a month.
    expect(toIso(2026, 0, 5)).toBe("2026-01-05");
    expect(toIso(2026, 11, 25)).toBe("2026-12-25");
  });

  it("sorts correctly as a plain string", () => {
    // The whole calendar compares dates with < and >, which only works
    // because the format is fixed-width and zero-padded.
    expect(toIso(2026, 8, 9) < toIso(2026, 9, 1)).toBe(true);
    expect(toIso(2026, 0, 2) > toIso(2026, 0, 10)).toBe(false);
  });
});
