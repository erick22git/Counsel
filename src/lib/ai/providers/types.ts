// Contrato de proveedores de IA. Implementaciones: anthropic, gemini, ollama, openai (compatible), mock.
export type ProviderId = "anthropic" | "gemini" | "ollama" | "openai" | "mock";

/** Clasificación de privacidad: define el aviso que ve el usuario. */
export type PrivacyClass = "cloud-paid" | "cloud-free" | "local" | "mock";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateParams {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  /** Esfuerzo de razonamiento (solo lo usan proveedores que lo soportan). */
  effort?: "low" | "medium" | "high";
  /** Pide salida JSON (extracción). */
  json?: boolean;
}

export interface LLMProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly model: string;
  readonly privacy: PrivacyClass;
  /** Transmite fragmentos de texto. */
  stream(p: GenerateParams): AsyncIterable<string>;
  /** Respuesta completa. */
  complete(p: GenerateParams): Promise<string>;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[], kind: "query" | "document"): Promise<number[][]>;
}

export class ProviderConfigError extends Error {}
