import { test, expect } from "@playwright/test";

test.describe("e-Kariah Al-Ikhwan E2E Journeys", () => {
  // Setup API route mocking for frontend testing
  test.beforeEach(async ({ page }) => {
    // Mock the startup session check to unauthenticated visitor
    await page.route("/api/auth/session", async (route) => {
      await route.fulfill({ json: { authenticated: false } });
    });

    await page.route("/api/admin/session", async (route) => {
      await route.fulfill({ json: { authenticated: false } });
    });

    await page.route("/api/public/members*", async (route) => {
      await route.fulfill({
        json: {
          members: [
            {
              id: "uuid-1",
              fullName: "MOHD AZMI BIN AHMAD",
              generalArea: "Taman Desa Indah",
              status: "Ahli Aktif",
            },
          ],
        },
      });
    });
  });

  test("Journey 1: Public Homepage & Directory Search", async ({ page }) => {
    await page.goto("/");

    // Check title in Bahasa Melayu
    await expect(page.locator("h2")).toContainText(
      "Selamat Datang ke e-Kariah Al-Ikhwan",
    );

    // Navigate to public directory
    await page.click("text=Cari Ahli");
    await expect(page).toHaveURL("/ahli");

    // Verify search input is present
    const searchInput = page.locator(
      'input[placeholder="Cari nama ahli kariah..."]',
    );
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill("Azmi");

    // Wait for mock result card
    const card = page.locator("text=MOHD AZMI BIN AHMAD");
    await expect(card).toBeVisible();
  });

  test("Journey 2: 3-Step Registration Wizard & State Preservation", async ({
    page,
  }) => {
    await page.goto("/daftar");

    // Step 1: Personal Info
    await page.fill(
      'input[placeholder="Contoh: Ahmad bin Ibrahim"]',
      "Ahmad Ibrahim",
    );
    await page.fill(
      'input[placeholder="Contoh: YYMMDD-SS-NNNN"]',
      "080713-10-1234",
    );
    await page.click('button:has-text("Seterusnya")');

    // Step 2: Contact Info
    await expect(page.locator("h3")).toContainText("Langkah 2 daripada 3");
    await page.fill('input[placeholder="Contoh: 012-3456789"]', "012-3456789");
    await page.fill(
      'textarea[placeholder="Masukkan alamat lengkap rumah anda..."]',
      "No. 15, Lorong Indah, Seksyen 5, BBB",
    );
    await page.click('button:has-text("Seterusnya")');

    // Step 3: Account credentials
    await expect(page.locator("h3")).toContainText("Langkah 3 daripada 3");
    await page.fill(
      'input[placeholder="Contoh: ahmad_ibrahim"]',
      "ahmad_ibrahim",
    );
    await page.fill(
      'input[placeholder="Minima 10 aksara"]',
      "KariahSecret123!",
    );
    await page.fill(
      'input[placeholder="Masukkan semula kata laluan"]',
      "KariahSecret123!",
    );

    // Verify privacy check is present
    await page.check("input#privacy-consent");
  });

  test("Journey 3: Membership Check & Account Claim Flow", async ({ page }) => {
    await page.route("/api/public/legacy-search**", async (route) => {
      await route.fulfill({
        json: {
          members: [
            {
              id: "legacy-uuid-1",
              fullName: "AHMAD BIN IBRAHIM",
              address: "Jalan PUJ 2/2",
            },
          ],
        },
      });
    });

    await page.goto("/semak-keahlian");
    await page.fill(
      'input[placeholder="Contoh: Ahmad bin Ibrahim"]',
      "Ahmad bin Ibrahim",
    );
    await page.click('button:has-text("Cari Nama Saya")');

    const claimButton = page.locator('button:has-text("Ini Rekod Saya")');
    await expect(claimButton).toBeVisible();
    await claimButton.click();
    await expect(page).toHaveURL(/\/tuntut-akaun$/);
    await expect(page.locator("text=AHMAD BIN IBRAHIM")).toBeVisible();
  });

  test("Journey 4: Admin Magic Keyword Enrollment", async ({ page }) => {
    await page.goto("/admin/login");

    // Verify warnings are present for shared computers
    await expect(
      page.locator("text=PERINGATAN: Mod ini mendaftarkan sesi pentadbir"),
    ).toBeVisible();

    await page.fill(
      'input[placeholder="Masukkan kata kunci keselamatan"]',
      "SecretAdminKeyword",
    );
    await page.fill(
      'input[placeholder="Contoh: MacBook Akmal, Telefon Pintar iPhone"]',
      "Chrome Mac Testing",
    );

    // Mock successful admin login
    await page.route("/api/admin/login", async (route) => {
      await route.fulfill({
        json: { success: true, message: "Daftar masuk pentadbir berjaya." },
      });
    });
  });

  test("Journey 5: Admin permanently deletes an unclaimed legacy duplicate", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("alikhwan_admin_auth", "true");
    });

    let deleteRequestReceived = false;
    await page.route("/api/admin/members?*", async (route) => {
      await route.fulfill({
        json: {
          members: [
            {
              id: "legacy-id",
              full_name: "Tasrani Kamari",
              ic_normalized: null,
              phone_normalized: null,
              membership_status: "active",
              account_state: "unclaimed",
              directory_visible: 0,
            },
          ],
          pagination: { total: 1, page: 1, totalPages: 1 },
        },
      });
    });

    await page.route("/api/admin/members/legacy-id", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteRequestReceived = true;
        await route.fulfill({
          json: {
            success: true,
            message: "Rekod ahli lama berjaya dipadam secara kekal.",
          },
        });
        return;
      }

      await route.fulfill({
        json: {
          member: {
            id: "legacy-id",
            legacy_id: "LEG-001",
            full_name: "Tasrani Kamari",
            ic_normalized: null,
            phone_normalized: null,
            address: "Jalan PUJ 2/2",
            general_area: null,
            membership_status: "active",
            account_state: "unclaimed",
            directory_visible: 0,
            registration_source: "legacy_import",
            admin_notes: null,
          },
          account: null,
        },
      });
    });

    await page.goto("/admin/ahli");
    await page.click('button:has-text("Urus")');
    await expect(page.locator("text=Zon Bahaya")).toBeVisible();
    await page.click('button:has-text("Padam Rekod Kekal")');

    await page.fill(
      'textarea[placeholder="Masukkan sebab tindakan..."]',
      "Rekod import pendua",
    );
    await page.fill("#delete-confirmation-name", "Tasrani Kamari");

    page.once("dialog", (dialog) => dialog.accept());
    await page.click('button:has-text("Padam Kekal")');
    await expect.poll(() => deleteRequestReceived).toBe(true);
  });

  test("Journey 6: Admin changes a member status without an accidental default", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("alikhwan_admin_auth", "true");
    });

    let submittedStatus: string | null = null;
    await page.route("/api/admin/members?*", async (route) => {
      await route.fulfill({
        json: {
          members: [
            {
              id: "member-active",
              full_name: "Ahmad Ali",
              ic_normalized: "800101015555",
              phone_normalized: "60123456789",
              membership_status: "active",
              account_state: "active",
              directory_visible: 1,
            },
          ],
          pagination: { total: 1, page: 1, totalPages: 1 },
        },
      });
    });

    await page.route("/api/admin/members/member-active", async (route) => {
      await route.fulfill({
        json: {
          member: {
            id: "member-active",
            legacy_id: null,
            full_name: "Ahmad Ali",
            ic_normalized: "800101015555",
            phone_normalized: "60123456789",
            address: "Jalan Kariah 1",
            general_area: "Desa Al-Ikhwan",
            membership_status: "active",
            account_state: "active",
            directory_visible: 1,
            registration_source: "public_registration",
            admin_notes: null,
          },
          account: { id: "account-1", username: "ahmad" },
        },
      });
    });

    await page.route(
      "/api/admin/members/member-active/set-status",
      async (route) => {
        const body = route.request().postDataJSON();
        submittedStatus = body.status;
        await route.fulfill({
          json: {
            success: true,
            message: "Status ahli berjaya dikemaskini.",
          },
        });
      },
    );

    await page.goto("/admin/ahli");
    await page.click('button:has-text("Urus")');
    await page.click('button:has-text("Ubah Status")');

    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(
      page.locator('input[type="radio"][value="active"]'),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Simpan Status Baharu" }),
    ).toBeDisabled();

    await page.locator('input[type="radio"][value="inactive"]').check();
    await page.fill(
      'textarea[placeholder^="Contoh: Pembetulan status"]',
      "Ahli memohon keahlian dihentikan sementara",
    );

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Simpan Status Baharu" }).click();
    await expect.poll(() => submittedStatus).toBe("inactive");
  });
});
