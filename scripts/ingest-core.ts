/**
 * Núcleo PURO de la ingesta de leyes (sin red ni BD directas): todo lo que toca el exterior se inyecta.
 * Lo usan scripts/ingest-leyes.ts y tests/ai/ingest.test.ts.
 */
import { createHash } from "node:crypto";
import { wikitextToPlain, htmlToPlain, htmlTitle, chunkByArticle, extractNormDate } from "../src/lib/ai/chunker";
import type { EmbeddingProvider } from "../src/lib/ai/providers/types";

export const LEXIVOX_BASE = "https://www.lexivox.org";

/** `norm`: id de Lexivox (p. ej. BO-L-N439) → se lee /norms/<id>.xhtml. Sin `norm`, `page` es un título de wiki (modo antiguo). */
export interface LawConfig { code: string; title: string; page: string; norm?: string; kind?: string }

export interface CliOptions { dryRun: boolean; embed: boolean; only: string | null; configPath: string; help: boolean }

export function parseArgs(argv: string[]): CliOptions {
  const o: CliOptions = { dryRun: false, embed: false, only: null, configPath: "scripts/leyes.config.json", help: false };
  for (const a of argv) {
    if (a === "--dry-run") o.dryRun = true;
    else if (a === "--embed") o.embed = true;
    else if (a === "--help" || a === "-h") o.help = true;
    else if (a.startsWith("--only=")) o.only = a.slice(7).trim().toUpperCase() || null;
    else if (!a.startsWith("--")) o.configPath = a;
  }
  return o;
}

// ───────────────────────── Reintentos ─────────────────────────
export interface RetryOptions {
  retries?: number; // reintentos adicionales (por defecto 3 → 4 intentos)
  baseMs?: number; // espera inicial; se duplica en cada reintento
  maxMs?: number;
  sleep?: (ms: number) => Promise<void>;
  shouldRetry?: (e: unknown) => boolean;
  onRetry?: (e: unknown, attempt: number, waitMs: number) => void;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function isRetryable(e: unknown): boolean {
  if (e instanceof HttpError) return e.status === 429 || e.status === 408 || e.status >= 500;
  return true; // errores de red / timeout
}

export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseMs ?? 1000;
  const max = opts.maxMs ?? 30_000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const should = opts.shouldRetry ?? isRetryable;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      if (attempt >= retries || !should(e)) throw e;
      const wait = Math.min(max, base * 2 ** attempt);
      opts.onRetry?.(e, attempt + 1, wait);
      await sleep(wait);
    }
  }
}

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text?(): Promise<string> }>;

export function normUrl(norm: string): string {
  return `${LEXIVOX_BASE}/norms/${encodeURIComponent(norm)}.xhtml`;
}

/** Descarga el XHTML de una norma. Lexivox responde 200 con una página de error si la norma no existe: se detecta y se trata como 404. */
export async function fetchNormHtml(norm: string, fetchImpl: FetchLike, opts: RetryOptions & { timeoutMs?: number } = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  return withRetry(async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetchImpl(normUrl(norm), { headers: { "User-Agent": "CounselLegalIngest/0.3 (contacto: administrador del despacho)" }, signal: ctrl.signal });
      if (!r.ok) throw new HttpError(r.status, `HTTP ${r.status} en ${norm}`);
      const html = r.text ? await r.text() : "";
      if (/Norma inexistente en la base de datos/i.test(html)) throw new HttpError(404, `Lexivox no tiene la norma ${norm}`);
      if (!html) throw new HttpError(404, `sin contenido en ${norm}`);
      return html;
    } finally {
      clearTimeout(t);
    }
  }, opts);
}

