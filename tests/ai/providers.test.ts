import { afterEach, describe, expect, it, vi } from "vitest";
import { getLLM, providerBlocker, providerStatus } from "@/lib/ai/providers";
import { mockProvider } from "@/lib/ai/providers/mock";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { ollamaProvider } from "@/lib/ai/providers/ollama";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { getEmbedder, embedderMatchesDb } from "@/lib/ai/providers/embeddings";
import { answerLegalQuestion, type LawHitLike } from "@/lib/ai/legal-answer";
import { NO_SOURCE_MESSAGE } from "@/lib/ai/prompts";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const enc = new TextEncoder();
const streamBody = (lines: string[]) =>
  new Response(new ReadableStream({ start(c) { c.enqueue(enc.encode(lines.join("\n") + "\n")); c.close(); } }));
const collect = async (it: AsyncIterable<string>) => { let s = ""; for await (const d of it) s += d; return s; };
const P = { system: "s", messages: [{ role: "user" as const, content: "hola" }] };

afterEach(() => vi.unstubAllGlobals());

describe("selección de proveedor", () => {
  it("por defecto es ollama (local) y avisa que no uses datos reales", () => {
    const s = providerStatus(env({}));
    expect(s.id).toBe("ollama");
    expect(s.privacy).toBe("local");
    expect(s.warning).toMatch(/no uses datos reales/i);
  });
  it("respeta AI_PROVIDER y marca gemini gratis vs pago", () => {
    expect(getLLM(env({ AI_PROVIDER: "gemini" })).privacy).toBe("cloud-free");
    expect(getLLM(env({ AI_PROVIDER: "gemini", GEMINI_TIER: "paid" })).privacy).toBe("cloud-paid");
    expect(providerStatus(env({ AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "x" })).warning).toBeNull();
    expect(getLLM(env({ AI_PROVIDER: "openai", OPENAI_BASE_URL: "http://localhost:1234/v1" })).privacy).toBe("local");
  });
  it("rechaza proveedor inválido y reporta claves faltantes", () => {
    expect(() => getLLM(env({ AI_PROVIDER: "nope" }))).toThrow();
    expect(providerBlocker(env({ AI_PROVIDER: "gemini" }))).toMatch(/BLOQUEADO: requiere GEMINI_API_KEY/);
    expect(providerBlocker(env({ AI_PROVIDER: "anthropic" }))).toMatch(/ANTHROPIC_API_KEY/);
    expect(providerBlocker(env({ AI_PROVIDER: "ollama" }))).toBeNull();
    expect(providerBlocker(env({ AI_PROVIDER: "mock" }))).toBeNull();
  });
});

describe("proveedores HTTP (fetch simulado)", () => {
  it("gemini: SSE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => streamBody([
      'data: {"candidates":[{"content":{"parts":[{"text":"Hola "}]}}]}',
      'data: {"candidates":[{"content":{"parts":[{"text":"mundo"}]}}]}',
    ])));
    expect(await collect(geminiProvider(env({ GEMINI_API_KEY: "k" })).stream(P))).toBe("Hola mundo");
  });
  it("gemini: sin clave lanza error de configuración claro", async () => {
    await expect(collect(geminiProvider(env({})).stream(P))).rejects.toThrow(/GEMINI_API_KEY/);
  });
  it("ollama: NDJSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => streamBody(['{"message":{"content":"a"}}', '{"message":{"content":"b"},"done":true}'])));
    expect(await collect(ollamaProvider(env({})).stream(P))).toBe("ab");
  });
  it("ollama apagado: mensaje legible", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(ollamaProvider(env({})).complete(P)).rejects.toThrow(/No pude conectar/);
  });
  it("openai compatible: SSE y [DONE]", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => streamBody(['data: {"choices":[{"delta":{"content":"x"}}]}', 'data: {"choices":[{"delta":{"content":"y"}}]}', "data: [DONE]"])));
    expect(await collect(openaiProvider(env({ OPENAI_API_KEY: "k" })).stream(P))).toBe("xy");
  });
  it("401 se reporta como clave rechazada", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    await expect(openaiProvider(env({ OPENAI_API_KEY: "k" })).complete(P)).rejects.toThrow(/rechaz/);
  });
});

describe("regla: sin fuente no se llama al modelo", () => {
  const hit: LawHitLike = { id: "1", rank: 1, code: "DEMO", law_title: "Norma demo", article: "Artículo 1", content: "Texto ficticio sobre alquiler", source_name: "demo", source_url: null, license: "n/a", is_demo: true };
  it("sin fuentes: respuesta de rechazo y proveedor intacto", async () => {
    const provider = mockProvider();
    const spy = vi.spyOn(provider, "stream");
    const r = await answerLegalQuestion({ question: "¿Qué dice la ley?", retrieve: async () => [], provider });
    expect(r.noSource).toBe(true);
    expect(r.text).toBe(NO_SOURCE_MESSAGE);
    expect(spy).not.toHaveBeenCalled();
  });
  it("con fuentes: cita [S1] y la mapea", async () => {
    const r = await answerLegalQuestion({ question: "alquiler", retrieve: async () => [hit], provider: mockProvider() });
    expect(r.noSource).toBe(false);
    expect(r.citations[0]).toMatchObject({ n: 1, code: "DEMO", article: "Artículo 1" });
    expect(r.invalid).toEqual([]);
  });
  it("detecta citas inventadas", async () => {
    const provider = mockProvider({ reply: () => "Dice algo [S1] y algo inventado [S4]" });
    const r = await answerLegalQuestion({ question: "x", retrieve: async () => [hit], provider });
    expect(r.invalid).toEqual([4]);
  });
});

describe("embeddings", () => {
  it("ninguno por defecto; voyage si hay clave; detecta dimensión distinta de la base", () => {
    expect(getEmbedder(env({}))).toBeNull();
    expect(getEmbedder(env({ VOYAGE_API_KEY: "k" }))?.id).toBe("voyage");
    const e = getEmbedder(env({ EMBEDDINGS_PROVIDER: "ollama", EMBEDDINGS_DIM: "768" }));
    expect(e?.dimensions).toBe(768);
    expect(embedderMatchesDb(e)).toBe(false);
    expect(embedderMatchesDb(getEmbedder(env({ EMBEDDINGS_PROVIDER: "ollama" })))).toBe(true);
  });
});
