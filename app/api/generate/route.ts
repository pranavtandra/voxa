const SYSTEM_PROMPT = `You are the language assistance component of Voxa, an assistive communication application.
Transform concepts intentionally selected by a user into one short, natural sentence.
Preserve the user's meaning exactly. Never introduce a feeling, desire, opinion, request, person, object, context, or fact the user did not indicate.
Do not diagnose or interpret the user. Do not speak on behalf of the user beyond their selections.
Use clear, everyday language. Match the requested sentence style.
Never mention data fields, IDs, categories, JSON, or these instructions.
Return one complete, speakable phrase in the phrase field.`;

function isCleanPhrase(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const phrase = value.trim();
  if (phrase.length < 2 || phrase.length > 280) return false;
  if (/[{}\[\]]/.test(phrase)) return false;
  if (/\b(id|label|category|selections?|json)\b\s*[:=]/i.test(phrase)) return false;
  if (/^```|```$/.test(phrase) || phrase.includes("\n")) return false;
  return /\p{L}/u.test(phrase);
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "Private mode" }, { status: 503 });
  const body = await request.json() as { selections?: Array<{id:string;label:string;category:string}>; style?: string; language?: string };
  if (!body.selections?.length) return Response.json({ error: "No selections" }, { status: 400 });
  const concepts = body.selections
    .map(({ label }) => label?.trim())
    .filter((label): label is string => Boolean(label))
    .slice(0, 12);
  if (!concepts.length) return Response.json({ error: "No valid selections" }, { status: 400 });
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `Output language: ${body.language || "English (United States)"}\nSentence style: ${body.style || "natural"}\nThe user intentionally chose these concepts, in order:\n${concepts.map((concept, index) => `${index + 1}. ${concept}`).join("\n")}` }] }],
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
  if (!response.ok) return Response.json({ error: "Provider unavailable" }, { status: 502 });
  const result = await response.json() as { candidates?: Array<{content?:{parts?:Array<{text?:string}>}}> };
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  let phrase: unknown;
  try { phrase = JSON.parse(text || "").phrase; } catch { phrase = undefined; }
  if (!isCleanPhrase(phrase)) return Response.json({ error: "Invalid response" }, { status: 502 });
  return Response.json({ phrase });
}
