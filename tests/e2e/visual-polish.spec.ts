import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
];

async function inspect(page: Page, name: string, width: number) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  const clipped = await page.locator("main input:not([type='file']), main textarea, main select").evaluateAll(elements =>
    elements.filter(element => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.left < -1 || box.right > innerWidth + 1);
    }).map(element => element.outerHTML.slice(0, 100)),
  );
  expect(clipped, `${name}: form controls must fit the viewport`).toEqual([]);
  // The development-only diagnostic panel is not part of the shipped interface.
  await page.screenshot({ path: `outputs/visual-audit/${width}-${name}.png`, fullPage: true, animations: "disabled", style: ".persistence-debug { visibility: hidden; }" });
}

async function navigate(page: Page, name: string, width: number) {
  const nav = page.getByRole("navigation", { name: width <= 1100 ? "Mobile navigation" : "Main navigation", exact: true });
  await nav.getByRole("button", { name: width <= 1100 && name === "My Phrases" ? "Phrases" : name, exact: true }).click();
}

async function isolate(page: Page, profileComplete = true) {
  const user = {
    id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", role: "authenticated",
    email: "visual-fixture@example.invalid", created_at: new Date().toISOString(),
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Communication User", profile_complete: profileComplete },
  };
  // Fake credentials only. All provider traffic is intercepted, including writes.
  await page.route("https://*.supabase.co/**", async route => {
    const url = new URL(route.request().url());
    let body: unknown = [];
    if (url.pathname.includes("/auth/v1/token")) body = {
      access_token: "visual-fixture-token", refresh_token: "visual-fixture-refresh", token_type: "bearer", expires_in: 3600, user,
    };
    else if (url.pathname.includes("/auth/v1/user")) body = { ...user, user_metadata: { ...user.user_metadata, profile_complete: true } };
    else if (url.pathname.includes("voxa_history_entries") && route.request().method() === "GET") body = [{
      id: "00000000-0000-4000-8000-000000000002", spoken_text: "Could I have some water, please?",
      category: "Quick", display_time: "10:42 AM", activity_date: new Date().toISOString().slice(0, 10), occurred_at: new Date().toISOString(),
    }];
    else if (url.pathname.includes("voxa_custom_buttons") && route.request().method() === "GET") body = [{
      id: "00000000-0000-4000-8000-000000000003", label: "My noise-cancelling headphones", emoji: "🎧", category: "custom", position: 0,
    }];
    else if (url.pathname.includes("voxa_user_data") && route.request().method() === "GET") body = [
      { key: "voxa-phrases", value: [{ id: "fixture-phrase", text: "Please give me a little more time to finish my message.", favorite: true }] },
    ];
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.route("**/api/generate", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ phrase: "Could I have some water, please?" }) }));
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
      speak: (utterance: SpeechSynthesisUtterance) => { utterance.onstart?.(new Event("start") as SpeechSynthesisEvent); utterance.onend?.(new Event("end") as SpeechSynthesisEvent); },
    } });
  });
}

