import { z } from "zod";
import { parseIc, normalizePhone, isValidUsername } from "./validation.ts";

// 1. Password Schema
export const passwordSchema = z
  .string()
  .min(10, { message: "Kata laluan mestilah sekurang-kurangnya 10 aksara." })
  .max(128, { message: "Kata laluan tidak boleh melebihi 128 aksara." });

// 2. Username Schema
export const usernameSchema = z
  .string()
  .min(3, { message: "Nama pengguna mestilah sekurang-kurangnya 3 aksara." })
  .max(30, { message: "Nama pengguna tidak boleh melebihi 30 aksara." })
  .refine((val) => isValidUsername(val), {
    message:
      "Nama pengguna mengandungi aksara tidak dibenarkan atau merupakan nama khas terpelihara.",
  });

// 3. IC Schema (Registration specific: must be between 18 and 90)
export const icSchema = z
  .string()
  .refine(
    (val) => {
      const parsed = parseIc(val);
      return parsed !== null;
    },
    { message: "Format No. IC tidak sah." },
  )
  .refine(
    (val) => {
      const parsed = parseIc(val);
      if (!parsed) return false;
      return parsed.age >= 18 && parsed.age <= 90;
    },
    { message: "Umur mestilah di antara 18 hingga 90 tahun sahaja." },
  );

// 4. Phone Schema
export const phoneSchema = z
  .string()
  .refine((val) => normalizePhone(val) !== null, {
    message: "No. telefon tidak sah. Contoh format: 0123456789",
  });

// 5. Login Schema
export const loginSchema = z.object({
  username: z.string().min(1, { message: "Nama pengguna diperlukan." }),
  password: z.string().min(1, { message: "Kata laluan diperlukan." }),
});

// 6. Registration Schema (Combined)
export const registrationSchema = z
  .object({
    fullName: z
      .string()
      .min(3, { message: "Nama penuh mestilah sekurang-kurangnya 3 aksara." }),
    ic: icSchema,
    phone: phoneSchema,
    address: z
      .string()
      .min(10, { message: "Alamat mestilah sekurang-kurangnya 10 aksara." }),
    generalArea: z.string().optional(),
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, { message: "Pengesahan kata laluan diperlukan." }),
    directoryConsent: z.boolean().default(false),
    privacyConsent: z.boolean().refine((val) => val === true, {
      message: "Anda mesti bersetuju dengan Notis Privasi.",
    }),
    turnstileToken: z
      .string()
      .min(1, { message: "Sila lengkapkan pengesahan Turnstile." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata laluan dan pengesahan kata laluan tidak sepadan.",
    path: ["confirmPassword"],
  });

// 7. Membership Check Schema
export const membershipCheckSchema = z.object({
  ic: z.string().refine((val) => val.replace(/[\s-]/g, "").length === 12, {
    message: "No. IC mestilah mengandungi 12 digit.",
  }),
  phone: phoneSchema,
  turnstileToken: z
    .string()
    .min(1, { message: "Sila lengkapkan pengesahan Turnstile." }),
});

// 8. Account Claim Schema
export const accountClaimSchema = z
  .object({
    memberId: z.string().optional(),
    ic: z.string().refine((val) => val.replace(/[\s-]/g, "").length === 12, {
      message: "No. IC mestilah mengandungi 12 digit.",
    }),
    phone: phoneSchema,
    username: usernameSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, { message: "Pengesahan kata laluan diperlukan." }),
    privacyConsent: z.boolean().refine((val) => val === true, {
      message: "Anda mesti bersetuju dengan Notis Privasi.",
    }),
    turnstileToken: z
      .string()
      .min(1, { message: "Sila lengkapkan pengesahan Turnstile." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Kata laluan dan pengesahan kata laluan tidak sepadan.",
    path: ["confirmPassword"],
  });

// 9. Profile Correction Schema
export const profileCorrectionSchema = z.object({
  fullName: z
    .string()
    .min(3, { message: "Nama penuh mestilah sekurang-kurangnya 3 aksara." })
    .optional(),
  ic: z
    .string()
    .refine((val) => val.replace(/[\s-]/g, "").length === 12, {
      message: "No. IC mestilah mengandungi 12 digit.",
    })
    .optional(),
  phone: phoneSchema.optional(),
  address: z
    .string()
    .min(10, { message: "Alamat mestilah sekurang-kurangnya 10 aksara." })
    .optional(),
  generalArea: z.string().optional(),
});

// 10. Password Change Schema
export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Kata laluan semasa diperlukan." }),
    newPassword: passwordSchema,
    confirmNewPassword: z
      .string()
      .min(1, { message: "Pengesahan kata laluan baru diperlukan." }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Kata laluan baru dan pengesahan kata laluan tidak sepadan.",
    path: ["confirmNewPassword"],
  });
