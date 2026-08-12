const SYSTEM_PROMPT = `You are the language assistance component of Voxa, an assistive communication application.
Transform concepts intentionally selected by a user into one short, natural sentence.
Preserve the user's meaning exactly. Never introduce a feeling, desire, opinion, request, person, object, context, or fact the user did not indicate.
Do not diagnose or interpret the user. Do not speak on behalf of the user beyond their selections.
Use clear, everyday language. Match the requested sentence style. Return only the suggested phrase.`;

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "Private mode" }, { status: 503 });
  const body = await request.json() as { selections?: Array<{id:string;label:string;category:string}>; style?: string };
  if (!body.selections?.length) return Response.json({ error: "No selections" }, { status: 400 });
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: `Style: ${body.style || "natural"}\nIntentional selections: ${JSON.stringify(body.selections)}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
    }),
  });
  if (!response.ok) return Response.json({ error: "Provider unavailable" }, { status: 502 });
  const result = await response.json() as { candidates?: Array<{content?:{parts?:Array<{text?:string}>}}> };
  const phrase = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!phrase) return Response.json({ error: "Empty response" }, { status: 502 });
  return Response.json({ phrase });
}
