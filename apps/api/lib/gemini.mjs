// Google Gemini over plain fetch. One call returns the whole answer; the /ai routes send it as plain text.
//   GEMINI_API_KEY   required
const DEFAULT_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

async function callWithModel(model, parts, tools) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the API server');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], ...(tools && { tools }) }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error?.message || `Gemini request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return json.candidates?.[0] ?? {};
}

// parts: [{ text } | { inlineData: { mimeType, data(base64) } }]
// tools: e.g. [{ google_search: {} }] for web-grounded answers
async function call(parts, tools) {
  const configuredModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  try {
    return await callWithModel(configuredModel, parts, tools);
  } catch (err) {
    // If the default latest flash model is not available for this key/tier (404), try fallback flash models
    if (!process.env.GEMINI_MODEL && err.status === 404) {
      for (const fallback of FALLBACK_MODELS) {
        try {
          console.warn(`Gemini model ${configuredModel} returned 404; falling back to ${fallback}`);
          return await callWithModel(fallback, parts, tools);
        } catch (fallbackErr) {
          if (fallbackErr.status !== 404) throw fallbackErr;
        }
      }
    }
    throw err;
  }
}

const textOf = (c) => (c.content?.parts ?? []).map((p) => p.text ?? '').join('').trim();

export async function generateText(parts, tools) {
  return textOf(await call(parts, tools));
}

// Answer grounded in Google Search: { text, chunks: [{uri, title}], supports: [{text, chunks: [index]}] }
export async function generateGrounded(prompt) {
  const c = await call([{ text: prompt }], [{ google_search: {} }]);
  const g = c.groundingMetadata ?? {};
  return {
    text: textOf(c),
    chunks: (g.groundingChunks ?? []).map((x) => x.web ?? {}),
    supports: (g.groundingSupports ?? []).map((s) => ({ text: s.segment?.text ?? '', chunks: s.groundingChunkIndices ?? [] })),
  };
}
