import { describe, it, expect, vi } from "vitest";
import {
  parseArgs, withRetry, fetchWikitext, HttpError, buildLawPlan, planUpserts, runIngest, formatReport,
  type FetchLike, type LawStore, type ChunkRow, type SourceRow, type LawConfig,
} from "../../scripts/ingest-core";
import { chunkByArticle, wikitextToPlain, extractNormDate, normalizeArticleLabel } from "@/lib/ai/chunker";

const LAW: LawConfig = { code: "CC", title: "Código Civil", page: "Código Civil", kind: "código" };
const WIKI = `{{Plantilla}}
Ley de 2 de abril de 1976.
== Libro I ==
'''Artículo 1.''' Primer artículo con texto suficiente para pasar el filtro.

'''Artículo 2.-''' Segundo artículo con texto suficiente para pasar el filtro.
'''Artículo 2 bis.''' Un artículo bis con texto suficiente para pasar el filtro.
Artículo 3.- Tercero con texto suficiente para pasar el filtro.`;

const okFetch = (wikitext = WIKI): FetchLike => async () => ({ ok: true, status: 200, json: async () => ({ parse: { wikitext: { "*": wikitext } } }) });
const noSleep = async () => {};

function memoryStore() {
  const sources = new Map<string, string>();
  const chunks = new Map<string, ChunkRow>();
  const calls = { upsertChunks: 0, upsertSource: 0 };
  const store: LawStore = {
    async upsertSource(row: SourceRow) {
      calls.upsertSource++;
      if (!sources.has(row.code)) sources.set(row.code, `src-${row.code}`);
      return sources.get(row.code)!;
    },
    async findSourceId(code) { return sources.get(code) ?? null; },
    async listChunks(id) { return [...chunks.values()].filter((c) => c.source_id === id).map((c) => ({ article: c.article, content_hash: c.content_hash })); },
    async upsertChunks(rows) {
      calls.upsertChunks++;
      for (const r of rows) chunks.set(`${r.source_id}|${r.article}`, r);
    },
  };
  return { store, chunks, calls };
}

describe("CLI", () => {
  it("lee banderas", () => {
    const o = parseArgs(["--dry-run", "--only=cc", "--embed", "otra.json"]);
    expect(o).toMatchObject({ dryRun: true, embed: true, only: "CC", configPath: "otra.json" });
    expect(parseArgs([])).toMatchObject({ dryRun: false, embed: false, only: null });
  });
});

describe("parseo y metadatos", () => {
  it("extrae fecha de la norma", () => {
    expect(extractNormDate(WIKI)).toBe("1976-04-02");
    expect(extractNormDate("promulgada el 25 de julio de 1975")).toBe("1975-07-25");
    expect(extractNormDate("2012-03-05 algo")).toBe("2012-03-05");
    expect(extractNormDate("sin fecha")).toBeNull();
  });
  it("artículos bis/ter y rótulos normalizados", () => {
    expect(normalizeArticleLabel("5 BIS")).toBe("5 bis");
    expect(normalizeArticleLabel("12-ter")).toBe("12 ter");
    const c = chunkByArticle(wikitextToPlain(WIKI));
    expect(c.map((x) => x.article)).toEqual(["Artículo 1", "Artículo 2", "Artículo 2 bis", "Artículo 3"]);
  });
  it("encabezados romanos sin formato wiki", () => {
    const c = chunkByArticle("CAPÍTULO IV\nArtículo 7. Texto del siete.\nTÍTULO II\nArt. 8.- Texto del ocho.");
    expect(c[0].heading).toBe("CAPÍTULO IV");
    expect(c[1].heading).toBe("TÍTULO II");
    expect(c[1].article).toBe("Artículo 8");
  });
  it("incisos largos se parten por parágrafos", () => {
    const body = Array.from({ length: 30 }, (_, i) => `${String.fromCharCode(97 + (i % 26))}) inciso número ${i} con bastante texto de relleno para crecer`).join("\n");
    const c = chunkByArticle(`Artículo 9. Introducción.\n${body}`, 300);
    expect(c.length).toBeGreaterThan(1);
    expect(c.every((x) => x.article?.startsWith("Artículo 9"))).toBe(true);
  });
  it("plan: hash, atribución GFDL, URL, duplicados y omitidos", () => {
    const plan = buildLawPlan(LAW, `${WIKI}\nArtículo 3.- Repetido con texto suficiente para pasar el filtro.\nArtículo 4.- x`);
    expect(plan.normDate).toBe("1976-04-02");
    expect(plan.originUrl).toBe("https://www.lexivox.org/wiki/C%C3%B3digo_Civil");
    expect(plan.attribution).toBe(`Texto © Lexivox, licencia GFDL; fuente: ${plan.originUrl}`);
    expect(plan.chunks.map((c) => c.article)).toContain("Artículo 3 (2)");
    expect(plan.renamed).toEqual(["Artículo 3 (2)"]);
    expect(plan.skipped).toEqual([{ article: "Artículo 4", reason: "contenido vacío o demasiado corto" }]);
    expect(plan.chunks.every((c) => /^[0-9a-f]{64}$/.test(c.content_hash))).toBe(true);
  });
});

