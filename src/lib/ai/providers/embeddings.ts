import { isLocalUrl, postJson } from "./http";
import { ProviderConfigError, type EmbeddingProvider } from "./types";

/**
 * Dimensión del vector guardado en law_chunks.embedding (columna vector(N), ver migración 0001).
 * Cambiar de modelo de embeddings con otra dimensión OBLIGA a: migrar la columna y las funciones
 * match_laws (supabase/templates/change-embedding-dimension.sql) y re-ingestar con `npm run ingest:leyes -- --embed`.
 */
export const DB_EMBEDDING_DIM = 1024;

/** EMBEDDINGS_PROVIDER = none | voyage | ollama | gemini | openai. Devuelve null si no hay (la búsqueda usa solo texto completo). */
export function getEmbedder(env: NodeJS.ProcessEnv = process.env): EmbeddingProvider | null {
  const kind = (env.EMBEDDINGS_PROVIDER || (env.VOYAGE_API_KEY ? "voyage" : "none")).toLowerCase();
  const dimensions = Number(env.EMBEDDINGS_DIM || DB_EMBEDDING_DIM);
  if (kind === "none") return null;
  const model = env.EMBEDDINGS_MODEL;

  if (kind === "voyage") {
    const m = model || "voyage-3";
    return {
      id: "voyage", model: m, dimensions,
      async embed(texts, type) {
        if (!env.VOYAGE_API_KEY) throw new ProviderConfigError("Falta VOYAGE_API_KEY.");
        const r = await postJson("https://api.voyageai.com/v1/embeddings", { input: texts, model: m, input_type: type === "query" ? "query" : "document", output_dimension: dimensions }, { Authorization: `Bearer ${env.VOYAGE_API_KEY}` }, 30_000);
        return ((await r.json()) as { data: { embedding: number[] }[] }).data.map((d) => d.embedding);
      },
    };
  }
  if (kind === "ollama") {
    const base = (env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
    const m = model || "nomic-embed-text";
    return {
      id: "ollama", model: m, dimensions,
      async embed(texts) {
        const r = await postJson(`${base}/api/embed`, { model: m, input: texts }, {}, 120_000);
        return ((await r.json()) as { embeddings: number[][] }).embeddings;
      },
    };
  }
  if (kind === "gemini") {
    const m = model || "gemini-embedding-001";
    return {
      id: "gemini", model: m, dimensions,
      async embed(texts, type) {
        if (!env.GEMINI_API_KEY) throw new ProviderConfigError("Falta GEMINI_API_KEY.");
        const r = await postJson(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:batchEmbedContents`,
          { requests: texts.map((t) => ({ model: `models/${m}`, content: { parts: [{ text: t }] }, taskType: type === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT", outputDimensionality: dimensions })) },
          { "x-goog-api-key": env.GEMINI_API_KEY }, 60_000);
        return ((await r.json()) as { embeddings: { values: number[] }[] }).embeddings.map((e) => e.values);
      },
    };
  }
  if (kind === "openai") {
    const base = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const m = model || "text-embedding-3-small";
    return {
      id: "openai", model: m, dimensions,
      async embed(texts) {
        if (!env.OPENAI_API_KEY && !isLocalUrl(base)) throw new ProviderConfigError("Falta OPENAI_API_KEY.");
        const r = await postJson(`${base}/embeddings`, { model: m, input: texts, ...(dimensions ? { dimensions } : {}) }, env.OPENAI_API_KEY ? { Authorization: `Bearer ${env.OPENAI_API_KEY}` } : {}, 60_000);
        return ((await r.json()) as { data: { embedding: number[] }[] }).data.map((d) => d.embedding);
      },
    };
  }
  throw new ProviderConfigError(`EMBEDDINGS_PROVIDER desconocido: ${kind}`);
}

/** Verdadero si el embedder configurado es compatible con la columna actual de la base. */
export function embedderMatchesDb(e: EmbeddingProvider | null): boolean {
  return !!e && e.dimensions === DB_EMBEDDING_DIM;
}
