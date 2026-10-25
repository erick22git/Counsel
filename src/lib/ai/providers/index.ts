import { anthropicProvider } from "./anthropic";
import { geminiProvider } from "./gemini";
import { mockProvider } from "./mock";
import { ollamaProvider } from "./ollama";
import { openaiProvider } from "./openai";
import { ProviderConfigError, type LLMProvider, type PrivacyClass, type ProviderId } from "./types";

export * from "./types";
export { mockProvider } from "./mock";
export { getEmbedder, embedderMatchesDb, DB_EMBEDDING_DIM } from "./embeddings";

const IDS: ProviderId[] = ["anthropic", "gemini", "ollama", "openai", "mock"];

/** Proveedor activo según AI_PROVIDER (por defecto "ollama": local y gratis). */
export function getLLM(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const id = (env.AI_PROVIDER || "ollama").toLowerCase() as ProviderId;
  if (!IDS.includes(id)) throw new ProviderConfigError(`AI_PROVIDER inválido: "${id}". Usa: ${IDS.join(", ")}.`);
  switch (id) {
    case "anthropic": return anthropicProvider(env);
    case "gemini": return geminiProvider(env);
    case "openai": return openaiProvider(env);
    case "mock": return mockProvider();
    default: return ollamaProvider(env);
  }
}

/** ¿Falta alguna clave obligatoria del proveedor activo? Devuelve el mensaje, o null si está listo. */
export function providerBlocker(env: NodeJS.ProcessEnv = process.env): string | null {
  const id = (env.AI_PROVIDER || "ollama").toLowerCase();
  if (id === "anthropic" && !env.ANTHROPIC_API_KEY) return "BLOQUEADO: requiere ANTHROPIC_API_KEY";
  if (id === "gemini" && !env.GEMINI_API_KEY) return "BLOQUEADO: requiere GEMINI_API_KEY";
  if (id === "openai" && !env.OPENAI_API_KEY && !/localhost|127\.0\.0\.1|192\.168\./.test(env.OPENAI_BASE_URL ?? "")) return "BLOQUEADO: requiere OPENAI_API_KEY";
  return null;
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  model: string;
  privacy: PrivacyClass;
  ready: boolean;
  /** Aviso visible en la interfaz (gratuito o local → no usar datos reales de clientes). */
  warning: string | null;
  blocker: string | null;
}

export const FREE_OR_LOCAL_WARNING = "Proveedor gratuito o local: no uses datos reales de clientes.";

export function providerStatus(env: NodeJS.ProcessEnv = process.env): ProviderStatus {
  const p = getLLM(env);
  const blocker = providerBlocker(env);
  return {
    id: p.id, label: p.label, model: p.model, privacy: p.privacy, ready: !blocker,
    warning: p.privacy === "cloud-paid" ? null : FREE_OR_LOCAL_WARNING,
    blocker,
  };
}
