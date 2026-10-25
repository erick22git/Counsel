/**
 * Arnés de evaluación de la IA legal (puro e inyectable: sin red ni BD).
 * Lo usan scripts/eval-ia.ts y tests/ai/eval-harness.test.ts.
 */
import { toSearchQuery } from "../src/lib/ai/text";
import type { LegalAnswer, LawHitLike } from "../src/lib/ai/legal-answer";
import type { LLMProvider } from "../src/lib/ai/providers/types";

export interface Question {
  id: string;
  pregunta: string;
  materia: string;
  norma_esperada?: string;
  articulo_esperado?: string;
  esperado?: "rechazo";
  verificado?: boolean;
  notas?: string;
}

export type AnswerFn = (opts: {
  question: string;
  retrieve: (q: string) => Promise<LawHitLike[]>;
  provider: LLMProvider;
}) => Promise<Pick<LegalAnswer, "text" | "citations" | "invalid" | "noSource" | "sources">>;

export interface QuestionResult {
  id: string;
  materia: string;
  tipo: "respondible" | "control";
  pregunta: string;
  verificado: boolean;
  esperado: string;
  /** respondible: la norma+artículo esperados están entre las fuentes citadas. */
  cita_correcta: boolean;
  /** respondible: se citó la norma esperada (aunque otro artículo). */
  cita_norma: boolean;
  /** respondible: el sistema se negó. */
  falso_rechazo: boolean;
  /** control: el sistema se negó. */
  rechazo_correcto: boolean;
  /** control: respondió con citas cuando debía negarse. */
  respondio_sin_base: boolean;
  citadas: string[];
  fuentes_recuperadas: string[];
  marcadores_invalidos: number;
  error?: string;
}

export interface Bucket { total: number; cita_correcta: number; cita_norma: number; falsos_rechazos: number; controles: number; rechazos_correctos: number }

export interface Metrics {
  respondibles: number;
  controles: number;
  precision_cita: number | null;
  precision_norma: number | null;
  tasa_falso_rechazo: number | null;
  tasa_rechazo_correcto: number | null;
  marcadores_invalidos: number;
  errores: number;
  por_materia: Record<string, Bucket>;
}

// ───────────────────────── Normalización y comparación ─────────────────────────
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "Artículo 5 bis", "Art. 5 BIS (parte 2)", "art 5°" → "5 bis" / "5". Devuelve null si no hay número. */
export function articleKey(a: string | null | undefined): string | null {
  if (!a) return null;
  const m = /(\d+)\s*[°º]?(?:[\s.\-]*(bis|ter|quater|quinquies|sexies|septies|octies|nonies|decies)(?![a-z]))?/i.exec(stripAccents(a));
  if (!m) return null;
  return m[2] ? `${m[1]} ${m[2].toLowerCase()}` : m[1];
}

export function sameNorm(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toUpperCase() === b.trim().toUpperCase();
}

export function citationMatches(c: { code: string; article: string | null }, normaEsperada: string, articuloEsperado: string): boolean {
  const k1 = articleKey(c.article);
  const k2 = articleKey(articuloEsperado);
  return sameNorm(c.code, normaEsperada) && k1 !== null && k1 === k2;
}

// ───────────────────────── Evaluación ─────────────────────────
export async function evaluateQuestion(q: Question, deps: { answer: AnswerFn; retrieve: (q: string) => Promise<LawHitLike[]>; provider: LLMProvider }): Promise<QuestionResult> {
  const control = q.esperado === "rechazo";
  const base: QuestionResult = {
    id: q.id, materia: q.materia, tipo: control ? "control" : "respondible", pregunta: q.pregunta, verificado: q.verificado === true,
    esperado: control ? "rechazo" : `${q.norma_esperada ?? "?"} ${q.articulo_esperado ?? "?"}`,
    cita_correcta: false, cita_norma: false, falso_rechazo: false, rechazo_correcto: false, respondio_sin_base: false,
    citadas: [], fuentes_recuperadas: [], marcadores_invalidos: 0,
  };
  try {
    const a = await deps.answer({ question: q.pregunta, retrieve: deps.retrieve, provider: deps.provider });
    base.citadas = a.citations.map((c) => `${c.code} ${c.article ?? "sin artículo"}`);
    base.fuentes_recuperadas = a.sources.map((s) => `${s.code} ${s.article ?? "sin artículo"}`);
    base.marcadores_invalidos = a.invalid.length;
    if (control) {
      base.rechazo_correcto = a.noSource;
      base.respondio_sin_base = !a.noSource && a.citations.length > 0;
    } else {
      base.falso_rechazo = a.noSource;
      base.cita_norma = a.citations.some((c) => sameNorm(c.code, q.norma_esperada));
      base.cita_correcta = a.citations.some((c) => citationMatches(c, q.norma_esperada ?? "", q.articulo_esperado ?? ""));
    }
  } catch (e) {
    base.error = e instanceof Error ? e.message : String(e);
  }
  return base;
}

const ratio = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 1000) / 1000);

