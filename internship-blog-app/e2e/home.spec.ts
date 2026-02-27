import { expect, test } from "@playwright/test";

test("home page shows journeys section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Latest Admin Journeys" })).toBeVisible();
});
