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
  assert.match(page, /auth\.signInWithOAuth\(\{provider:"google"/);
  assert.match(page, /Continue with Google/);
  assert.match(page, /redirectTo/);
  assert.match(page, /auth\.resetPasswordForEmail/);
  assert.match(page, /data\.user\.identities/);
  assert.match(page, /An account already exists for that email/);
  assert.match(page, /If an account exists for that email/);
  assert.match(page, /auth\.updateUser/);
  assert.match(page, /auth\.signOut/);
  assert.match(page, /auth\.signOut\(\{scope:"local"\}\)/, "logout should end the current browser session");
  assert.match(page, /Logging out…/, "logout should prevent duplicate clicks while the request is active");
  assert.match(page, /upsert\(accountData,\{onConflict:"user_id,key"\}\)/, "logout should flush pending account data before ending the session");
  assert.match(page, /Voxa couldn't save your latest changes/, "a failed final sync should keep the user logged in");
  assert.match(page, /const localKey=userId\?`\$\{key\}:\$\{userId\}`/, "local caches should be isolated by account id");
  assert.match(page, /key:"voxa-custom",value:next/, "custom buttons should be confirmed by Supabase before the editor closes");
  assert.match(page, /savingWord\?"Saving…":"Add word"/, "custom button saves should expose their pending state");
  assert.match(page, /async function recordHistory/, "spoken messages should use an explicit persistence path");
  assert.match(page, /key:"voxa-history",value:merged/, "spoken history should be saved immediately to Supabase");
  assert.match(page, /remote\.filter\(item=>item\.id!==entry\.id\)/, "history saves should merge with the latest cloud copy");
  assert.match(page, /PASSWORD_RECOVERY/);
  assert.match(page, /profile_complete/);
  assert.match(page, /SET UP YOUR PROFILE/);
  assert.match(page, /full_name/);
  assert.match(page, /Show password/);
  assert.match(page, /At least one number/);
  assert.match(page, /At least one special character/);
  assert.match(client, /persistSession:\s*true/);
});

test("Voxa user data is protected by owner-scoped RLS", async () => {
  const [base, hardening] = await Promise.all([
    readFile(new URL("supabase/migrations/20260903000000_create_voxa_user_data.sql", root), "utf8"),
    readFile(new URL("supabase/migrations/20261008190823_harden_user_data_and_private_storage.sql", root), "utf8"),
  ]);
  const sql = `${base}\n${hardening}`;
  assert.match(sql, /enable row level security/i);
  assert.match(hardening, /force row level security/i);
  assert.match(sql, /revoke all[^;]+from anon/i);
  assert.match(hardening, /revoke all[^;]+from anon, authenticated/i);
  assert.match(hardening, /grant select, insert, update, delete[^;]+to authenticated/i);
  assert.equal((hardening.match(/\(select auth\.uid\(\)\) = user_id/g) || []).length, 5);
  assert.match(sql, /for update[\s\S]+using[\s\S]+with check/i);
});

test("Voxa media storage is private and owner-scoped", async () => {
  const [sql, media] = await Promise.all([
    readFile(new URL("supabase/migrations/20261008190823_harden_user_data_and_private_storage.sql", root), "utf8"),
    readFile(new URL("lib/private-media.ts", root), "utf8"),
  ]);
  assert.match(sql, /'voxa-user-media'[\s\S]+false/i);
  assert.match(sql, /update storage\.buckets set public = false/i);
  assert.equal((sql.match(/on storage\.objects for (select|insert|update|delete)/gi) || []).length, 4);
  assert.equal((sql.match(/owner_id = \(select auth\.uid\(\)\)::text/g) || []).length, 5);
  assert.equal((sql.match(/storage\.foldername\(name\)/g) || []).length, 5);
  assert.match(media, /createSignedUrl\(path, SIGNED_URL_TTL_SECONDS\)/);
  assert.doesNotMatch(media, /getPublicUrl/);
});

test("the service role credential remains server-only", async () => {
  const [client, edgeFunction, envExample] = await Promise.all([
    readFile(new URL("lib/supabase.ts", root), "utf8"),
    readFile(new URL("supabase/functions/delete-account/index.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.doesNotMatch(client, /service[_-]?role/i);
  assert.doesNotMatch(envExample, /service[_-]?role/i);
  assert.match(edgeFunction, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.doesNotMatch(edgeFunction, /NEXT_PUBLIC_[A-Z_]*SERVICE/i);
});

test("guest access stays local-only and does not create a Supabase identity", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /Continue as guest/);
  assert.match(page, /const persist=!guest/);
  assert.match(page, /if\(!persist\)return;if\(skipNextWrite\.current\)/);
  assert.match(page, /if\(!persist\|\|!userId\)/);
  assert.match(page, /if\(guest\)\{setMessage\(fallback\)/);
  assert.doesNotMatch(page, /signInAnonymously/);
});

test("sentence generation requires a verified user and bounded input", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/api/generate/route.ts", root), "utf8"),
  ]);
  assert.match(page, /"authorization":`Bearer \$\{session\?\.access_token\|\|""\}`/);
  assert.match(route, /client\.auth\.getUser\(token\)/);
  assert.match(route, /errorResponse\("Unauthorized", 401\)/);
  assert.match(route, /MAX_BODY_BYTES = 8_192/);
  assert.match(route, /body\.selections\.length > MAX_CONCEPTS/);
  assert.match(route, /"cache-control": "no-store"/);
});

test("deployment responses use defensive browser headers and strict CORS", async () => {
  const [vercel, worker, edgeFunction] = await Promise.all([
    readFile(new URL("vercel.json", root), "utf8"),
    readFile(new URL("worker/index.ts", root), "utf8"),
    readFile(new URL("supabase/functions/delete-account/index.ts", root), "utf8"),
  ]);
  for (const config of [vercel, worker]) {
    assert.match(config, /Content-Security-Policy/);
    assert.match(config, /frame-ancestors 'none'/);
    assert.match(config, /X-Content-Type-Options/);
    assert.match(config, /Permissions-Policy/);
  }
  assert.doesNotMatch(edgeFunction, /"Access-Control-Allow-Origin": "\*"/);
  assert.match(edgeFunction, /allowedOrigins\.has\(origin\)/);
  assert.match(edgeFunction, /"Cache-Control": "no-store"/);
});

test("automatic error reports exclude communication and identity data", async () => {
  const reporting = await readFile(new URL("lib/error-reporting.ts", root), "utf8");
  assert.doesNotMatch(reporting, /sendDefaultPii: true/);
  assert.match(reporting, /maxBreadcrumbs: 0/);
  for (const field of ["user", "request", "breadcrumbs", "contexts", "extra"]) {
    assert.match(reporting, new RegExp(`delete event\\.${field}`));
  }
  assert.match(reporting, /exception\.value = "Redacted Voxa client error"/);
  assert.doesNotMatch(reporting, /replayIntegration|browserTracingIntegration/);
});
