import { describe, expect, it } from "vitest";
import { countAr, CARS_NOUN, DAYS_NOUN } from "@/lib/arabic";

describe("countAr", () => {
  it("negates rather than printing a zero", () => {
    expect(countAr(0, CARS_NOUN)).toBe("لا سيارات");
  });

  it("carries the number inside the word for one and two", () => {
    // "1 سيارة واحدة" and "2 سيارتان" both say the number twice.
    expect(countAr(1, CARS_NOUN)).toBe("سيارة واحدة");
    expect(countAr(2, CARS_NOUN)).toBe("سيارتان");
  });

  it("uses the plural of paucity for three to ten", () => {
    expect(countAr(3, CARS_NOUN)).toBe("3 سيارات");
    expect(countAr(10, CARS_NOUN)).toBe("10 سيارات");
  });

  it("returns to the singular from eleven up", () => {
    expect(countAr(11, CARS_NOUN)).toBe("11 سيارة");
    expect(countAr(13, CARS_NOUN)).toBe("13 سيارة");
    expect(countAr(100, CARS_NOUN)).toBe("100 سيارة");
  });

  it("repeats the bands every hundred", () => {
    expect(countAr(103, CARS_NOUN)).toBe("103 سيارات");
    expect(countAr(111, CARS_NOUN)).toBe("111 سيارة");
    expect(countAr(203, CARS_NOUN)).toBe("203 سيارات");
  });

  it("applies the same bands to any noun", () => {
    expect(countAr(1, DAYS_NOUN)).toBe("يوم واحد");
    expect(countAr(2, DAYS_NOUN)).toBe("يومان");
    expect(countAr(5, DAYS_NOUN)).toBe("5 أيام");
    expect(countAr(15, DAYS_NOUN)).toBe("15 يومًا");
  });

  it("ignores sign and fractions rather than rendering them", () => {
    expect(countAr(-3, CARS_NOUN)).toBe("3 سيارات");
    expect(countAr(3.7, CARS_NOUN)).toBe("3 سيارات");
  });
});
