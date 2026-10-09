import { expect, test } from "@playwright/test";

const email = process.env.VOXA_E2E_EMAIL;
const password = process.env.VOXA_E2E_PASSWORD;

test.skip(!email || !password, "Set VOXA_E2E_EMAIL and VOXA_E2E_PASSWORD for a non-production Supabase test account");

test("custom buttons and history survive reload and a second browser context", async ({ browser, page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /open voxa/i }).click();
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: /log in/i }).click();

  const unique = `E2E ${crypto.randomUUID()}`;
  await page.getByRole("button", { name: "Customize" }).click();
  await page.getByPlaceholder("Headphones").fill(unique);
  await page.getByRole("button", { name: "Add button" }).click();
  await expect(page.getByText(unique)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Customize" }).click();
  await expect(page.getByText(unique)).toBeVisible();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/");
  await secondPage.getByRole("button", { name: /open voxa/i }).click();
  await secondPage.getByLabel("Email").fill(email!);
  await secondPage.getByLabel("Password", { exact: true }).fill(password!);
  await secondPage.getByRole("button", { name: /log in/i }).click();
  await secondPage.getByRole("button", { name: "Customize" }).click();
  await expect(secondPage.getByText(unique)).toBeVisible();
  await secondContext.close();
});
