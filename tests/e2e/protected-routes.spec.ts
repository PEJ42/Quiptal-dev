import { expect, test } from "@playwright/test";

test("protected dashboard redirects an anonymous visitor to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
