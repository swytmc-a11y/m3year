/**
 * Calendar-day arithmetic for rental periods.
 *
 * Dates are plain yyyy-mm-dd strings everywhere, never Date objects: the
 * database prices a booking from two calendar days, and a customer in one
 * timezone must not be able to land on a different day than the server. All
 * arithmetic here goes through UTC so a daylight-saving shift — which makes a
 * local day 23 or 25 hours long — cannot round a duration to the wrong number
 * of days.
 *
 * Kept free of React Native imports so it can be tested directly.
 */

export function toIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function todayIso(): string {
  const d = new Date();
  return toIso(d.getFullYear(), d.getMonth(), d.getDate());
}

function utcOf(iso: string): number {
  return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
}

/** Whole days between two dates. Half-open, matching the database's daterange. */
export function daysBetween(start: string, end: string): number {
  return Math.round((utcOf(end) - utcOf(start)) / 86400000);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(utcOf(iso));
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
