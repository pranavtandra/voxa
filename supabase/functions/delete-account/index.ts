import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const defaultOrigins = ["https://voxa-communication.vercel.app"];
const MAX_BODY_BYTES = 8_192;
const allowedOrigins = new Set(
  (Deno.env.get("VOXA_ALLOWED_ORIGINS") || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeaders(origin: string | null) {
  return {
    ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  const cors = corsHeaders(origin);
  const jsonHeaders = { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (origin && !allowedOrigins.has(origin)) return new Response(JSON.stringify({ error: "Origin not allowed" }), { status: 403, headers: jsonHeaders });
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_BODY_BYTES) return new Response(JSON.stringify({ error: "Request too large" }), { status: 413, headers: jsonHeaders });
  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return new Response(JSON.stringify({ error: "Request too large" }), { status: 413, headers: jsonHeaders });
  const body = (() => { try { return JSON.parse(rawBody); } catch { return {}; } })();
  if (body.confirmation !== "DELETE") return new Response(JSON.stringify({ error: "Confirmation required" }), { status: 400, headers: jsonHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return new Response(JSON.stringify({ error: "Server configuration missing" }), { status: 500, headers: jsonHeaders });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = authorization.slice(7);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return new Response(JSON.stringify({ error: "Unable to delete account" }), { status: 500, headers: jsonHeaders });

  return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: jsonHeaders });
});
