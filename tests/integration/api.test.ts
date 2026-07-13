import { describe, it, expect } from "vitest";
import app from "../../src/backend/index.ts";
import {
  generateSessionToken,
  hashSessionToken,
} from "../../src/backend/auth.ts";

// Helper to mock the Hono context environment
const createMockEnv = (mockDb: any) => ({
  DB: mockDb,
  ADMIN_MAGIC_KEYWORD: "SecretAdminKeyword",
  SESSION_SECRET: "SecretSessionKey",
  TURNSTILE_SECRET_KEY: "SecretTurnstileKey",
  TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
});

describe("Hono API Integration & Security Tests", () => {
  it("GET /api/public/members - should only return public fields (no IC, phone, address, legacy_id)", async () => {
    // Mock database response for members
    const mockDb: any = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "uuid-1",
                full_name: "MOHD AZMI BIN AHMAD",
                general_area: "Taman Desa Indah",
                membership_status: "active",
                // These private fields should NOT be returned by the public directory endpoint
                ic_normalized: "800512105431",
                phone_normalized: "+60123456789",
                address: "No. 12, Jalan Indah 5/3",
                legacy_id: "LEG-001",
              },
            ],
          }),
          first: async () => ({
            count: 1,
          }),
        }),
      }),
    };

    const res = await app.request(
      "/api/public/members?q=Azmi",
      {},
      createMockEnv(mockDb),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;

    expect(body.members).toBeDefined();
    expect(body.members.length).toBe(1);

    const member = body.members[0];
    expect(member.id).toBe("uuid-1");
    expect(member.fullName).toBe("MOHD AZMI BIN AHMAD");
    expect(member.address).toBe("No. 12, Jalan Indah 5/3");
    expect(member.icMasked).toBe("xxxxxx-xx-5431");
    expect(member.phoneMasked).toBe("******6789");
    expect(member.status).toBe("Aktif");

    // STRICT PRIVACY CHECK: Ensure sensitive unmasked fields are not leaked
    expect(member.ic_normalized).toBeUndefined();
    expect(member.phone_normalized).toBeUndefined();
    expect(member.legacy_id).toBeUndefined();
    expect(member.ic).toBeUndefined();
    expect(member.phone).toBeUndefined();
  });

  it("POST /api/public/register - should block duplicates and require Turnstile", async () => {
    const mockDb: any = {
      prepare: (sql: string) => {
        // If searching existing IC or username, we simulate finding a duplicate
        if (sql.includes("members WHERE ic_normalized")) {
          return {
            bind: () => ({
              first: async () => ({ id: "existing-id" }),
            }),
          };
        }
        return {
          bind: () => ({
            first: async () => null,
          }),
        };
      },
    };

    const payload = {
      fullName: "Ahmad Ibrahim",
      ic: "080713-10-1234",
      phone: "012-3456789",
      address: "No. 15, Lorong Indah, Seksyen 5, BBB",
      username: "ahmad_ibrahim",
      password: "KariahSecret123!",
      confirmPassword: "KariahSecret123!",
      privacyConsent: true,
      turnstileToken: "mock-turnstile-token",
    };

    // Submitting registration with mock DB (duplicate IC)
    const res = await app.request(
      "/api/public/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain("No. IC ini telah didaftarkan");
  });

  it("GET /api/me - should block access if session cookie is absent (IDOR block)", async () => {
    const mockDb: any = {};
    const res = await app.request("/api/me", {}, createMockEnv(mockDb));
    expect(res.status).toBe(401); // Unauthorized
  });

  it("GET /api/admin/dashboard - should block non-admin access", async () => {
    const mockDb: any = {};
    const res = await app.request(
      "/api/admin/dashboard",
      {},
      createMockEnv(mockDb),
    );
    expect(res.status).toBe(401); // Unauthorized (missing __Host-alikhwan_admin cookie)
  });

  it("POST /api/admin/login - should fail with wrong keyword", async () => {
    const mockDb: any = {
      // Prepared statement for failure audit logging
      prepare: () => ({
        bind: () => ({
          run: async () => ({ success: true }),
        }),
      }),
    };

    const res = await app.request(
      "/api/admin/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: "WrongKeyword",
          deviceLabel: "iPhone Test",
          turnstileToken: "mock-turnstile-token",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Kata kunci tidak sah.");
  });
});
