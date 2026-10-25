import { z } from "zod";

/** Tamaño de página común a todas las listas largas. */
export const PAGE_SIZE = 25;
/** Largo máximo del texto de búsqueda (lo demás se recorta). */
export const MAX_Q = 80;
/** Tope de número de página aceptado (evita OFFSET absurdos). */
export const MAX_PAGE = 100_000;

export type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGE).catch(1);

/** Página pedida: cualquier valor raro (NaN, 0, negativo, decimal, texto) cae en 1. */
export function parsePage(v: string | string[] | undefined): number {
  const s = first(v);
  if (s === undefined || s.trim() === "") return 1;
  return pageSchema.parse(s.trim());
}

/** Texto de búsqueda limpio: sin caracteres de control, espacios colapsados, máximo MAX_Q. */
export function parseQuery(v: string | string[] | undefined): string {
  const s = first(v);
  if (typeof s !== "string") return "";
  return s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_Q).trim();
}

export const uuidParam = z.string().uuid();
export const enumParam = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

export interface ListParams {
  page: number;
  q: string;
  orden: string;
  filters: Record<string, string>;
}

export interface ParseOptions {
  /** Nombre del parámetro de página (por defecto "pagina"). */
  pageParam?: string;
  /** Nombre del parámetro de búsqueda (por defecto "q"). */
  qParam?: string;
  /** Valores válidos de `orden`; el primero es el predeterminado. */
  ordenes?: readonly string[];
  /** Filtros permitidos: nombre → esquema zod. Un valor inválido queda en "". */
  filters?: Record<string, z.ZodType<string>>;
}

/** Lee `searchParams` de Next y devuelve valores validados y seguros. */
export function parseListParams(sp: RawParams, opts: ParseOptions = {}): ListParams {
  const ordenes = opts.ordenes ?? [];
  const o = first(sp.orden);
  const orden = o && ordenes.includes(o) ? o : (ordenes[0] ?? "");
  const filters: Record<string, string> = {};
  for (const [name, schema] of Object.entries(opts.filters ?? {})) {
    const raw = first(sp[name]);
    const r = raw === undefined ? null : schema.safeParse(raw.trim());
    filters[name] = r && r.success ? r.data : "";
  }
  return { page: parsePage(sp[opts.pageParam ?? "pagina"]), q: parseQuery(sp[opts.qParam ?? "q"]), orden, filters };
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Calcula página (ajustada a 1..totalPages) y total de páginas. */
export function pageMeta(total: number, page: number, pageSize: number = PAGE_SIZE): PageMeta {
  const t = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const size = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(t / size));
  const p = Number.isFinite(page) ? Math.min(Math.max(1, Math.floor(page)), totalPages) : 1;
  return { page: p, pageSize: size, total: t, totalPages };
}

/** Rango inclusivo para `supabase.range(from, to)`. */
export function pageRange(page: number, pageSize: number = PAGE_SIZE): { from: number; to: number } {
  const p = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const from = (p - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/** Pagina un arreglo ya en memoria (solo para conjuntos acotados). */
export function paginateArray<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): { rows: T[]; meta: PageMeta } {
  const meta = pageMeta(items.length, page, pageSize);
  const { from } = pageRange(meta.page, pageSize);
  return { rows: items.slice(from, from + pageSize), meta };
}

interface PageResult<T> {
  data: T[] | null;
  count: number | null;
  error?: unknown;
}

/**
 * Ejecuta una consulta paginada. `run(from, to)` debe usar `.range(from, to)` y `count: "exact"`.
 * Si la página pedida queda fuera de rango, vuelve a consultar la última página existente.
 */
export async function fetchPage<T>(
  run: (from: number, to: number) => PromiseLike<PageResult<T>>,
  page: number,
  pageSize: number = PAGE_SIZE
): Promise<{ rows: T[]; meta: PageMeta }> {
  const { from, to } = pageRange(page, pageSize);
  const res = await run(from, to);
  const rows = res.data ?? [];
  if (!res.error && (rows.length > 0 || page <= 1)) {
    const total = res.count ?? from + rows.length;
    return { rows, meta: pageMeta(total, page, pageSize) };
  }
  // Fuera de rango (o error de rango): se averigua el total desde la primera página.
  const probe = await run(0, pageSize - 1);
  const meta = pageMeta(probe.count ?? (probe.data ?? []).length, page, pageSize);
  if (meta.page === 1) return { rows: probe.data ?? [], meta };
  const r = pageRange(meta.page, pageSize);
  const last = await run(r.from, r.to);
  return { rows: last.data ?? [], meta };
}

/** Lee todas las filas de una consulta acotada, en trozos (PostgREST limita cada respuesta). */
export async function fetchAllRows<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  chunk = 1000,
  maxChunks = 20
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < maxChunks; i++) {
    const { data } = await run(i * chunk, i * chunk + chunk - 1);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < chunk) break;
  }
  return out;
}

/** Arma una URL conservando parámetros; los vacíos se omiten. La página 1 no se escribe. */
export function buildHref(
  basePath: string,
  params: Record<string, string | undefined | null>,
  page: number,
  pageParam = "pagina"
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k === pageParam || v === undefined || v === null || v === "") continue;
    usp.set(k, v);
  }
  if (page > 1) usp.set(pageParam, String(page));
  const qs = usp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
