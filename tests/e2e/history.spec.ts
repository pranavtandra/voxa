import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.skip(!process.env.VOXA_E2E_EMAIL || !process.env.VOXA_E2E_PASSWORD, "Requires an isolated Supabase test account");

test("speech saves to Supabase, persists, and recovers from network failure", async ({ page }) => {
  test.setTimeout(60000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { data, error } = await client.auth.signInWithPassword({ email: process.env.VOXA_E2E_EMAIL!, password: process.env.VOXA_E2E_PASSWORD! });
  expect(error).toBeNull();
  const session = data.session!;
  const denied = await client.from("voxa_history_entries").insert({ id: crypto.randomUUID(), user_id: crypto.randomUUID(), spoken_text: "Must not save", display_time: "Now", activity_date: "2026-10-09", occurred_at: new Date().toISOString() });
  expect(denied.error?.code).toBe("42501");
  const anonymous = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const loggedOut = await anonymous.from("voxa_history_entries").select("id");
  expect(loggedOut.error).not.toBeNull();
  await page.addInitScript(({ session, key }) => {
    localStorage.setItem(key, JSON.stringify(session));
    // Deterministic browser speech events, without depending on installed voices.
    let current: SpeechSynthesisUtterance | undefined;
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {},
      cancel: () => { current = undefined; },
      speak: (utterance: SpeechSynthesisUtterance) => {
        current = utterance;
        setTimeout(() => {
          if (current !== utterance) return;
          utterance.onstart?.call(utterance, {} as SpeechSynthesisEvent);
          utterance.onstart?.call(utterance, {} as SpeechSynthesisEvent);
          setTimeout(() => { utterance.onend?.call(utterance, {} as SpeechSynthesisEvent); current = undefined; }, 100);
        }, 10);
      },
    } });
  }, { session, key: `sb-${new URL(url).hostname.split(".")[0]}-auth-token` });
  const rows = async () => {
    const result = await client.from("voxa_history_entries").select("id,spoken_text,occurred_at,user_id").eq("user_id", session.user.id).order("occurred_at", { ascending: false });
    expect(result.error).toBeNull();
    return result.data!;
  };
  const before = (await rows()).length;
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const enterApp = async () => {
    await expect(page.locator(".landing, .app").first()).toBeVisible();
    if (await page.locator(".landing").isVisible()) await page.getByRole("button", { name: /open voxa/i }).first().click();
  };
  await page.goto("/");
  await enterApp();
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await page.locator(".comm-card").filter({ has: page.getByText("Yes", { exact: true }) }).click();
  const speak = page.getByRole("button", { name: "▶ Speak", exact: true });
  await speak.dblclick();
  await expect.poll(async () => (await rows()).length).toBe(before + 1);
  await expect(speak).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await speak.click();
    await expect.poll(async () => (await rows()).length).toBe(before + 2 + i);
    await page.waitForTimeout(150);
  }
  await nav.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history article")).toHaveCount(before + 4);
  await page.reload();
  await enterApp();
  await nav.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history article")).toHaveCount(before + 4);

  await nav.getByRole("button", { name: "Communicate", exact: true }).click();
  await page.locator(".comm-card").filter({ has: page.getByText("No", { exact: true }) }).click();
  let failing = true;
  await page.route("**/rest/v1/voxa_history_entries**", route => {
    if (failing && route.request().method() === "POST") return route.abort("failed");
    return route.continue();
  });
  await speak.click();
  await expect(page.locator(".save-status[role='alert']")).toContainText("hasn't synced");
  expect((await rows()).length).toBe(before + 4);
  failing = false;
  await expect.poll(async () => (await rows()).length, { timeout: 15000 }).toBe(before + 5);
  const saved = await rows();
  expect(saved[0].spoken_text).toBe("No.");
  expect(saved[0].user_id).toBe(session.user.id);
  expect(new Set(saved.map(row => row.id)).size).toBe(saved.length);
  await nav.getByRole("button", { name: "Customize", exact: true }).click();
  const custom = `Test button ${crypto.randomUUID().slice(0, 8)}`;
  await page.getByPlaceholder("Headphones").fill(custom);
  await page.getByRole("button", { name: "Add button", exact: true }).click();
  await expect(page.locator(".custom-button-row").filter({ hasText: custom })).toBeVisible();
  await nav.getByRole("button", { name: "Communicate", exact: true }).click();
  await page.getByRole("button", { name: "Clear everything", exact: true }).click();
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await page.locator(".comm-card").filter({ has: page.getByText(custom, { exact: true }) }).click();
  await page.route("**/api/generate", route => route.fulfill({ json: { phrase: custom + "." } }));
  await page.getByRole("button", { name: /Create message/ }).click();
  await speak.click();
  await expect.poll(async () => (await rows()).length).toBe(before + 6);
  expect((await rows())[0].spoken_text).toBe(custom + ".");
  await nav.getByRole("button", { name: "Conversation", exact: true }).click();
  await page.getByLabel("Conversation partner", { exact: true }).fill("Partner playback test.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.getByRole("button", { name: "Speak conversation partner message", exact: true }).last().click();
  await expect.poll(async () => (await rows()).length).toBe(before + 7);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Log in →", exact: true })).toBeVisible();
  expect((await rows()).length).toBe(before + 7);
  expect(consoleErrors).toEqual([]);
  await client.auth.signOut();
});

test("logged-out guest speech never writes account history", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: {
      getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
      speak: (utterance: SpeechSynthesisUtterance) => {
        utterance.onstart?.call(utterance, {} as SpeechSynthesisEvent);
        utterance.onend?.call(utterance, {} as SpeechSynthesisEvent);
      },
    } });
  });
  const writes: string[] = [];
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("voxa_history_entries")) writes.push(request.url()); });
  await page.goto("/");
  await page.getByRole("button", { name: "Log in →", exact: true }).click();
  await page.getByRole("button", { name: /Continue as guest/ }).click();
  await page.locator(".comm-card").filter({ has: page.getByText("Yes", { exact: true }) }).click();
  await page.getByRole("button", { name: "▶ Speak", exact: true }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name: "History", exact: true }).click();
  await expect(page.locator(".history article")).toHaveCount(1);
  expect(writes).toEqual([]);
});
