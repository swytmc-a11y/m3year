/**
 * Arabic counted nouns.
 *
 * Arabic does not have one plural. The noun changes form with the number in
 * five bands, and getting it wrong is immediately visible to every reader:
 *
 *   0        لا سيارات        (negated plural)
 *   1        سيارة واحدة      (singular)
 *   2        سيارتان          (dual — its own form, not "2 + plural")
 *   3–10     ٣ سيارات         (plural of paucity)
 *   11+      ١١ سيارة         (singular again, after the number)
 *
 * The app was printing the singular for every count, so a search that found
 * three cars said "3 سيارة".
 */
export type ArabicNoun = {
  /** لا سيارات */
  zero: string;
  /** سيارة واحدة */
  one: string;
  /** سيارتان */
  two: string;
  /** ٣ سيارات — the word only, the number is prefixed */
  few: string;
  /** ١١ سيارة — the word only, the number is prefixed */
  many: string;
};

export const CARS_NOUN: ArabicNoun = {
  zero: "لا سيارات",
  one: "سيارة واحدة",
  two: "سيارتان",
  few: "سيارات",
  many: "سيارة",
};

export const DAYS_NOUN: ArabicNoun = {
  zero: "بلا أيام",
  one: "يوم واحد",
  two: "يومان",
  few: "أيام",
  many: "يومًا",
};

export const REVIEWS_NOUN: ArabicNoun = {
  zero: "لا تقييمات",
  one: "تقييم واحد",
  two: "تقييمان",
  few: "تقييمات",
  many: "تقييمًا",
};

export const BOOKINGS_NOUN: ArabicNoun = {
  zero: "لا حجوزات",
  one: "حجز واحد",
  two: "حجزان",
  few: "حجوزات",
  many: "حجزًا",
};

/**
 * "٣ سيارات" / "سيارتان" / "لا سيارات".
 *
 * Counts of 0, 1 and 2 carry the number inside the word itself, so the digit
 * is deliberately not printed for them — "2 سيارتان" reads as "two two-cars".
 */
export function countAr(count: number, noun: ArabicNoun): string {
  const n = Math.abs(Math.trunc(count));

  if (n === 0) return noun.zero;
  if (n === 1) return noun.one;
  if (n === 2) return noun.two;

  // The band repeats every hundred: 103 behaves like 3, 111 like 11.
  const lastTwo = n % 100;
  if (lastTwo >= 3 && lastTwo <= 10) return `${n} ${noun.few}`;
  return `${n} ${noun.many}`;
}
