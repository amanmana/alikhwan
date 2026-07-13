import { describe, it, expect } from "vitest";
import {
  parseIc,
  cleanIc,
  normalizePhone,
  formatPhoneInput,
  isValidUsername,
  calculateAge,
} from "../../src/shared/validation.ts";
import {
  hashPassword,
  verifyPassword,
  verifyAdminKeyword,
} from "../../src/backend/auth.ts";

describe("IC Normalisation and Age Parsing", () => {
  // Mock current date as 2026-07-13
  const mockCurrentDate = { year: 2026, month: 7, day: 13 };

  it("should clean hyphens and spaces from IC", () => {
    expect(cleanIc("900512-10-5431")).toBe("900512105431");
    expect(cleanIc(" 900512 10 5431 ")).toBe("900512105431");
  });

  it("should parse standard valid IC and calculate age", () => {
    const res = parseIc("900512-10-5431", mockCurrentDate);
    expect(res).not.toBeNull();
    expect(res?.birthDate).toBe("1990-05-12");
    expect(res?.age).toBe(36);
  });

  it("should validate age exactly 18 years old", () => {
    // Born 2008-07-13, current is 2026-07-13 -> exactly 18
    const res = parseIc("080713-10-1234", mockCurrentDate);
    expect(res).not.toBeNull();
    expect(res?.age).toBe(18);
  });

  it("should validate age exactly 90 years old", () => {
    // Born 1936-07-13, current is 2026-07-13 -> exactly 90
    const res = parseIc("360713-10-1234", mockCurrentDate);
    expect(res).not.toBeNull();
    expect(res?.age).toBe(90);
  });

  it("should detect under-18 age", () => {
    // Born 2008-07-14, current is 2026-07-13 -> 17 years old
    const res = parseIc("080714-10-1234", mockCurrentDate);
    expect(res).not.toBeNull();
    expect(res?.age).toBe(17);
  });

  it("should detect over-90 age", () => {
    // Born 1935-07-13, current is 2026-07-13 -> 91 years old
    const res = parseIc("350713-10-1234", mockCurrentDate);
    expect(res).not.toBeNull();
    expect(res?.age).toBe(91);
  });

  it("should reject impossible dates (e.g. Feb 30)", () => {
    const res = parseIc("900230-10-1234", mockCurrentDate);
    expect(res).toBeNull();
  });

  it("should reject invalid month (e.g. Month 13)", () => {
    const res = parseIc("901312-10-1234", mockCurrentDate);
    expect(res).toBeNull();
  });

  it("should reject invalid leap year (e.g. Feb 29 in 2001)", () => {
    const res = parseIc("010229-10-1234", mockCurrentDate);
    expect(res).toBeNull();
  });

  it("should parse valid leap year (e.g. Feb 29 in 2004)", () => {
    const res = parseIc("040229-10-1234", mockCurrentDate);
    expect(res).not.toBeNull();
    expect(res?.birthDate).toBe("2004-02-29");
  });
});

describe("Phone Number Normalisation", () => {
  it("should normalise local Malaysian phone numbers with country code", () => {
    expect(normalizePhone("0123456789")).toBe("+60123456789");
    expect(normalizePhone("60123456789")).toBe("+60123456789");
    expect(normalizePhone("+60123456789")).toBe("+60123456789");
  });

  it("should reject invalid phone numbers", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("abcdefghijk")).toBeNull();
  });

  it("should format Malaysian phone input consistently", () => {
    expect(formatPhoneInput("0123456789")).toBe("012-345 6789");
    expect(formatPhoneInput("+60123456789")).toBe("012-345 6789");
    expect(formatPhoneInput("01112345678")).toBe("011-1234 5678");
  });
});

describe("Username Constraints", () => {
  it("should permit valid usernames", () => {
    expect(isValidUsername("akmal_123")).toBe(true);
    expect(isValidUsername("ahmad-ibrahim")).toBe(true);
  });

  it("should reject too short or too long usernames", () => {
    expect(isValidUsername("ak")).toBe(false);
    expect(isValidUsername("a".repeat(31))).toBe(false);
  });

  it("should reject reserved names", () => {
    expect(isValidUsername("admin")).toBe(false);
    expect(isValidUsername("Administrator")).toBe(false);
    expect(isValidUsername("root")).toBe(false);
  });
});

describe("Cryptographic Authentication functions", () => {
  it("should hash and verify passwords using scrypt", async () => {
    const password = "KariahSecret123!";
    const hash = await hashPassword(password);

    expect(hash).toContain("scrypt$");
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword", hash)).toBe(false);
  });

  it("should verify admin keyword securely without length leaks", () => {
    const keyword = "MagicSecretKeyword";
    expect(verifyAdminKeyword(keyword, keyword)).toBe(true);
    expect(verifyAdminKeyword("WrongKeyword", keyword)).toBe(false);
    // test different lengths
    expect(verifyAdminKeyword("Short", keyword)).toBe(false);
  });
});
