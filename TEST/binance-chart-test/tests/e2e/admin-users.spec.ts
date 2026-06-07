import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const ADMIN_CREDENTIALS_FILE =
  process.env.PROCHARTS_ADMIN_CREDENTIALS_FILE ?? path.join(process.cwd(), "test-results", "admin-credentials.json");

const resetAdminCredentialsFile = async () => {
  await fs.rm(ADMIN_CREDENTIALS_FILE, { force: true });
};

const loginAsAdmin = async (page: Page, password = "test-password") => {
  await page.goto("/admin");
  await page.getByLabel("Username").fill("test-admin");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Enter admin" }).click();
  await expect(page).toHaveURL(/\/admin\/users/);
};

test.describe("admin users panel", () => {
  test.beforeEach(async () => {
    await resetAdminCredentialsFile();
  });

  test.afterEach(async () => {
    await resetAdminCredentialsFile();
  });

  test("renders a visible admin login page", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "ProCharting admin" })).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter admin" })).toBeVisible();

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      .toBe(false);
  });

  test("requires an admin session when admin credentials are configured", async ({ request }) => {
    const response = await request.get("/admin/users", { maxRedirects: 0 });

    expect([303, 307, 308]).toContain(response.status());
    expect(response.headers().location).toContain("/admin?next=%2Fadmin%2Fusers");
  });

  test("redirects browser access to the admin login form", async ({ page }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/admin\?next=%2Fadmin%2Fusers/);
    await expect(page.getByRole("heading", { name: "ProCharting admin" })).toBeVisible();
  });

  test("allows form login and logout with an HTTP-only admin session", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByRole("heading", { name: "User administration" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin users panel is disabled" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/admin\?loggedOut=1/);
    await expect(page.getByText("Signed out of the admin panel.")).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\?next=%2Fadmin%2Fusers/);
  });

  test("renders the disabled state after login when service-role config is missing", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByRole("heading", { name: "User administration" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin users panel is disabled" })).toBeVisible();
    await expect(page.getByText("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")).toBeVisible();
    await expect(page.getByText("SUPABASE_SERVICE_ROLE_KEY")).toBeVisible();

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      .toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      .toBe(false);
  });

  test("allows changing the admin password from settings", async ({ page }) => {
    const updatedPassword = "new-test-password-1$";

    await loginAsAdmin(page);
    await page.getByRole("link", { name: "Settings" }).click();

    await expect(page).toHaveURL(/\/admin\/settings/);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Change password" })).toBeVisible();

    await expect
      .poll(async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      .toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      .toBe(false);

    await page.getByRole("textbox", { exact: true, name: "Current password" }).fill("test-password");
    await page.getByRole("textbox", { exact: true, name: "New password" }).fill(updatedPassword);
    await page.getByRole("textbox", { exact: true, name: "Confirm new password" }).fill(updatedPassword);
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(page).toHaveURL(/\/admin\/settings\?updated=1/);
    await expect(page.getByText("Admin password updated.")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\?loggedOut=1/);

    await page.getByLabel("Username").fill("test-admin");
    await page.getByLabel("Password").fill("test-password");
    await page.getByRole("button", { name: "Enter admin" }).click();
    await expect(page.getByText("Username or password is incorrect.")).toBeVisible();

    await page.getByLabel("Username").fill("test-admin");
    await page.getByLabel("Password").fill(updatedPassword);
    await page.getByRole("button", { name: "Enter admin" }).click();

    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole("heading", { name: "User administration" })).toBeVisible();
  });

  test("throttles repeated failed form logins", async ({ request }) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request.post("/admin/login", {
        form: {
          next: "/admin/users",
          password: "wrong-password",
          username: "locked-admin",
        },
      });
      expect(response.url()).toContain("error=credentials");
    }

    const lockedResponse = await request.post("/admin/login", {
      form: {
        next: "/admin/users",
        password: "wrong-password",
        username: "locked-admin",
      },
    });

    expect(lockedResponse.url()).toContain("error=rate");
  });
});