export function wikitextUrl(page: string): string {
  return `${LEXIVOX_BASE}/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
}
export function pageUrl(page: string): string {
  return `${LEXIVOX_BASE}/wiki/${encodeURIComponent(page.replace(/ /g, "_"))}`;
}

/** Descarga el wikitext con timeout y reintentos con backoff exponencial. */
export async function fetchWikitext(page: string, fetchImpl: FetchLike, opts: RetryOptions & { timeoutMs?: number } = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  return withRetry(async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetchImpl(wikitextUrl(page), {
        headers: { "User-Agent": "CounselLegalIngest/0.2 (contacto: administrador del despacho)" },
        signal: ctrl.signal,
      });
      if (!r.ok) throw new HttpError(r.status, `HTTP ${r.status} en "${page}"`);
      const j = (await r.json()) as { parse?: { wikitext?: { "*"?: string } | string }; error?: { info?: string } };
      const w = j.parse?.wikitext;
      const text = typeof w === "string" ? w : w?.["*"];
      if (!text) throw new HttpError(404, j.error?.info ?? `sin contenido en "${page}"`);
      return text;
    } finally {
      clearTimeout(t);
    }
  }, opts);
}

// ───────────────────────── Plan de carga ─────────────────────────
export const MIN_CONTENT_CHARS = 15;

export interface PlannedChunk {
  article: string;
  heading: string | null;
  content: string;
  content_hash: string;
}
export interface SkippedItem { article: string | null; reason: string }

export interface LawPlan {
  chunks: PlannedChunk[];
  skipped: SkippedItem[];
  /** Rótulos repetidos en la fuente que se renombraron ("Artículo 5 (2)"). Informativo. */
  renamed: string[];
  normDate: string | null;
  originUrl: string;
  attribution: string;
}

export function hashContent(heading: string | null, content: string): string {
  return createHash("sha256").update(`${heading ?? ""}\n${content}`).digest("hex");
}

export function attributionFor(url: string): string {
  return `Texto © Lexivox, licencia GFDL; fuente: ${url}`;
}

/** wikitext → fragmentos únicos por artículo, con hash y metadatos. Artículos repetidos se numeran "(2)", "(3)". */
export function buildLawPlan(law: LawConfig, source: string): LawPlan {
  const html = !!law.norm;
  const originUrl = html ? normUrl(law.norm!) : pageUrl(law.page);
  const raw = chunkByArticle(html ? htmlToPlain(source) : wikitextToPlain(source));
  const skipped: SkippedItem[] = [];
  const renamed: string[] = [];
  const seen = new Map<string, number>();
  const chunks: PlannedChunk[] = [];
  for (const c of raw) {
    const base = c.article ?? "sin número";
    if (c.content.replace(/\s+/g, " ").trim().length < MIN_CONTENT_CHARS) {
      skipped.push({ article: base, reason: "contenido vacío o demasiado corto" });
      continue;
    }
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const article = n === 1 ? base : `${base} (${n})`;
    if (n > 1) renamed.push(article);
    chunks.push({ article, heading: c.heading, content: c.content, content_hash: hashContent(c.heading, c.content) });
  }
  return { chunks, skipped, renamed, normDate: extractNormDate(html ? (htmlTitle(source) ?? "") : source), originUrl, attribution: attributionFor(originUrl) };
}

export interface ExistingChunk { article: string | null; content_hash: string | null }

export interface UpsertPlan {
  insert: PlannedChunk[];
  update: PlannedChunk[];
  unchanged: string[];
  /** Existen en la BD pero ya no en la fuente: no se borran, solo se informan. */
  obsolete: string[];
}

/** Compara lo descargado con lo que ya hay. Re-ejecutar con el mismo texto → todo "unchanged". */
export function planUpserts(planned: PlannedChunk[], existing: ExistingChunk[]): UpsertPlan {
  const byArticle = new Map(existing.filter((e) => e.article).map((e) => [e.article as string, e.content_hash]));
  const out: UpsertPlan = { insert: [], update: [], unchanged: [], obsolete: [] };
  const keep = new Set<string>();
  for (const c of planned) {
    keep.add(c.article);
    if (!byArticle.has(c.article)) out.insert.push(c);
    else if (byArticle.get(c.article) === c.content_hash) out.unchanged.push(c.article);
    else out.update.push(c);
  }
  out.obsolete = [...byArticle.keys()].filter((a) => !keep.has(a));
  return out;
}

// ───────────────────────── Orquestación ─────────────────────────
export interface SourceRow {
  code: string; title: string; kind: string; source_name: string; source_url: string; license: string;
  is_demo: boolean; retrieved_at: string; norm_date: string | null; origin_url: string; attribution: string;
}
export interface ChunkRow {
  source_id: string; article: string; heading: string | null; content: string; norm_date: string | null;
  origin_url: string; attribution: string; content_hash: string; embedding: string | null;
}

/** Almacén inyectable (Supabase en producción, memoria en tests). */
export interface LawStore {
  upsertSource(row: SourceRow): Promise<string>;
  listChunks(sourceId: string): Promise<ExistingChunk[]>;
  /** Upsert por (source_id, article). */
  upsertChunks(rows: ChunkRow[]): Promise<void>;
  /** Lectura sin escribir (para --dry-run con clave): id de la fuente si existe. */
  findSourceId?(code: string): Promise<string | null>;
}

export interface LawReport {
  code: string;
  title: string;
  status: "ok" | "error" | "sin_articulos";
  loaded: number;
  updated: number;
  unchanged: number;
  skipped: SkippedItem[];
  renamed: string[];
  obsolete: number;
  embedded: number;
  normDate: string | null;
  error?: string;
}
export interface IngestReport {
  generatedAt: string;
  dryRun: boolean;
  embed: boolean;
  embedProvider: string | null;
  laws: LawReport[];
  totals: { loaded: number; updated: number; unchanged: number; skipped: number; errors: number };
  notes: string[];
}

export interface IngestDeps {
  laws: LawConfig[];
  fetchImpl: FetchLike;
  store: LawStore | null; // null: sin clave → solo dry-run
  embedder?: EmbeddingProvider | null;
  options: { dryRun: boolean; embed: boolean; only: string | null };
  retry?: RetryOptions & { timeoutMs?: number };
  now?: () => Date;
  log?: (msg: string) => void;
  batchSize?: number;
}

export async function runIngest(deps: IngestDeps): Promise<IngestReport> {
  const { options } = deps;
  const log = deps.log ?? (() => {});
  const now = deps.now ?? (() => new Date());
  const batchSize = deps.batchSize ?? 50;
  const notes: string[] = [];
  let laws = deps.laws;
  if (options.only) {
    laws = laws.filter((l) => l.code.toUpperCase() === options.only);
    if (!laws.length) notes.push(`--only=${options.only}: ninguna ley con ese código en la configuración.`);
  }
  if (!options.dryRun && !deps.store) throw new Error("BLOQUEADO: requiere SUPABASE_SERVICE_ROLE_KEY (sin ella solo se permite --dry-run)");
  let embedder: EmbeddingProvider | null = null;
  if (options.embed) {
    embedder = deps.embedder ?? null;
    if (!embedder) notes.push("--embed pedido pero no hay proveedor de embeddings configurado (EMBEDDINGS_PROVIDER / VOYAGE_API_KEY): se carga solo texto.");
    else if (options.dryRun) notes.push("--dry-run: no se generan embeddings.");
  }

  const reports: LawReport[] = [];
  for (const law of laws) {
    const rep: LawReport = {
      code: law.code, title: law.title, status: "ok", loaded: 0, updated: 0, unchanged: 0,
      skipped: [], renamed: [], obsolete: 0, embedded: 0, normDate: null,
    };
    try {
      log(`→ ${law.title}`);
      const retry = { ...deps.retry, onRetry: (e: unknown, n: number, ms: number) => log(`  reintento ${n} en ${ms} ms (${e instanceof Error ? e.message : "error"})`) };
      const source = law.norm ? await fetchNormHtml(law.norm, deps.fetchImpl, retry) : await fetchWikitext(law.page, deps.fetchImpl, retry);
      const plan = buildLawPlan(law, source);
      rep.skipped = plan.skipped;
      rep.renamed = plan.renamed;
      rep.normDate = plan.normDate;
      if (!plan.chunks.length) {
        rep.status = "sin_articulos";
        rep.error = "no se detectaron artículos; revisa el título de página en leyes.config.json";
        reports.push(rep);
        continue;
      }

      let sourceId: string | null = null;
      let existing: ExistingChunk[] = [];
      if (!options.dryRun && deps.store) {
        sourceId = await deps.store.upsertSource({
          code: law.code, title: law.title, kind: law.kind ?? "ley", source_name: "Lexivox", source_url: plan.originUrl, license: "GFDL",
          is_demo: false, retrieved_at: now().toISOString(), norm_date: plan.normDate, origin_url: plan.originUrl, attribution: plan.attribution,
        });
        existing = await deps.store.listChunks(sourceId);
      } else if (deps.store?.findSourceId) {
        const id = await deps.store.findSourceId(law.code);
        if (id) existing = await deps.store.listChunks(id);
      }

      const up = planUpserts(plan.chunks, existing);
      rep.unchanged = up.unchanged.length;
      rep.obsolete = up.obsolete.length;
      const todo = [...up.insert, ...up.update];

      if (!options.dryRun && deps.store && sourceId) {
        for (let i = 0; i < todo.length; i += batchSize) {
          const batch = todo.slice(i, i + batchSize);
          let vecs: number[][] | null = null;
          if (embedder) {
            try {
              const e = embedder;
              vecs = await withRetry(() => e.embed(batch.map((c) => `${c.article}. ${c.content}`), "document"), deps.retry);
              if (vecs.length !== batch.length) throw new Error("el proveedor devolvió un número distinto de vectores");
            } catch (e) {
              vecs = null;
              notes.push(`${law.code}: embeddings fallaron en un lote (${e instanceof Error ? e.message : "error"}); se cargó solo texto.`);
            }
          }
          const rows: ChunkRow[] = batch.map((c, j) => ({
            source_id: sourceId, article: c.article, heading: c.heading, content: c.content, norm_date: plan.normDate,
            origin_url: plan.originUrl, attribution: plan.attribution, content_hash: c.content_hash,
            // Si el texto cambió y no hay vector nuevo, se limpia el viejo (estaría desfasado).
            embedding: vecs ? JSON.stringify(vecs[j]) : null,
          }));
          await deps.store.upsertChunks(rows);
          if (vecs) rep.embedded += batch.length;
        }
      }
      // En dry-run se informa lo que SE HARÍA.
      rep.loaded = up.insert.length;
      rep.updated = up.update.length;
      log(`  ${rep.loaded} nuevos, ${rep.updated} actualizados, ${rep.unchanged} sin cambios, ${rep.skipped.length} omitidos`);
    } catch (e) {
      rep.status = "error";
      rep.error = e instanceof Error ? e.message : String(e);
      log(`  ✗ ${law.title}: ${rep.error}`);
    }
    reports.push(rep);
  }

  const sum = (f: (r: LawReport) => number) => reports.reduce((a, r) => a + f(r), 0);
  return {
    generatedAt: now().toISOString(),
    dryRun: options.dryRun,
    embed: options.embed,
    embedProvider: embedder ? `${embedder.id}/${embedder.model}` : null,
    laws: reports,
    totals: {
      loaded: sum((r) => r.loaded), updated: sum((r) => r.updated), unchanged: sum((r) => r.unchanged),
      skipped: sum((r) => r.skipped.length), errors: reports.filter((r) => r.status !== "ok").length,
    },
    notes,
  };
}

export function formatReport(r: IngestReport): string {
  const lines = [`Ingesta de leyes${r.dryRun ? " (DRY-RUN: nada se escribió; las cifras son lo que se haría)" : ""}`];
  for (const l of r.laws) {
    lines.push(
      `  ${l.code.padEnd(6)} ${l.status.padEnd(13)} nuevos ${l.loaded}  actualizados ${l.updated}  sin cambios ${l.unchanged}  omitidos ${l.skipped.length}${l.error ? `  ERROR: ${l.error}` : ""}`
    );
    for (const s of l.skipped.slice(0, 5)) lines.push(`         omitido ${s.article ?? "?"}: ${s.reason}`);
  }
  const t = r.totals;
  lines.push(`Total: nuevos ${t.loaded}, actualizados ${t.updated}, sin cambios ${t.unchanged}, omitidos ${t.skipped}, leyes con problema ${t.errors}`);
  for (const n of r.notes) lines.push(`Nota: ${n}`);
  return lines.join("\n");
}
