import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Voxa exposes the complete email account lifecycle", async () => {
  const [page, client] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("lib/supabase.ts", root), "utf8"),
  ]);
  assert.match(page, /auth\.signUp/);
  assert.match(page, /auth\.signInWithPassword/);
  assert.match(page, /auth\.resetPasswordForEmail/);
  assert.match(page, /auth\.updateUser/);
  assert.match(page, /auth\.signOut/);
  assert.match(page, /PASSWORD_RECOVERY/);
  assert.match(client, /persistSession:\s*true/);
});

test("Voxa user data is protected by owner-scoped RLS", async () => {
  const sql = await readFile(new URL("supabase/migrations/20260903000000_create_voxa_user_data.sql", root), "utf8");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all[^;]+from anon/i);
  assert.equal((sql.match(/\(select auth\.uid\(\)\) = user_id/g) || []).length, 5);
  assert.match(sql, /for update[\s\S]+using[\s\S]+with check/i);
});
