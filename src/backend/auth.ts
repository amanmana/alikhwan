import {
  scrypt as _scrypt,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(_scrypt);

// 1. Password Hashing with Scrypt
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  })) as Buffer;
  return `scrypt$N=16384,r=8,p=1$${salt}$${derivedKey.toString("hex")}`;
}

// 2. Verify Password
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;

    const paramsStr = parts[1]; // N=16384,r=8,p=1
    const salt = parts[2];
    const hashHex = parts[3];

    const paramsObj: Record<string, number> = {};
    paramsStr.split(",").forEach((param) => {
      const [key, val] = param.split("=");
      paramsObj[key] = parseInt(val, 10);
    });

    const N = paramsObj["N"] || 16384;
    const r = paramsObj["r"] || 8;
    const p = paramsObj["p"] || 1;

    const derivedKey = (await scryptAsync(password, salt, 64, {
      N,
      r,
      p,
    })) as Buffer;
    const computedHash = derivedKey.toString("hex");

    const buf1 = Buffer.from(hashHex, "hex");
    const buf2 = Buffer.from(computedHash, "hex");

    if (buf1.length !== buf2.length) return false;
    return timingSafeEqual(buf1, buf2);
  } catch {
    return false;
  }
}

// 3. Constant-time check for Admin keyword using SHA-256 to prevent length leakage
export function verifyAdminKeyword(
  suppliedKeyword: string,
  actualKeyword: string,
): boolean {
  try {
    const hash1 = createHash("sha256").update(suppliedKeyword).digest();
    const hash2 = createHash("sha256").update(actualKeyword).digest();
    return timingSafeEqual(hash1, hash2);
  } catch {
    return false;
  }
}

// 4. Session Token Helpers
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
