import { parsePhoneNumberFromString } from "libphonenumber-js";

// Malaysia is UTC+8
export function getKualaLumpurDate(date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const klTime = new Date(utc + 3600000 * 8);
  return {
    year: klTime.getFullYear(),
    month: klTime.getMonth() + 1,
    day: klTime.getDate(),
  };
}

export function calculateAge(
  birthDateStr: string,
  currentDate = getKualaLumpurDate(),
): number {
  const [bYear, bMonth, bDay] = birthDateStr.split("-").map(Number);
  let age = currentDate.year - bYear;
  if (
    currentDate.month < bMonth ||
    (currentDate.month === bMonth && currentDate.day < bDay)
  ) {
    age--;
  }
  return age;
}

export function parseIc(
  ic: string,
  currentDate = getKualaLumpurDate(),
): { birthDate: string; age: number } | null {
  const normalised = ic.replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(normalised)) return null;

  const yy = parseInt(normalised.substring(0, 2), 10);
  const mm = parseInt(normalised.substring(2, 4), 10);
  const dd = parseInt(normalised.substring(4, 6), 10);

  if (mm < 1 || mm > 12) return null;

  // Leap year and month day counts helper
  const daysInMonth = (year: number, month: number) =>
    new Date(year, month, 0).getDate();

  const birthYear1900 = 1900 + yy;
  const birthYear2000 = 2000 + yy;

  const date1900Str = `${birthYear1900}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const date2000Str = `${birthYear2000}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  const is1900Valid = dd >= 1 && dd <= daysInMonth(birthYear1900, mm);
  const is2000Valid = dd >= 1 && dd <= daysInMonth(birthYear2000, mm);

  if (!is1900Valid && !is2000Valid) return null;

  const age1900 = is1900Valid ? calculateAge(date1900Str, currentDate) : -1;
  const age2000 = is2000Valid ? calculateAge(date2000Str, currentDate) : -1;

  const is1900InRange = age1900 >= 18 && age1900 <= 90;
  const is2000InRange = age2000 >= 18 && age2000 <= 90;

  if (is2000InRange) {
    return { birthDate: date2000Str, age: age2000 };
  }
  if (is1900InRange) {
    return { birthDate: date1900Str, age: age1900 };
  }

  // Fallback if valid but out of range (useful for imported users that must not be deleted)
  if (is2000Valid && age2000 >= 0 && age2000 <= 120) {
    return { birthDate: date2000Str, age: age2000 };
  }
  if (is1900Valid && age1900 >= 0 && age1900 <= 120) {
    return { birthDate: date1900Str, age: age1900 };
  }

  return null;
}

export function cleanIc(ic: string | null | undefined): string {
  if (!ic) return "";
  return ic.replace(/[\s-]/g, "");
}

export function formatIcForDisplay(ic: string | null | undefined): string {
  if (!ic) return "Belum Dituntut";
  const cleaned = cleanIc(ic);
  if (cleaned.length === 12) {
    return `${cleaned.substring(0, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
  }
  return ic;
}

export function maskIc(ic: string | null | undefined): string {
  if (!ic) return "Belum Dituntut";
  const cleaned = cleanIc(ic);
  if (cleaned.length === 12) {
    return `******-**-${cleaned.substring(8)}`;
  }
  return ic;
}

export function normalizePhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  let cleanPhone = trimmed;
  if (
    !cleanPhone.startsWith("+") &&
    !cleanPhone.startsWith("60") &&
    cleanPhone.startsWith("0")
  ) {
    cleanPhone = "+60" + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith("+") && cleanPhone.startsWith("60")) {
    cleanPhone = "+" + cleanPhone;
  } else if (!cleanPhone.startsWith("+")) {
    cleanPhone = "+60" + cleanPhone;
  }

  const parsed = parsePhoneNumberFromString(cleanPhone);
  if (parsed && parsed.isValid()) {
    return parsed.format("E.164");
  }

  // Backup fallback using country code MY
  const parsedDirect = parsePhoneNumberFromString(trimmed, "MY");
  if (parsedDirect && parsedDirect.isValid()) {
    return parsedDirect.format("E.164");
  }

  return null;
}

export function formatPhoneForDisplay(
  phone: string | null | undefined,
): string {
  if (!phone) return "Belum Dituntut";
  const parsed = parsePhoneNumberFromString(phone, "MY");
  if (parsed && parsed.isValid()) {
    return parsed.formatNational();
  }
  return phone;
}

export function isValidUsername(username: string): boolean {
  // Safe character set: letters, numbers, underscores, and hyphens. Between 3 and 30 characters.
  const safeSet = /^[a-zA-Z0-9_-]{3,30}$/;
  if (!safeSet.test(username)) return false;

  // Reserved usernames check
  const reserved = [
    "admin",
    "administrator",
    "root",
    "system",
    "support",
    "surau",
  ];
  if (reserved.includes(username.toLowerCase())) return false;

  return true;
}
