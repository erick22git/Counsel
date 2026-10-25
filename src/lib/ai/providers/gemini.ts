import { postJson, readLines } from "./http";
import { ProviderConfigError, type GenerateParams, type LLMProvider } from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

function body(p: GenerateParams) {
  return {
    systemInstruction: { parts: [{ text: p.system }] },
    contents: p.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: p.maxTokens ?? 4000, ...(p.json ? { responseMimeType: "application/json" } : {}) },
  };
}

const textOf = (j: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) =>
  (j.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("");

/** Gemini por REST. El nivel gratuito puede usar tus datos para mejorar productos de Google: GEMINI_TIER=paid si tienes facturación activa. */
export function geminiProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const key = () => {
    if (!env.GEMINI_API_KEY) throw new ProviderConfigError("Falta GEMINI_API_KEY.");
    return env.GEMINI_API_KEY;
  };
  return {
    id: "gemini",
    label: "Gemini (Google)",
    model,
    privacy: env.GEMINI_TIER === "paid" ? "cloud-paid" : "cloud-free",
    async *stream(p) {
      const res = await postJson(`${BASE}/models/${model}:streamGenerateContent?alt=sse`, body(p), { "x-goog-api-key": key() });
      for await (const line of readLines(res)) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        try {
          const t = textOf(JSON.parse(data));
          if (t) yield t;
        } catch {
          /* línea parcial */
        }
      }
    },
    async complete(p) {
      const res = await postJson(`${BASE}/models/${model}:generateContent`, body(p), { "x-goog-api-key": key() });
      return textOf(await res.json());
    },
  };
}