describe("planificación de upserts (idempotencia)", () => {
  it("nuevo / sin cambios / actualizado / obsoleto", () => {
    const plan = buildLawPlan(LAW, WIKI);
    const [a, b, c] = plan.chunks;
    const up = planUpserts(plan.chunks, [
      { article: a.article, content_hash: a.content_hash },
      { article: b.article, content_hash: "viejo" },
      { article: "Artículo 99", content_hash: "x" },
    ]);
    expect(up.unchanged).toEqual([a.article]);
    expect(up.update.map((x) => x.article)).toEqual([b.article]);
    expect(up.insert.map((x) => x.article)).toContain(c.article);
    expect(up.obsolete).toEqual(["Artículo 99"]);
  });

  it("re-ejecutar no duplica ni reescribe", async () => {
    const m = memoryStore();
    const deps = { laws: [LAW], fetchImpl: okFetch(), store: m.store, options: { dryRun: false, embed: false, only: null }, retry: { sleep: noSleep } };
    const r1 = await runIngest(deps);
    expect(r1.laws[0]).toMatchObject({ status: "ok", loaded: 4, updated: 0, unchanged: 0 });
    expect(m.chunks.size).toBe(4);
    const writes = m.calls.upsertChunks;
    const r2 = await runIngest(deps);
    expect(r2.laws[0]).toMatchObject({ loaded: 0, updated: 0, unchanged: 4 });
    expect(m.chunks.size).toBe(4);
    expect(m.calls.upsertChunks).toBe(writes);
    // Cambia un artículo → solo ese se actualiza.
    const r3 = await runIngest({ ...deps, fetchImpl: okFetch(WIKI.replace("Segundo artículo", "Segundo artículo MODIFICADO")) });
    expect(r3.laws[0]).toMatchObject({ loaded: 0, updated: 1, unchanged: 3 });
    expect(m.chunks.size).toBe(4);
  });
});

