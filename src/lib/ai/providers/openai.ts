import { isLocalUrl, postJson, readLines } from "./http";
import { ProviderConfigError, type GenerateParams, type LLMProvider } from "./types";

/** Cualquier endpoint compatible con OpenAI (OpenAI, LM Studio, vLLM, Groq, OpenRouter…). */
export function openaiProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const base = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.OPENAI_MODEL || "gpt-4o-mini";
  const headers = (): Record<string, string> => {
    if (!env.OPENAI_API_KEY && !isLocalUrl(base)) throw new ProviderConfigError("Falta OPENAI_API_KEY.");
    return env.OPENAI_API_KEY ? { Authorization: `Bearer ${env.OPENAI_API_KEY}` } : {};
  };
  const req = (p: GenerateParams, stream: boolean) => ({
    model,
    stream,
    max_tokens: p.maxTokens ?? 2000,
    temperature: 0.2,
    messages: [{ role: "system", content: p.system }, ...p.messages],
    ...(p.json ? { response_format: { type: "json_object" } } : {}),
  });
  return {
    id: "openai",
    label: isLocalUrl(base) ? "Servidor compatible (local)" : "API compatible con OpenAI",
    model,
    privacy: isLocalUrl(base) ? "local" : "cloud-paid",
    async *stream(p) {
      const res = await postJson(`${base}/chat/completions`, req(p, true), headers(), 300_000);
      for await (const line of readLines(res)) {
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const t = (JSON.parse(d) as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
          if (t) yield t;
        } catch {
          /* línea parcial */
        }
      }
    },
    async complete(p) {
      const res = await postJson(`${base}/chat/completions`, req(p, false), headers(), 300_000);
      return ((await res.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "";
    },
  };
}