for (const viewport of viewports) {
  const { width } = viewport;
  test.describe(`${width}px styling audit`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("public pages, authentication, and demo", async ({ page }) => {
      await isolate(page);
      await page.goto("/");
      await expect(page.getByRole("heading", { name: /Find your words/ })).toBeVisible();
      await inspect(page, "landing", width);
      await page.getByRole("button", { name: "Log in →", exact: true }).click();
      await inspect(page, "login", width);
      await page.getByLabel("Email", { exact: true }).focus();
      await page.keyboard.press("Tab");
      await expect(page.locator('input[autocomplete="current-password"]')).toBeFocused();
      expect(await page.locator('input[autocomplete="current-password"]').evaluate(e => getComputedStyle(e).outlineWidth)).toBe("3px");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await page.locator('input[autocomplete="new-password"]').first().fill("Example123!");
      await inspect(page, "signup", width);
      await page.getByRole("button", { name: "Forgot password?", exact: true }).click();
      await inspect(page, "password-reset", width);
      await page.getByRole("button", { name: "Back to Voxa" }).click();
      await page.getByRole("button", { name: "Watch demo" }).click();
      await inspect(page, "demo-start", width);
      await expect(page.getByText("A complete thought in a few taps.")).toBeVisible({ timeout: 12000 });
      await inspect(page, "demo-finish", width);
      for (const path of ["privacy", "terms"]) {
        await page.goto(`/${path}`);
        await inspect(page, path, width);
      }
    });

    test("every app section and communication editor", async ({ page }) => {
      await isolate(page);
      await page.goto("/");
      await page.getByRole("button", { name: "Log in →", exact: true }).click();
      await page.getByRole("button", { name: "Continue as guest", exact: true }).click();
      await inspect(page, "communication", width);
      await page.locator(".comm-card").filter({ has: page.getByText("Yes", { exact: true }) }).click();
      await page.getByRole("button", { name: "Create message" }).click();
      await expect(page.locator(".suggested")).toContainText("Yes.");
      await page.getByRole("button", { name: "▶ Speak", exact: true }).click();
      await page.getByRole("button", { name: "♡ Keep for session", exact: true }).click();
      await page.getByRole("button", { name: "✎ Edit", exact: true }).click();
      await inspect(page, "message-edit", width);
      await page.getByRole("button", { name: "Add another word" }).click();
      await inspect(page, "custom-word", width);
      await page.getByRole("button", { name: "Emoji", exact: true }).click();
      await inspect(page, "emoji-picker", width);
      await page.getByLabel("Search emojis").fill("no-matching-emoji-123456");
      await expect(page.getByText("No emojis found")).toBeVisible();
      await inspect(page, "emoji-empty", width);
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      for (const section of ["Conversation", "My Phrases", "Routines", "History", "Customize", "Patterns", "Settings"]) {
        await navigate(page, section, width);
        await inspect(page, section.toLowerCase().replaceAll(" ", "-"), width);
        if (section === "Conversation") {
          await page.getByPlaceholder("Type a question or message…").fill("Would you like something to eat? You can take as much time as you need to answer.");
          await page.getByRole("button", { name: "Send message", exact: true }).click();
          await inspect(page, "conversation-populated", width);
        }
        if (section === "Routines") {
          await page.getByRole("button", { name: "Add routine" }).click();
          await inspect(page, "routine-maker", width);
          await page.getByRole("button", { name: "Start routine" }).first().click();
          await inspect(page, "routine-player", width);
        }
        if (section === "Customize") {
          await page.getByPlaceholder("Headphones").fill("A personal communication button with a longer label");
          await page.getByRole("button", { name: "Add button", exact: true }).click();
          await inspect(page, "customize-populated", width);
        }
      }
      await navigate(page, "Settings", width);
      await expect(page.getByRole("switch", { name: "Text to speech", exact: true })).toHaveAttribute("aria-checked", "true");
      await page.getByRole("switch", { name: "Text to speech", exact: true }).click();
      await expect(page.getByRole("button", { name: "Test voice" })).toBeDisabled();
      await inspect(page, "settings-disabled", width);
    });

    test("profile setup, profile, delete confirmation, and populated saved data", async ({ page }) => {
      await isolate(page, false);
      await page.goto("/");
      await page.getByRole("button", { name: "Log in →", exact: true }).click();
      await page.getByLabel("Email", { exact: true }).fill("visual-fixture@example.invalid");
      await page.locator('input[autocomplete="current-password"]').fill("Fixture123!");
      await page.getByRole("button", { name: "Log in", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Make Voxa yours." })).toBeVisible();
      await inspect(page, "profile-setup", width);
      await page.getByRole("button", { name: "Save and enter Voxa" }).click();
      await page.getByRole("button", { name: "Open Communication User's profile", exact: true }).click();
      await inspect(page, "profile", width);
      await page.getByRole("button", { name: "Delete my account", exact: true }).click();
      await inspect(page, "delete-dialog", width);
      await expect(page.getByRole("button", { name: "Permanently delete", exact: true })).toBeDisabled();
      await page.keyboard.press("Escape");
      for (const section of ["My Phrases", "History", "Customize", "Patterns"]) {
        await navigate(page, section, width);
        await inspect(page, `signed-in-${section.toLowerCase().replaceAll(" ", "-")}`, width);
      }
    });
  });
}
