import { expect, test } from "@playwright/test";

const ADMIN_AUTH_HEADER = `Basic ${Buffer.from("test-admin:test-password").toString("base64")}`;

test.describe("admin users panel", () => {
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

  test("requires Basic Auth when admin credentials are configured", async ({ request }) => {
    const response = await request.get("/admin/users");

    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain("ProCharting Admin");
  });

  test("redirects browser access to the admin login form", async ({ page }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/admin\?next=%2Fadmin%2Fusers/);
    await expect(page.getByRole("heading", { name: "ProCharting admin" })).toBeVisible();
  });

  test("allows form login and logout with an HTTP-only admin session", async ({ page }) => {
    await page.goto("/admin");

    await page.getByLabel("Username").fill("test-admin");
    await page.getByLabel("Password").fill("test-password");
    await page.getByRole("button", { name: "Enter admin" }).click();

    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole("heading", { name: "User administration" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin users panel is disabled" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/admin\?loggedOut=1/);
    await expect(page.getByText("Signed out of the admin panel.")).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\?next=%2Fadmin%2Fusers/);
  });

  test("renders the disabled state after Basic Auth when service-role config is missing", async ({ page }) => {
    await page.setExtraHTTPHeaders({
      authorization: ADMIN_AUTH_HEADER,
    });

    await page.goto("/admin/users");

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
