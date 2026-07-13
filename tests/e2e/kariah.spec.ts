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
    await page.goto("/semak-keahlian");

    // Mock verification response (match found)
    await page.route("/api/public/membership-check", async (route) => {
      await route.fulfill({
        json: {
          success: true,
          matched: true,
          message:
            "Jika maklumat anda sepadan dengan rekod kami, anda boleh meneruskan permohonan tuntutan akaun.",
        },
      });
    });

    await page.fill(
      'input[placeholder="Contoh: 801215-01-4321"]',
      "800512-10-5431",
    );
    await page.fill('input[placeholder="Contoh: 012-3456789"]', "012-3456789");

    // Click submit
    await page.click('button:has-text("Hantar Semakan")');

    // Verify claim redirect button appears
    const claimButton = page.locator(
      'button:has-text("Teruskan ke Tuntutan Akaun")',
    );
    await expect(claimButton).toBeVisible();
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
});