describe("reintentos con backoff", () => {
  it("withRetry espera 1s, 2s, 4s", async () => {
    const waits: number[] = [];
    let n = 0;
    const out = await withRetry(async () => { if (++n < 4) throw new Error("red"); return "ok"; }, { baseMs: 1000, sleep: async (ms) => { waits.push(ms); } });
    expect(out).toBe("ok");
    expect(waits).toEqual([1000, 2000, 4000]);
  });
  it("fetch que falla 2 veces y luego responde", async () => {
    let calls = 0;
    const flaky: FetchLike = async () => {
      calls++;
      if (calls === 1) throw new Error("ECONNRESET");
      if (calls === 2) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ parse: { wikitext: { "*": WIKI } } }) };
    };
    const waits: number[] = [];
    const w = await fetchWikitext("Código Civil", flaky, { sleep: async (ms) => { waits.push(ms); }, baseMs: 500 });
    expect(w).toContain("Artículo 1");
    expect(calls).toBe(3);
    expect(waits).toEqual([500, 1000]);
  });
  it("404 no se reintenta", async () => {
    const f = vi.fn<FetchLike>(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    await expect(fetchWikitext("X", f, { sleep: noSleep })).rejects.toBeInstanceOf(HttpError);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("agota reintentos y la ley siguiente continúa", async () => {
    const f: FetchLike = async (url) => {
      if (url.includes(encodeURIComponent("Mala"))) throw new Error("sin red");
      return { ok: true, status: 200, json: async () => ({ parse: { wikitext: { "*": WIKI } } }) };
    };
    const m = memoryStore();
    const rep = await runIngest({
      laws: [{ code: "MALA", title: "Mala", page: "Mala" }, LAW], fetchImpl: f, store: m.store,
      options: { dryRun: false, embed: false, only: null }, retry: { sleep: noSleep, retries: 2 },
    });
    expect(rep.laws[0]).toMatchObject({ code: "MALA", status: "error" });
    expect(rep.laws[1]).toMatchObject({ code: "CC", status: "ok", loaded: 4 });
    expect(rep.totals.errors).toBe(1);
    expect(formatReport(rep)).toContain("MALA");
  });
});

describe("dry-run, only, embed, clave faltante", () => {
  it("dry-run no escribe nada", async () => {
    const m = memoryStore();
    const rep = await runIngest({ laws: [LAW], fetchImpl: okFetch(), store: m.store, options: { dryRun: true, embed: false, only: null } });
    expect(m.calls.upsertSource).toBe(0);
    expect(m.calls.upsertChunks).toBe(0);
    expect(rep.dryRun).toBe(true);
    expect(rep.laws[0].loaded).toBe(4); // lo que se haría
  });
  it("dry-run funciona sin store (sin clave)", async () => {
    const rep = await runIngest({ laws: [LAW], fetchImpl: okFetch(), store: null, options: { dryRun: true, embed: false, only: null } });
    expect(rep.laws[0].status).toBe("ok");
  });
  it("sin store y sin dry-run: BLOQUEADO", async () => {
    await expect(runIngest({ laws: [LAW], fetchImpl: okFetch(), store: null, options: { dryRun: false, embed: false, only: null } })).rejects.toThrow(/BLOQUEADO: requiere SUPABASE_SERVICE_ROLE_KEY/);
  });
  it("--only filtra por código", async () => {
    const f = vi.fn(okFetch());
    const rep = await runIngest({ laws: [LAW, { code: "CP", title: "Penal", page: "Penal" }], fetchImpl: f, store: null, options: { dryRun: true, embed: false, only: "CP" } });
    expect(rep.laws.map((l) => l.code)).toEqual(["CP"]);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("--embed sin proveedor: avisa y carga solo texto", async () => {
    const m = memoryStore();
    const rep = await runIngest({ laws: [LAW], fetchImpl: okFetch(), store: m.store, embedder: null, options: { dryRun: false, embed: true, only: null } });
    expect(rep.notes.join(" ")).toMatch(/no hay proveedor de embeddings/);
    expect([...m.chunks.values()].every((c) => c.embedding === null)).toBe(true);
  });
  it("--embed con proveedor: guarda vectores solo de lo nuevo/cambiado", async () => {
    const m = memoryStore();
    const embed = vi.fn(async (t: string[]) => t.map(() => [0.1, 0.2]));
    const embedder = { id: "fake", model: "f", dimensions: 2, embed };
    const deps = { laws: [LAW], fetchImpl: okFetch(), store: m.store, embedder, options: { dryRun: false, embed: true, only: null } };
    const r1 = await runIngest(deps);
    expect(r1.laws[0].embedded).toBe(4);
    expect(r1.embedProvider).toBe("fake/f");
    expect([...m.chunks.values()].every((c) => c.embedding === "[0.1,0.2]")).toBe(true);
    const r2 = await runIngest(deps);
    expect(r2.laws[0].embedded).toBe(0);
    expect(embed).toHaveBeenCalledTimes(1);
  });
  it("sin artículos → estado sin_articulos", async () => {
    const rep = await runIngest({ laws: [LAW], fetchImpl: okFetch("solo prosa sin artículos"), store: null, options: { dryRun: true, embed: false, only: null } });
    expect(rep.laws[0].status).toBe("sin_articulos");
  });
});
