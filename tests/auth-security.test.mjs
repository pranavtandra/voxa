import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("Voxa exposes the complete email account lifecycle", async () => {
  const [page, client, persistence] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("lib/supabase.ts", root), "utf8"),
    readFile(new URL("lib/persistence.ts", root), "utf8"),
  ]);
  assert.match(page, /auth\.signUp/);
  assert.match(page, /auth\.signInWithPassword/);
  assert.match(page, /auth\.signInWithOAuth\(\{provider:"google"/);
  assert.match(page, /Continue with Google/);
  assert.match(page, /redirectTo/);
  assert.match(page, /auth\.resetPasswordForEmail/);
  assert.doesNotMatch(page, /data\.user\.identities/, "signup must not reveal whether an email is registered");
  assert.doesNotMatch(page, /An account already exists for that email/);
  assert.match(page, /If this address can receive a signup email/);
  assert.match(page, /If an account exists for that email/);
  assert.match(page, /auth\.updateUser/);
  assert.match(page, /auth\.signOut/);
  assert.match(page, /auth\.signOut\(\{scope:"local"\}\)/, "logout should end the current browser session");
  assert.match(page, /Logging out…/, "logout should prevent duplicate clicks while the request is active");
  assert.match(page, /await flushPersistenceQueue\(\)/, "logout should flush pending account data before ending the session");
  assert.match(page, /getPersistenceStatus\(\)\.pending>0/, "logout should remain blocked while writes are pending");
  assert.match(page, /Voxa couldn't save your latest changes/, "a failed final sync should keep the user logged in");
  assert.doesNotMatch(page, /localStorage\.setItem\(key,JSON\.stringify\(value\)\)/, "account communication data must not be mirrored into browser storage");
  assert.match(page, /await queueButtonSave\(userId,item as CustomButtonRecord\)/, "custom buttons should enter the durable save queue before the editor closes");
  assert.match(page, /savingWord\?"Saving…":"Add word"/, "custom button saves should expose their pending state");
  assert.match(page, /async function recordHistory/, "spoken messages should use an explicit persistence path");
  assert.match(page, /bindSpeechHistory\(u,/, "history should save when speech starts");
  assert.match(page, /await queueHistorySave\(userId,entry\)/, "spoken history should await its durable Supabase save");
  assert.match(persistence, /select\("key,value"\)\.eq\("user_id", userId\)/, "account startup should load saved values in one query");
  assert.match(page, /pendingCloudLoads\.get\(userId\)/, "simultaneous preference hooks should share the startup query");
  assert.match(persistence, /indexedDB\.open\(DB_NAME, 1\)/, "pending writes should survive page closure in IndexedDB");
  assert.match(persistence, /window\.addEventListener\("online"/, "pending writes should retry when connectivity returns");
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

test("authenticated storage is bounded and generated sentences are rate limited", async () => {
  const [migration, route] = await Promise.all([
    readFile(new URL("supabase/migrations/20261009165633_constrain_user_data_and_rate_limit_generation.sql", root), "utf8"),
    readFile(new URL("app/api/generate/route.ts", root), "utf8"),
  ]);
  assert.match(migration, /voxa_user_data_allowed_key/);
  assert.match(migration, /pg_column_size\(value\) <= 2097152/);
  assert.match(migration, /security invoker[\s\S]+set search_path = ''/i);
  assert.match(migration, /caller_id uuid := \(select auth\.uid\(\)\)/);
  assert.equal((migration.match(/on private\.generation_rate_limits for (select|insert|update)/gi) || []).length, 3);
  assert.match(migration, /revoke all on function public\.consume_generation_quota\(\) from public, anon/i);
  assert.match(route, /client\.rpc\("consume_generation_quota"\)/);
  assert.match(route, /errorResponse\("Too many requests", 429/);
  assert.match(route, /errorResponse\("Service unavailable", 503\)/);
});

test("Voxa media storage is private and owner-scoped", async () => {
  const [sql, media, page] = await Promise.all([
    readFile(new URL("supabase/migrations/20261008190823_harden_user_data_and_private_storage.sql", root), "utf8"),
    readFile(new URL("lib/private-media.ts", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
  ]);
  assert.match(sql, /'voxa-user-media'[\s\S]+false/i);
  assert.match(sql, /update storage\.buckets set public = false/i);
  assert.equal((sql.match(/on storage\.objects for (select|insert|update|delete)/gi) || []).length, 4);
  assert.equal((sql.match(/owner_id = \(select auth\.uid\(\)\)::text/g) || []).length, 5);
  assert.equal((sql.match(/storage\.foldername\(name\)/g) || []).length, 5);
  assert.match(media, /createSignedUrls\(paths, SIGNED_URL_TTL_SECONDS\)/, "private image URLs should be signed in one bounded request");
  assert.match(media, /\.upload\(path, file, \{ contentType: file\.type, upsert: false \}\)/);
  assert.match(page, /imagePath=`\$\{userId\}\/\$\{id\}\.\$\{extension\}`/);
  assert.match(page, /await uploadPrivateMedia\(imagePath,newImageFile\)/);
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
  assert.doesNotMatch(page, /function useLocal/);
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
  assert.match(edgeFunction, /MAX_BODY_BYTES = 8_192/);
});

test("automatic error reports exclude communication and identity data", async () => {
  const reporting = await readFile(new URL("lib/error-reporting.ts", root), "utf8");
  assert.doesNotMatch(reporting, /sendDefaultPii: true/);
  assert.match(reporting, /maxBreadcrumbs: 0/);
  for (const field of ["user", "request", "breadcrumbs", "contexts", "extra"]) {
    assert.match(reporting, new RegExp(`delete event\\.${field}`));
  }
  assert.match(reporting, /exception\.value = "Redacted Voxa client error"/);
  assert.match(reporting, /import\("@sentry\/react"\)/);
  assert.match(reporting, /window\.addEventListener\("unhandledrejection"/);
  assert.doesNotMatch(reporting, /^import \* as Sentry/m);
  assert.doesNotMatch(reporting, /replayIntegration|browserTracingIntegration/);
});
