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
    price_negotiable: true,
    show_profit: false,
    description: "",
    has_legal_obligations: false,
    reason_for_selling: "relocation" as const,
    financial_data_sharing: "on_request" as const,
    entity_type: "sole_proprietorship" as const,
    commercial_registration_number: "1010123456",
    confirm_no_branding: true,
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

  it("treats a blank asking price as not provided, not zero", () => {
    const result = listingFormSchema.safeParse({ ...base, asking_price: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.asking_price).toBeUndefined();
  });

  it("accepts a numeric asking price", () => {
    const result = listingFormSchema.safeParse({ ...base, asking_price: "500000" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.asking_price).toBe(500000);
  });

  it("rejects a negative monthly profit", () => {
    expect(
      listingFormSchema.safeParse({ ...base, monthly_profit: "-1" }).success,
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
