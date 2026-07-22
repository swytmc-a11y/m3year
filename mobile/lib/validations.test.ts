import { describe, expect, it } from "vitest";
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  signInSchema,
  signUpSchema,
  listingFormSchema,
  ratingFormSchema,
} from "@/lib/validations";

describe("phoneSchema", () => {
  it("normalizes a local 05xxxxxxxx number to E.164", () => {
    expect(phoneSchema.parse("0512345678")).toBe("+966512345678");
  });

  it("accepts an already-E.164 number", () => {
    expect(phoneSchema.parse("+966512345678")).toBe("+966512345678");
  });

  it("rejects a non-Saudi-shaped number", () => {
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("rejects an empty string", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("accepts a valid address", () => {
    expect(emailSchema.parse(" a@b.com ")).toBe("a@b.com");
  });
});

describe("passwordSchema", () => {
  it("rejects passwords under 6 characters", () => {
    expect(passwordSchema.safeParse("abc12").success).toBe(false);
  });

  it("accepts a 6+ character password", () => {
    expect(passwordSchema.safeParse("abc123").success).toBe(true);
  });
});

describe("signInSchema / signUpSchema", () => {
  it("rejects sign-in with a blank password", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("accepts a well-formed sign-up payload", () => {
    const result = signUpSchema.safeParse({
      fullName: "Test User",
      email: "a@b.com",
      phone: "0512345678",
      password: "abc123",
    });
    expect(result.success).toBe(true);
  });
});

describe("listingFormSchema", () => {
  const base = {
    title: "مشروع تجريبي",
    sector: "cafe" as const,
    city: "جدة",
    monthly_revenue: "48200",
    offered_percentage: "25",
    description: "",
  };

  it("accepts a valid listing", () => {
    expect(listingFormSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an offered percentage of 0", () => {
    expect(
      listingFormSchema.safeParse({ ...base, offered_percentage: "0" }).success,
    ).toBe(false);
  });

  it("rejects an offered percentage over 100", () => {
    expect(
      listingFormSchema.safeParse({ ...base, offered_percentage: "150" }).success,
    ).toBe(false);
  });

  it("rejects negative monthly revenue", () => {
    expect(
      listingFormSchema.safeParse({ ...base, monthly_revenue: "-10" }).success,
    ).toBe(false);
  });
});

describe("ratingFormSchema", () => {
  it("rejects a score outside 1-5", () => {
    expect(ratingFormSchema.safeParse({ score: 6, comment: "" }).success).toBe(false);
  });

  it("accepts a valid score with no comment", () => {
    const result = ratingFormSchema.safeParse({ score: 5, comment: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.comment).toBeNull();
  });
});
