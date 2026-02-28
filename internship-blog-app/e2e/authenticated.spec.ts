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

  test("logged-in user is redirected away from login and register pages", async ({ page }) => {
    await loginViaUi(page, userEmail!, userPassword!);

    await page.goto("/login");
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/register");
    await expect(page).toHaveURL(/\/$/);
  });

  test("user can create and delete a journey with a post", async ({ page }) => {
    test.setTimeout(60_000);

    const journeyTitle = `E2E Journey ${Date.now()}`;
    const postTitle = `E2E Post ${Date.now()}`;

    await loginViaUi(page, userEmail!, userPassword!);
    await page.goto("/journeys");

    await page.getByRole("button", { name: "Create Journey" }).click();
    const journeyDialog = page.getByRole("dialog", { name: "Create a New Journey" });
    await journeyDialog.locator("#title").fill(journeyTitle);
    await journeyDialog.getByRole("button", { name: "Create Journey" }).click();
    await expect(journeyDialog).not.toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("link", { name: `Open journey ${journeyTitle}` })).toBeVisible({ timeout: 20000 });

    await page.getByRole("link", { name: `Open journey ${journeyTitle}` }).click();
    await page.waitForURL(/\/journeys\/.+/);
    await expect(page.getByRole("heading", { name: journeyTitle })).toBeVisible();

    await page.getByRole("button", { name: "Add Post" }).click();
    const postDialog = page.getByRole("dialog", { name: "Create a New Post" });
    await postDialog.locator("#title").fill(postTitle);
    await postDialog.getByRole("button", { name: "Save Post" }).click();
    await expect(postDialog).not.toBeVisible({ timeout: 25000 });
    await expect(page.locator("a", { hasText: postTitle }).first()).toBeVisible({ timeout: 25000 });

    await page.locator("a", { hasText: postTitle }).first().click();
    await page.waitForURL(/\/posts\/.+/);
    await expect(page.getByRole("heading", { name: postTitle })).toBeVisible();

    await page.getByRole("button", { name: "Delete post" }).first().click();
    await page.getByRole("button", { name: "Delete post", exact: true }).click();
    await page.waitForURL(/\/journeys\/.+/);
    await expect(page.getByText(postTitle)).not.toBeVisible();

    await page.getByLabel("Delete journey").click();
    await page.getByRole("button", { name: "Delete journey", exact: true }).click();
    await page.waitForURL(/\/journeys$/, { timeout: 20000 });
    await expect(page.getByRole("link", { name: `Open journey ${journeyTitle}` })).not.toBeVisible();
  });

  test("user sees moderation blocked modal when creating an unsafe post", async ({ page }) => {
    test.setTimeout(60_000);

    const journeyTitle = `E2E Journey Blocked Post ${Date.now()}`;
    const blockedPostTitle = `fucking shit ${Date.now()}`;

    await loginViaUi(page, userEmail!, userPassword!);
    await page.goto("/journeys");

    await page.getByRole("button", { name: "Create Journey" }).click();
    const journeyDialog = page.getByRole("dialog", { name: "Create a New Journey" });
    await journeyDialog.locator("#title").fill(journeyTitle);
    await journeyDialog.getByRole("button", { name: "Create Journey" }).click();
    await expect(journeyDialog).not.toBeVisible({ timeout: 20000 });
    const openJourneyLink = page.getByRole("link", { name: `Open journey ${journeyTitle}` });
    await expect(openJourneyLink).toBeVisible({ timeout: 20000 });

    await openJourneyLink.click();
    await page.waitForURL(/\/journeys\/.+/);

    await page.getByRole("button", { name: "Add Post" }).click();
    const postDialog = page.getByRole("dialog", { name: "Create a New Post" });
    await postDialog.locator("#title").fill(blockedPostTitle);
    await postDialog.getByRole("button", { name: "Save Post" }).click();

    const blockedDialog = page.getByRole("dialog", { name: "Content Blocked" });
    await expect(blockedDialog).toBeVisible({ timeout: 20000 });
    await expect(blockedDialog.getByText("Your content was not saved because it triggered moderation thresholds.")).toBeVisible();
    await blockedDialog.getByRole("button", { name: "OK" }).click();
    await expect(blockedDialog).not.toBeVisible({ timeout: 10000 });

    await postDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(postDialog).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator("a", { hasText: blockedPostTitle }).first()).not.toBeVisible();

    await page.getByLabel("Delete journey").click();
    await page.getByRole("button", { name: "Delete journey", exact: true }).click();
    await page.waitForURL(/\/journeys$/, { timeout: 20000 });
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

    await page.goto("/admin?tab=moderation");
    await expect(page.getByRole("link", { name: "Moderation" })).toBeVisible();
    await expect(
      page.getByPlaceholder("Search by user, reason, type, or preview")
    ).toBeVisible();
  });

  test("admin can ban user and banned user cannot sign in", async ({ page, browser }) => {
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

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await userPage.goto("/login");
    await userPage.locator("#email").fill(userEmail!);
    await userPage.locator("#password").fill(userPassword!);
    await userPage.getByRole("button", { name: "Sign in" }).click();
    await expect(
      userPage.getByText("Your account has been suspended. Contact support for assistance.")
    ).toBeVisible();
    await userContext.close();
  });

  test("moderation queue item can be reviewed in moderation tab", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);

    const moderationToken = `e2e-spam-${Date.now()}`;
    const flaggedJourneyTitle = `spam ${moderationToken}`;

    await loginViaUi(page, adminEmail!, adminPassword!);
    await page.goto("/admin?tab=users");
    const userRow = page.locator("article", { hasText: "@e2e_user_auto" }).first();
    await expect(userRow).toBeVisible();
    if (await userRow.getByRole("button", { name: "Unban user" }).isVisible().catch(() => false)) {
      await userRow.getByRole("button", { name: "Unban user" }).click();
      await expect(userRow.getByText("Active")).toBeVisible();
    }

    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await loginViaUi(userPage, userEmail!, userPassword!);
    await userPage.goto("/journeys");

    await userPage.getByRole("button", { name: "Create Journey" }).click();
    const journeyDialog = userPage.getByRole("dialog", { name: "Create a New Journey" });
    await journeyDialog.locator("#title").fill(flaggedJourneyTitle);
    await journeyDialog.getByRole("button", { name: "Create Journey" }).click();
    const openJourneyLink = userPage.getByRole("link", { name: `Open journey ${flaggedJourneyTitle}` });
    const blockedDialog = userPage.getByRole("dialog", { name: "Content Blocked" });

    const creationOutcome = await Promise.race<"created" | "blocked">([
      openJourneyLink.waitFor({ state: "visible", timeout: 20000 }).then(() => "created"),
      blockedDialog.waitFor({ state: "visible", timeout: 20000 }).then(() => "blocked"),
    ]);

    if (creationOutcome === "created") {
      await openJourneyLink.click();
      await userPage.waitForURL(/\/journeys\/.+/);
      await userPage.getByLabel("Delete journey").click();
      await userPage.getByRole("button", { name: "Delete journey", exact: true }).click();
      await userPage.waitForURL(/\/journeys$/, { timeout: 20000 });
      await expect(userPage.getByRole("link", { name: `Open journey ${flaggedJourneyTitle}` })).not.toBeVisible();
    } else {
      await blockedDialog.getByRole("button", { name: "OK" }).click();
      await expect(blockedDialog).not.toBeVisible({ timeout: 10000 });
    }
    await userContext.close();

    await page.goto(`/admin?tab=moderation&moderationQuery=${encodeURIComponent(moderationToken)}`);
    const moderationRow = page.locator("article", { hasText: moderationToken }).first();
    await expect(moderationRow).toBeVisible();
    await expect(moderationRow.getByText("pending", { exact: false })).toBeVisible();

    await moderationRow.getByRole("button", { name: "Mark reviewed" }).click();
    await expect(moderationRow.getByText("reviewed", { exact: false })).toBeVisible();
  });
});
