import { postJson, readLines } from "./http";
import type { GenerateParams, LLMProvider } from "./types";

/** Ollama local (gratis, los datos no salen de tu computadora). Instala ollama y ejecuta: ollama pull <modelo>. */
export function ollamaProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const base = (env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
  const model = env.OLLAMA_MODEL || "llama3.1:8b";
  const req = (p: GenerateParams, stream: boolean) => ({
    model,
    stream,
    messages: [{ role: "system", content: p.system }, ...p.messages],
    options: { num_predict: p.maxTokens ?? 2000, temperature: 0.2 },
    ...(p.json ? { format: "json" } : {}),
  });
  return {
    id: "ollama",
    label: "Ollama (local)",
    model,
    privacy: "local",
    async *stream(p) {
      const res = await postJson(`${base}/api/chat`, req(p, true), {}, 300_000);
      for await (const line of readLines(res)) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line) as { message?: { content?: string } };
          if (j.message?.content) yield j.message.content;
        } catch {
          /* línea parcial */
        }
      }
    },
    async complete(p) {
      const res = await postJson(`${base}/api/chat`, req(p, false), {}, 300_000);
      return ((await res.json()) as { message?: { content?: string } }).message?.content ?? "";
    },
  };
}
