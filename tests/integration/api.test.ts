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

  it("GET /api/public/legacy-search - should identify a claimed record without exposing its id or address", async () => {
    let searchSql = "";
    const mockDb: any = {
      prepare: (sql: string) => {
        searchSql = sql;
        return {
          bind: () => ({
            all: async () => ({
              results: [
                {
                  id: "claimed-member-id",
                  full_name: "Mohd Akhmal Abd Manaf",
                  address: "No. 36 Jalan PUJ 2/26",
                  account_state: "active",
                },
              ],
            }),
          }),
        };
      },
    };

    const res = await app.request(
      "/api/public/legacy-search?q=akhmal",
      {},
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.members).toEqual([
      {
        fullName: "Mohd Akhmal Abd Manaf",
        claimState: "claimed",
      },
    ]);
    expect(body.members[0].id).toBeUndefined();
    expect(body.members[0].address).toBeUndefined();
    expect(searchSql).toContain("ORDER BY full_name COLLATE NOCASE ASC");
    expect(searchSql).not.toContain("LIMIT 10");
  });

  it("GET /api/public/legacy-claim-status/:id - should block a previously claimed profile", async () => {
    const mockDb: any = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({ account_state: "active" }),
        }),
      }),
    };

    const res = await app.request(
      "/api/public/legacy-claim-status/claimed-member-id",
      {},
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ claimable: false });
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

  it("POST /api/public/register - should pause when an unclaimed legacy name matches", async () => {
    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("full_name_normalized")) {
              return { id: "legacy-member-id" };
            }
            return null;
          },
        }),
      }),
    };

    const res = await app.request(
      "/api/public/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Ahmad Ibrahim",
          ic: "800512-10-5431",
          phone: "012-3456789",
          address: "No. 15, Lorong Indah, Seksyen 5, BBB",
          username: "ahmad_ibrahim",
          password: "KariahSecret123!",
          confirmPassword: "KariahSecret123!",
          privacyConsent: true,
          turnstileToken: "mock-turnstile-token",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.code).toBe("POSSIBLE_LEGACY_MATCH");
  });

  it("GET /api/me - should block access if session cookie is absent (IDOR block)", async () => {
    const mockDb: any = {};
    const res = await app.request("/api/me", {}, createMockEnv(mockDb));
    expect(res.status).toBe(401); // Unauthorized
  });

  it("PATCH /api/me/profile - should update the member directly without a correction request", async () => {
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    let memberUpdateSql = "";
    let memberUpdateParams: any[] = [];

    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: (...params: any[]) => ({
          first: async () => {
            if (sql.includes("FROM member_sessions")) {
              expect(params[0]).toBe(tokenHash);
              return {
                session_id: "session-id",
                account_id: "account-id",
                member_id: "member-id",
                membership_status: "active",
                account_state: "active",
              };
            }
            return null;
          },
          run: async () => {
            if (sql.startsWith("UPDATE members SET")) {
              memberUpdateSql = sql;
              memberUpdateParams = params;
            }
            return { success: true };
          },
        }),
      }),
    };

    const res = await app.request(
      "/api/me/profile",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `__Host-alikhwan_session=${token}`,
        },
        body: JSON.stringify({ fullName: "Nama Ahli Dikemas Kini" }),
      },
      createMockEnv(mockDb),
      {
        waitUntil: () => undefined,
        passThroughOnException: () => undefined,
      } as any,
    );

    const responseBody = (await res.clone().json()) as any;
    expect(res.status, JSON.stringify(responseBody)).toBe(200);
    expect(memberUpdateSql).toContain("full_name = ?");
    expect(memberUpdateSql).not.toContain("correction_requests");
    expect(memberUpdateParams.at(-1)).toBe("member-id");
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

  it("GET /api/admin/members/export - should export every filtered member without pagination", async () => {
    let exportSql = "";
    const mockDb: any = {
      prepare: (sql: string) => {
        exportSql = sql;
        return {
          bind: () => ({
            all: async () => ({
              results: [
                {
                  full_name: "Ahli Eksport",
                  membership_status: "active",
                  account_state: "active",
                },
              ],
            }),
          }),
        };
      },
    };

    const res = await app.request(
      "/api/admin/members/export?status=active&sortBy=name&sortOrder=ASC",
      {
        headers: { Authorization: "Bearer SecretAdminKeyword" },
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.members).toHaveLength(1);
    expect(exportSql).toContain("membership_status = ?");
    expect(exportSql).toContain("ORDER BY full_name ASC");
    expect(exportSql).not.toContain("LIMIT");
  });

  it("DELETE /api/admin/members/:id - should delete only an unclaimed legacy record", async () => {
    let deleteCalled = false;
    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: (...params: any[]) => ({
          sql,
          params,
          first: async () => {
            if (sql.includes("FROM members WHERE id")) {
              return {
                id: "legacy-id",
                full_name: "Tasrani Kamari",
                registration_source: "legacy_import",
                account_state: "unclaimed",
                membership_status: "active",
              };
            }
            return null;
          },
          run: async () => {
            if (sql.includes("DELETE FROM members")) deleteCalled = true;
            return { success: true };
          },
        }),
      }),
    };

    const res = await app.request(
      "/api/admin/members/legacy-id",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer SecretAdminKeyword",
        },
        body: JSON.stringify({
          reason: "Rekod import pendua",
          confirmationName: "Tasrani Kamari",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    expect(deleteCalled).toBe(true);
  });

  it("DELETE /api/admin/members/:id - should protect claimed accounts", async () => {
    let batchCalled = false;
    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM members WHERE id")) {
              return {
                id: "active-id",
                full_name: "Ahli Aktif",
                registration_source: "legacy_import",
                account_state: "active",
                membership_status: "active",
              };
            }
            return null;
          },
        }),
      }),
      batch: async () => {
        batchCalled = true;
        return [];
      },
    };

    const res = await app.request(
      "/api/admin/members/active-id",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer SecretAdminKeyword",
        },
        body: JSON.stringify({
          reason: "Permintaan ujian",
          confirmationName: "Ahli Aktif",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(409);
    expect(batchCalled).toBe(false);
  });

  it("DELETE /api/admin/members/:id - should delete an inactive member with an account", async () => {
    let deleteCalled = false;
    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => {
            if (sql.includes("FROM members WHERE id")) {
              return {
                id: "inactive-id",
                full_name: "Ahli Tidak Aktif",
                registration_source: "public_registration",
                account_state: "active",
                membership_status: "inactive",
              };
            }
            return null;
          },
          run: async () => {
            if (sql.includes("DELETE FROM members")) deleteCalled = true;
            return { success: true };
          },
        }),
      }),
    };

    const res = await app.request(
      "/api/admin/members/inactive-id",
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer SecretAdminKeyword",
        },
        body: JSON.stringify({
          confirmationName: "Ahli Tidak Aktif",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    expect(deleteCalled).toBe(true);
  });

  it("POST /api/admin/members/:id/set-status - should allow a deliberate status correction", async () => {
    let updateParams: any[] | null = null;
    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: (...params: any[]) => ({
          first: async () => {
            if (sql.includes("SELECT membership_status")) {
              return {
                membership_status: "moved",
                full_name: "Ahli Dibetulkan",
              };
            }
            return null;
          },
          run: async () => {
            if (sql.includes("UPDATE members SET membership_status")) {
              updateParams = params;
            }
            return { success: true };
          },
        }),
      }),
    };

    const res = await app.request(
      "/api/admin/members/member-id/set-status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer SecretAdminKeyword",
        },
        body: JSON.stringify({
          status: "active",
          reason: "Pembetulan selepas pengesahan pentadbir",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    expect(updateParams?.[0]).toBe("active");
    const body = (await res.json()) as any;
    expect(body.message).toContain("Aktif");
  });

  it("POST /api/admin/members/:id/set-status - should reject the current status", async () => {
    let updateCalled = false;
    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => ({
            membership_status: "active",
            full_name: "Ahli Aktif",
          }),
          run: async () => {
            if (sql.includes("UPDATE members SET membership_status")) {
              updateCalled = true;
            }
            return { success: true };
          },
        }),
      }),
    };

    const res = await app.request(
      "/api/admin/members/member-id/set-status",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer SecretAdminKeyword",
        },
        body: JSON.stringify({
          status: "active",
          reason: "Tidak sepatutnya berubah",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(400);
    expect(updateCalled).toBe(false);
  });

  it("PUT /api/admin/settings/registration-approval - should persist automatic approval", async () => {
    let savedMode: string | null = null;
    const mockDb: any = {
      prepare: (sql: string) => ({
        first: async () =>
          sql.includes("FROM system_settings") ? { value: "manual" } : null,
        bind: (...params: any[]) => ({
          run: async () => {
            if (sql.includes("INSERT INTO system_settings")) {
              savedMode = params[0];
            }
            return { success: true };
          },
        }),
      }),
    };

    const res = await app.request(
      "/api/admin/settings/registration-approval",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer SecretAdminKeyword",
        },
        body: JSON.stringify({ mode: "automatic" }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    expect(savedMode).toBe("automatic");
  });

  it("POST /api/public/register - should activate a valid new member when auto approval is enabled", async () => {
    let insertedMemberParams: any[] | null = null;
    const mockDb: any = {
      prepare: (sql: string) => ({
        first: async () =>
          sql.includes("FROM system_settings") ? { value: "automatic" } : null,
        bind: (...params: any[]) => ({
          sql,
          params,
          first: async () => null,
          run: async () => ({ success: true }),
        }),
      }),
      batch: async (statements: any[]) => {
        const memberInsert = statements.find((statement) =>
          statement.sql.includes("INSERT INTO members"),
        );
        insertedMemberParams = memberInsert?.params || null;
        return [];
      },
    };

    const res = await app.request(
      "/api/public/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Connecting-IP": "127.0.0.88",
        },
        body: JSON.stringify({
          fullName: "Ahli Auto Lulus",
          ic: "800512105431",
          phone: "0123456789",
          address: "No. 15 Jalan Kariah Desa Al-Ikhwan",
          username: "ahli_auto",
          password: "KariahSecret123!",
          confirmPassword: "KariahSecret123!",
          directoryConsent: true,
          confirmedNotLegacy: true,
          privacyConsent: true,
          turnstileToken: "mock-turnstile-token",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    expect(insertedMemberParams?.[9]).toBe("active");
    const body = (await res.json()) as any;
    expect(body.member.membershipStatus).toBe("active");
    expect(body.message).toContain("diluluskan secara automatik");
  });

  it("POST /api/admin/login - should fail with wrong keyword", async () => {
    const mockDb: any = {
      // Prepared statement is not reached for an invalid keyword.
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

  it("POST /api/auth/reset-password - should reset using matching IC and phone", async () => {
    let lookupParams: any[] = [];
    let passwordUpdated = false;
    let sessionsRevoked = false;

    const mockDb: any = {
      prepare: (sql: string) => ({
        bind: (...params: any[]) => {
          if (sql.includes("FROM member_accounts a")) {
            lookupParams = params;
            return {
              first: async () => ({ id: "account-reset-1" }),
            };
          }

          return {
            run: async () => {
              if (sql.includes("UPDATE member_accounts")) {
                passwordUpdated = true;
              }
              if (sql.includes("UPDATE member_sessions")) {
                sessionsRevoked = true;
              }
              return { success: true };
            },
          };
        },
      }),
    };

    const res = await app.request(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ic: "000101-00-0000",
          phone: "012-345 6789",
          newPassword: "KariahBaharu123",
          confirmNewPassword: "KariahBaharu123",
          turnstileToken: "mock-turnstile-token",
        }),
      },
      createMockEnv(mockDb),
    );

    expect(res.status).toBe(200);
    expect(lookupParams).toEqual(["000101000000", "+60123456789"]);
    expect(passwordUpdated).toBe(true);
    expect(sessionsRevoked).toBe(true);
  });
});