export function computeMetrics(results: QuestionResult[]): Metrics {
  const resp = results.filter((r) => r.tipo === "respondible");
  const ctl = results.filter((r) => r.tipo === "control");
  const por: Record<string, Bucket> = {};
  for (const r of results) {
    const b = (por[r.materia] ??= { total: 0, cita_correcta: 0, cita_norma: 0, falsos_rechazos: 0, controles: 0, rechazos_correctos: 0 });
    if (r.tipo === "respondible") {
      b.total++;
      if (r.cita_correcta) b.cita_correcta++;
      if (r.cita_norma) b.cita_norma++;
      if (r.falso_rechazo) b.falsos_rechazos++;
    } else {
      b.controles++;
      if (r.rechazo_correcto) b.rechazos_correctos++;
    }
  }
  return {
    respondibles: resp.length,
    controles: ctl.length,
    precision_cita: ratio(resp.filter((r) => r.cita_correcta).length, resp.length),
    precision_norma: ratio(resp.filter((r) => r.cita_norma).length, resp.length),
    tasa_falso_rechazo: ratio(resp.filter((r) => r.falso_rechazo).length, resp.length),
    tasa_rechazo_correcto: ratio(ctl.filter((r) => r.rechazo_correcto).length, ctl.length),
    marcadores_invalidos: results.reduce((a, r) => a + r.marcadores_invalidos, 0),
    errores: results.filter((r) => r.error).length,
    por_materia: por,
  };
}

export async function runEval(questions: Question[], deps: { answer: AnswerFn; retrieve: (q: string) => Promise<LawHitLike[]>; provider: LLMProvider; onProgress?: (r: QuestionResult) => void }) {
  const results: QuestionResult[] = [];
  for (const q of questions) {
    const r = await evaluateQuestion(q, deps);
    results.push(r);
    deps.onProgress?.(r);
  }
  const unverified = results.filter((r) => !r.verificado).length;
  return { results, metrics: computeMetrics(results), unverified, official: results.length > 0 && unverified === 0 };
}

// ───────────────────────── Recuperador de fixture ─────────────────────────
export interface FixtureChunk { id: string; code: string; law_title: string; article: string | null; heading?: string | null; content: string }

const stem = (w: string) => w.slice(0, 5);
const tokens = (s: string) =>
  stripAccents(s.toLowerCase()).replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);

/** Recuperador simple por palabras clave (raíz de 5 letras). Sin coincidencias → lista vacía (el sistema debe negarse). */
export function fixtureRetriever(chunks: FixtureChunk[], limit = 4, minScore = 2): (q: string) => Promise<LawHitLike[]> {
  const docs = chunks.map((c) => ({ c, stems: new Set(tokens(`${c.heading ?? ""} ${c.content}`).map(stem)) }));
  return async (question) => {
    const qs = new Set(toSearchQuery(question).split(" or ").filter(Boolean).map((w) => stem(stripAccents(w))));
    return docs
      .map(({ c, stems }) => ({ c, score: [...qs].filter((s) => stems.has(s)).length }))
      .filter((x) => x.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ c, score }) => ({
        id: c.id, code: c.code, law_title: c.law_title, article: c.article, heading: c.heading ?? null, content: c.content,
        source_name: "Texto ficticio de prueba (demo)", source_url: null, license: "Sin licencia (inventado para pruebas)", is_demo: true, rank: score,
      }));
  };
}

// ───────────────────────── Presentación ─────────────────────────
export const UNOFFICIAL_BANNER =
  "AVISO: preguntas NO verificadas por un abogado. Estos números sirven para ver tendencias y validar el arnés; NO son una métrica oficial de calidad.";

const pct = (x: number | null) => (x === null ? "  n/d" : `${(x * 100).toFixed(0).padStart(3)}%`);

export function formatTable(results: QuestionResult[], metrics: Metrics, o: { official: boolean; unverified: number }): string {
  const L: string[] = [];
  if (!o.official) L.push(UNOFFICIAL_BANNER, `(${o.unverified} de ${results.length} preguntas sin verificar)`, "");
  L.push("id       materia         tipo         resultado");
  for (const r of results) {
    const res = r.error
      ? `ERROR: ${r.error}`
      : r.tipo === "control"
        ? r.rechazo_correcto ? "OK  se negó" : "MAL respondió sin base"
        : r.cita_correcta ? "OK  cita correcta" : r.falso_rechazo ? "MAL falso rechazo" : r.cita_norma ? "~   norma sí, artículo no" : "MAL no citó lo esperado";
    L.push(`${r.id.padEnd(8)} ${r.materia.padEnd(15)} ${r.tipo.padEnd(12)} ${res}`);
  }
  L.push("", `Precisión de cita (norma+artículo): ${pct(metrics.precision_cita)}   solo norma: ${pct(metrics.precision_norma)}`);
  L.push(`Falsos rechazos: ${pct(metrics.tasa_falso_rechazo)}   Rechazo correcto en controles: ${pct(metrics.tasa_rechazo_correcto)}   Marcadores [S#] inválidos: ${metrics.marcadores_invalidos}`);
  L.push("", "Por materia (cita correcta / respondibles, falsos rechazos):");
  for (const [m, b] of Object.entries(metrics.por_materia)) {
    L.push(`  ${m.padEnd(16)} ${b.total ? `${b.cita_correcta}/${b.total}, falsos rechazos ${b.falsos_rechazos}` : `controles: ${b.rechazos_correctos}/${b.controles} se negó`}`);
  }
  return L.join("\n");
}
