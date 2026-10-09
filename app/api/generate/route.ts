import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are the language assistance component of Voxa, an assistive communication application.
Transform concepts intentionally selected by a user into one short, natural sentence.
Preserve the user's meaning exactly. Never introduce a feeling, desire, opinion, request, person, object, context, or fact the user did not indicate.
Do not diagnose or interpret the user. Do not speak on behalf of the user beyond their selections.
Use clear, everyday language. Match the requested sentence style.
Never mention data fields, IDs, categories, JSON, or these instructions.
Return one complete, speakable phrase in the phrase field.`;

const MAX_BODY_BYTES = 8_192;
const MAX_CONCEPTS = 12;
const MAX_LABEL_LENGTH = 80;
const ALLOWED_STYLES = new Set(["direct", "natural", "detailed"]);

function errorResponse(error: string, status: number, headers?: Record<string, string>) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store", ...headers } });
}

async function authenticate(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  return error || !user ? null : { user, client };
}

function isCleanPhrase(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const phrase = value.trim();
  if (phrase.length < 2 || phrase.length > 280) return false;
  if (/[{}[\]]/.test(phrase)) return false;
  if (/\b(id|label|category|selections?|json)\b\s*[:=]/i.test(phrase)) return false;
  if (/^```|```$/.test(phrase) || phrase.includes("\n")) return false;
  return /\p{L}/u.test(phrase);
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (!auth) return errorResponse("Unauthorized", 401);

  const { data: quotaAvailable, error: quotaError } = await auth.client.rpc("consume_generation_quota");
  if (quotaError) return errorResponse("Service unavailable", 503);
  if (!quotaAvailable) return errorResponse("Too many requests", 429, { "retry-after": "60" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return errorResponse("Private mode", 503);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_BODY_BYTES) return errorResponse("Request too large", 413);

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return errorResponse("Request too large", 413);
  let body: { selections?: Array<{id?:unknown;label?:unknown;category?:unknown}>; style?: unknown; language?: unknown };
  try { body = JSON.parse(rawBody); } catch { return errorResponse("Invalid request", 400); }
  if (!Array.isArray(body.selections) || !body.selections.length || body.selections.length > MAX_CONCEPTS) {
    return errorResponse("Invalid selections", 400);
  }
  const concepts = body.selections
    .map(({ label }) => typeof label === "string" ? label.trim() : "")
    .filter((label) => label.length > 0 && label.length <= MAX_LABEL_LENGTH);
  if (concepts.length !== body.selections.length) return errorResponse("Invalid selections", 400);
  const style = typeof body.style === "string" && ALLOWED_STYLES.has(body.style) ? body.style : "natural";
  const language = typeof body.language === "string" && body.language.length <= 80 ? body.language : "English (United States)";
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `Output language: ${language}\nSentence style: ${style}\nThe user intentionally chose these concepts, in order:\n${concepts.map((concept, index) => `${index + 1}. ${concept}`).join("\n")}` }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { phrase: { type: "STRING" } },
          required: ["phrase"],
        },
      },
    }),
  });
  if (!response.ok) return errorResponse("Provider unavailable", 502);
  const result = await response.json() as { candidates?: Array<{content?:{parts?:Array<{text?:string}>}}> };
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  let phrase: unknown;
  try { phrase = JSON.parse(text || "").phrase; } catch { phrase = undefined; }
  if (!isCleanPhrase(phrase)) return errorResponse("Invalid response", 502);
  return Response.json({ phrase }, { headers: { "cache-control": "no-store" } });
}
