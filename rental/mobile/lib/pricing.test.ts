import { describe, expect, it } from "vitest";
import {
  tierForDays,
  tierSavingPercent,
  vatFromInclusive,
  rentalDays,
  formatSar,
} from "@/lib/constants";

/**
 * quote_booking() in SQL is the authority on money. These helpers only exist
 * so the UI can show a tier table and a running total without a round trip —
 * which means any drift between them shows the customer a price the server
 * will not honour. The cases below are the same ones the database was
 * verified against.
 */
const CAR = { daily_price: 140, weekly_price: 120, monthly_price: 90 };

describe("tierForDays", () => {
  it("bills under a week at the daily rate", () => {
    expect(tierForDays(1, CAR)).toEqual({ tier: "daily", rate: 140 });
    expect(tierForDays(6, CAR)).toEqual({ tier: "daily", rate: 140 });
  });

  it("switches to the weekly rate at exactly seven days", () => {
    expect(tierForDays(7, CAR)).toEqual({ tier: "weekly", rate: 120 });
    expect(tierForDays(29, CAR)).toEqual({ tier: "weekly", rate: 120 });
  });

  it("switches to the monthly rate at exactly thirty days", () => {
    expect(tierForDays(30, CAR)).toEqual({ tier: "monthly", rate: 90 });
    expect(tierForDays(120, CAR)).toEqual({ tier: "monthly", rate: 90 });
  });

  it("falls back to the next rate down when a tier is not priced", () => {
    expect(tierForDays(10, { daily_price: 140, weekly_price: null, monthly_price: null })).toEqual({
      tier: "daily",
      rate: 140,
    });
    expect(tierForDays(45, { daily_price: 140, weekly_price: 120, monthly_price: null })).toEqual({
      tier: "weekly",
      rate: 120,
    });
  });

  it("applies the tier to the whole period, matching the server", () => {
    const seven = tierForDays(7, CAR);
    expect(seven.rate * 7).toBe(840);
    const thirty = tierForDays(30, CAR);
    expect(thirty.rate * 30).toBe(2700);
  });
});

describe("tierSavingPercent", () => {
  it("reports the discount against the daily rate", () => {
    expect(tierSavingPercent(140, 120)).toBe(14);
    expect(tierSavingPercent(140, 90)).toBe(36);
  });

  it("reports nothing when a tier is not actually cheaper", () => {
    expect(tierSavingPercent(140, 140)).toBe(0);
    expect(tierSavingPercent(140, 150)).toBe(0);
    expect(tierSavingPercent(0, 90)).toBe(0);
  });
});

describe("vatFromInclusive", () => {
  it("extracts VAT from a total rather than adding it on top", () => {
    // 420 inclusive at 15% => 365.22 net + 54.78 VAT, never 420 + 63.
    expect(vatFromInclusive(420, 0.15)).toBe(54.78);
    expect(vatFromInclusive(495, 0.15)).toBe(64.57);
  });

  it("returns zero VAT at a zero rate", () => {
    expect(vatFromInclusive(420, 0)).toBe(0);
  });
});

describe("rentalDays", () => {
  it("treats the return date as exclusive, so Jan 1 to Jan 3 is two days", () => {
    expect(rentalDays("2026-01-01", "2026-01-03")).toBe(2);
    expect(rentalDays("2026-01-01", "2026-01-02")).toBe(1);
  });

  it("counts across a month boundary", () => {
    expect(rentalDays("2026-01-28", "2026-02-04")).toBe(7);
  });
});

describe("formatSar", () => {
  it("drops decimals on whole amounts and keeps two otherwise", () => {
    expect(formatSar(420)).toBe("420 ر.س");
    expect(formatSar(54.78)).toBe("54.78 ر.س");
  });

  it("renders a missing amount as a dash rather than 0", () => {
    expect(formatSar(null)).toBe("—");
    expect(formatSar(undefined)).toBe("—");
  });
});
