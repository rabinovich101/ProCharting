import { expect, test } from "@playwright/test";

const ADMIN_AUTH_HEADER = `Basic ${Buffer.from("test-admin:test-password").toString("base64")}`;

test.describe("admin users panel", () => {
  test("requires Basic Auth when admin credentials are configured", async ({ request }) => {
    const response = await request.get("/admin/users");

    expect(response.status()).toBe(401);
    expect(response.headers()["www-authenticate"]).toContain("ProCharting Admin");
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
});
