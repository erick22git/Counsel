import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { answerLegalQuestion } from "@/lib/ai/legal-answer";
import { mockProvider } from "@/lib/ai/providers/mock";
import {
  articleKey, citationMatches, computeMetrics, evaluateQuestion, fixtureRetriever, formatTable, runEval,
  type AnswerFn, type FixtureChunk, type Question,
} from "../../evals/harness";

const provider = mockProvider();
const noRetrieve = async () => [];

function fake(map: Record<string, { code: string; article: string | null }[] | "noSource">): AnswerFn {
  return async ({ question }) => {
    const v = map[question];
    if (v === "noSource" || !v) return { text: "no", citations: [], invalid: [], noSource: true, sources: [] };
    const cits = v.map((c, i) => ({ n: i + 1, code: c.code, law_title: c.code, article: c.article, source_name: "x", source_url: null, license: "x", is_demo: true }));
    return { text: "ok", citations: cits, invalid: [], noSource: false, sources: [] };
  };
}

describe("comparación de artículos", () => {
  it("normaliza variantes", () => {
    expect(articleKey("Artículo 5")).toBe("5");
    expect(articleKey("Art. 5°")).toBe("5");
    expect(articleKey("Artículo 5 BIS (parte 2)")).toBe("5 bis");
    expect(articleKey("sin artículo")).toBeNull();
    expect(articleKey(null)).toBeNull();
  });
  it("5 no es 5 bis ni 15; norma sin importar mayúsculas", () => {
    expect(citationMatches({ code: "cc", article: "Artículo 5" }, "CC", "Artículo 5")).toBe(true);
    expect(citationMatches({ code: "CC", article: "Artículo 5 bis" }, "CC", "Artículo 5")).toBe(false);
    expect(citationMatches({ code: "CC", article: "Artículo 15" }, "CC", "Artículo 5")).toBe(false);
    expect(citationMatches({ code: "CP", article: "Artículo 5" }, "CC", "Artículo 5")).toBe(false);
  });
});

describe("métricas con respuestas simuladas", () => {
  const qs: Question[] = [
    { id: "a", pregunta: "A", materia: "civil", norma_esperada: "CC", articulo_esperado: "Artículo 1" },
    { id: "b", pregunta: "B", materia: "civil", norma_esperada: "CC", articulo_esperado: "Artículo 2" },
    { id: "c", pregunta: "C", materia: "penal", norma_esperada: "CP", articulo_esperado: "Artículo 3" },
    { id: "d", pregunta: "D", materia: "penal", norma_esperada: "CP", articulo_esperado: "Artículo 4" },
    { id: "x", pregunta: "X", materia: "fuera_de_base", esperado: "rechazo" },
    { id: "y", pregunta: "Y", materia: "fuera_de_base", esperado: "rechazo" },
  ];
  const answer = fake({
    A: [{ code: "CC", article: "Artículo 1" }],              // correcta
    B: [{ code: "CC", article: "Artículo 9" }],              // norma sí, artículo no
    C: "noSource",                                           // falso rechazo
    D: [{ code: "CP", article: "Artículo 4" }, { code: "CP", article: "Artículo 5" }], // correcta
    X: "noSource",                                           // rechazo correcto
    Y: [{ code: "CC", article: "Artículo 1" }],              // respondió sin base
  });

  it("calcula todo", async () => {
    const { results, metrics, official, unverified } = await runEval(qs, { answer, retrieve: noRetrieve, provider });
    expect(metrics.respondibles).toBe(4);
    expect(metrics.controles).toBe(2);
    expect(metrics.precision_cita).toBe(0.5);
    expect(metrics.precision_norma).toBe(0.75);
    expect(metrics.tasa_falso_rechazo).toBe(0.25);
    expect(metrics.tasa_rechazo_correcto).toBe(0.5);
    expect(metrics.por_materia.civil).toMatchObject({ total: 2, cita_correcta: 1, cita_norma: 2 });
    expect(metrics.por_materia.penal).toMatchObject({ total: 2, cita_correcta: 1, falsos_rechazos: 1 });
    expect(metrics.por_materia.fuera_de_base).toMatchObject({ controles: 2, rechazos_correctos: 1 });
    expect(results.find((r) => r.id === "y")?.respondio_sin_base).toBe(true);
    // Ninguna verificada → no oficial.
    expect(official).toBe(false);
    expect(unverified).toBe(6);
    expect(formatTable(results, metrics, { official, unverified })).toMatch(/NO verificadas/);
  });

  it("solo es oficial si todas están verificadas", async () => {
    const ver = qs.map((q) => ({ ...q, verificado: true }));
    const r = await runEval(ver, { answer, retrieve: noRetrieve, provider });
    expect(r.official).toBe(true);
    expect(formatTable(r.results, r.metrics, r).includes("NO verificadas")).toBe(false);
  });

  it("un error en una pregunta no tumba el resto", async () => {
    const boom: AnswerFn = async () => { throw new Error("proveedor caído"); };
    const r = await evaluateQuestion(qs[0], { answer: boom, retrieve: noRetrieve, provider });
    expect(r.error).toBe("proveedor caído");
    expect(computeMetrics([r]).errores).toBe(1);
  });

  it("sin datos devuelve null, no NaN", () => {
    const m = computeMetrics([]);
    expect(m.precision_cita).toBeNull();
    expect(m.tasa_rechazo_correcto).toBeNull();
  });
});

describe("modo fixture de punta a punta (answerLegalQuestion real + mock, sin claves ni BD)", () => {
  const corpus = JSON.parse(fs.readFileSync("evals/corpus-fixture.json", "utf8")) as { chunks: FixtureChunk[] };
  const file = JSON.parse(fs.readFileSync("evals/preguntas-fixture.json", "utf8")) as { preguntas: Question[]; controles: Question[] };

  it("el recuperador no devuelve nada para temas ajenos", async () => {
    const r = fixtureRetriever(corpus.chunks);
    expect(await r("¿Cuál es la receta del chupe de pollo?")).toEqual([]);
    expect((await r("¿Cuándo debe pagarse el canon del arrendamiento cada mes?"))[0].article).toBe("Artículo 2");
  });

  it("citas correctas y rechazo de controles", async () => {
    const { metrics } = await runEval([...file.preguntas, ...file.controles], { answer: answerLegalQuestion, retrieve: fixtureRetriever(corpus.chunks), provider });
    expect(metrics.errores).toBe(0);
    expect(metrics.tasa_rechazo_correcto).toBe(1);
    expect(metrics.tasa_falso_rechazo).toBe(0);
    expect(metrics.precision_cita).toBeGreaterThanOrEqual(0.8);
  });

  it("las preguntas reales: 30 + 5 controles, todas sin verificar", () => {
    const real = JSON.parse(fs.readFileSync("evals/preguntas.json", "utf8")) as { preguntas: Question[]; controles: Question[] };
    expect(real.preguntas).toHaveLength(30);
    expect(real.controles).toHaveLength(5);
    expect(real.preguntas.every((q) => q.verificado === false && /Pendiente de validación por un abogado/.test(q.notas ?? ""))).toBe(true);
    expect(new Set([...real.preguntas, ...real.controles].map((q) => q.id)).size).toBe(35);
    expect(real.controles.every((q) => q.esperado === "rechazo")).toBe(true);
  });
});
