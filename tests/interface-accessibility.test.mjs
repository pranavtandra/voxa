import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Voxa exposes essential keyboard and screen-reader semantics", async () => {
  const [page, polish, globals] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/polish.css", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  const css = `${globals}\n${polish}`;

  assert.match(page, /Skip to main content/);
  assert.match(page, /aria-current=\{page===n\?"page":undefined\}/);
  assert.match(page, /aria-pressed=\{category===id\}/);
  assert.match(page, /aria-label="Search emojis"/);
  assert.match(page, /role="switch"/);
  assert.match(page, /aria-label=\{label\}/);
  assert.match(page, /"my":"conversation partner"/, "conversation-partner messages should expose text-to-speech");
  assert.match(page, /speak\(item\.text\)/, "conversation playback should use the same speech and history path");
  assert.match(page, /role="alertdialog"/);
  assert.match(page, /event\.key==="Escape"/, "dialogs should close with the Escape key");
  assert.match(page, /event\.key!=="Tab"/, "dialogs should keep keyboard and switch focus inside the active surface");
  assert.match(page, /previousFocus\?\.focus\(\)/, "closing a dialog should restore focus to its trigger");
  assert.match(page, /tabIndex=\{-1\}/, "page headings and main content should support managed focus");
  assert.match(css, /button:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("Voxa includes loading, empty, error, and privacy states", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");

  assert.match(page, /Loading Voxa/);
  assert.match(page, /function Empty/);
  assert.match(page, /No emojis found/);
  assert.match(page, /href="mailto:pranav\.tandra123@gmail\.com"/, "the footer should expose an email contact link");
  assert.match(page, /role="alert"/);
  assert.match(page, /role="status"/);
  assert.match(page, /Guest · Not saved/);
  assert.match(page, /Voxa couldn't save this button/);
  assert.match(page, /Voxa couldn't save your latest changes/);
});
