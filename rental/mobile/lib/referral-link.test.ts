import { describe, expect, it } from "vitest";
import { parseReferralCode } from "@/lib/referral-link";

describe("parseReferralCode", () => {
  it("reads a code from the app scheme and from a web link", () => {
    expect(parseReferralCode("sumu://invite/NAAVQD")).toBe("NAAVQD");
    expect(parseReferralCode("https://smo-rental.vercel.app/invite/NAAVQD")).toBe("NAAVQD");
  });

  it("upper-cases, because codes are typed and shared by hand", () => {
    expect(parseReferralCode("sumu://invite/naavqd")).toBe("NAAVQD");
  });

  it("ignores anything trailing the code", () => {
    expect(parseReferralCode("https://x/invite/NAAVQD?utm=whatsapp")).toBe("NAAVQD");
    expect(parseReferralCode("https://x/invite/NAAVQD/")).toBe("NAAVQD");
  });

  it("returns nothing for a link that is not an invite", () => {
    expect(parseReferralCode("sumu://cars/123")).toBeNull();
    expect(parseReferralCode("https://x/invite/")).toBeNull();
    expect(parseReferralCode(null)).toBeNull();
  });
});
