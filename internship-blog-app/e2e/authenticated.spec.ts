import { expect, test } from "@playwright/test";
import { loginViaUi } from "./helpers/auth";
import { cleanupE2ETestUsers, ensureE2ETestUsers } from "./helpers/test-users";

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (!userEmail || !userPassword || !adminEmail || !adminPassword) return;
  await ensureE2ETestUsers();
});

test.afterAll(async () => {
  if (!userEmail || !userPassword || !adminEmail || !adminPassword) return;
  await cleanupE2ETestUsers();
});

test.describe("authenticated user flows", () => {
  test.skip(!userEmail || !userPassword, "Missing E2E_USER_EMAIL or E2E_USER_PASSWORD");

  test("user can sign in and access protected pages", async ({ page }) => {
    await loginViaUi(page, userEmail!, userPassword!);

    await page.goto("/journeys");
    await expect(page.getByRole("heading", { name: "My Journeys" })).toBeVisible();

    await page.goto("/me");
    await expect(page.getByRole("link", { name: "View public profile" })).toBeVisible();
  });

  test("user can create and delete a journey with a post", async ({ page }) => {
    const journeyTitle = `E2E Journey ${Date.now()}`;
    const postTitle = `E2E Post ${Date.now()}`;

    await loginViaUi(page, userEmail!, userPassword!);
    await page.goto("/journeys");

    await page.getByRole("button", { name: "Create Journey" }).click();
    const journeyDialog = page.getByRole("dialog");
    await journeyDialog.locator("#title").fill(journeyTitle);
    await journeyDialog.getByRole("button", { name: "Create Journey" }).click();
    await expect(page.getByRole("link", { name: `Open journey ${journeyTitle}` })).toBeVisible();

    await page.getByRole("link", { name: `Open journey ${journeyTitle}` }).click();
    await page.waitForURL(/\/journeys\/.+/);
    await expect(page.getByRole("heading", { name: journeyTitle })).toBeVisible();

    await page.getByRole("button", { name: "Add Post" }).click();
    const postDialog = page.getByRole("dialog");
    await postDialog.locator("#title").fill(postTitle);
    await postDialog.getByRole("button", { name: "Save Post" }).click();
    await expect(page.getByText("Post created successfully!")).toBeVisible();

    await page.locator("a", { hasText: postTitle }).first().click();
    await page.waitForURL(/\/posts\/.+/);
    await expect(page.getByRole("heading", { name: postTitle })).toBeVisible();

    await page.getByRole("button", { name: "Delete post" }).first().click();
    await page.getByRole("button", { name: "Delete post", exact: true }).click();
    await page.waitForURL(/\/journeys\/.+/);
    await expect(page.getByText(postTitle)).not.toBeVisible();

    await page.getByRole("button", { name: "Delete journey" }).first().click();
    await page.getByRole("button", { name: "Delete journey", exact: true }).click();
    await page.waitForURL("/journeys");
    await expect(page.getByRole("link", { name: `Open journey ${journeyTitle}` })).not.toBeVisible();
  });
});

test.describe("admin flows", () => {
  test.skip(!adminEmail || !adminPassword, "Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD");

  test("admin can sign in and view admin tests tab", async ({ page }) => {
    await loginViaUi(page, adminEmail!, adminPassword!);

    await page.goto("/admin?tab=tests");
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Test Runner" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run unit/integration tests" })).toBeVisible();
  });

  test("admin can ban user and banned user cannot sign in", async ({ page, context }) => {
    await loginViaUi(page, adminEmail!, adminPassword!);
    await page.goto("/admin?tab=users");

    const userRow = page.locator("article", { hasText: "@e2e_user_auto" }).first();
    await expect(userRow).toBeVisible();

    if (await userRow.getByRole("button", { name: "Unban user" }).isVisible().catch(() => false)) {
      await userRow.getByRole("button", { name: "Unban user" }).click();
      await expect(userRow.getByText("Active")).toBeVisible();
    }

    await userRow.getByRole("button", { name: "Ban user" }).click();
    await expect(userRow.getByText("Banned")).toBeVisible();

    const userPage = await context.newPage();
    await userPage.goto("/login");
    await userPage.locator("#email").fill(userEmail!);
    await userPage.locator("#password").fill(userPassword!);
    await userPage.getByRole("button", { name: "Sign in" }).click();
    await expect(
      userPage.getByText("Your account has been suspended. Contact support for assistance.")
    ).toBeVisible();
    await userPage.close();
  });
});
