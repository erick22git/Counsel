// Filtro por tipo de documento hecho en el servidor. Equivale a `docTipo()` de @/lib/documentos/files.
import type { DocTipo } from "@/lib/documentos/files";

export type TipoSpec =
  | { kind: "escrito" }
  | { kind: "archivo"; anyLike?: string[]; noneLike?: string[] };

export const TIPO_SPEC: Record<DocTipo, TipoSpec> = {
  escrito: { kind: "escrito" },
  pdf: { kind: "archivo", anyLike: ["application/pdf"] },
  word: { kind: "archivo", anyLike: ["%word%"] },
  excel: { kind: "archivo", anyLike: ["%excel%", "%spreadsheet%"] },
  imagen: { kind: "archivo", anyLike: ["image/%"] },
  otro: { kind: "archivo", noneLike: ["application/pdf", "%word%", "%excel%", "%spreadsheet%", "image/%"] },
};

interface Filterable {
  eq: (c: string, v: string) => unknown;
  or: (f: string) => unknown;
  ilike: (c: string, p: string) => unknown;
}

/** Aplica el filtro de tipo a una consulta de supabase-js sobre `documents`. */
export function applyDocTipo<Q extends Filterable>(query: Q, tipo: DocTipo | ""): Q {
  if (!tipo) return query;
  const spec = TIPO_SPEC[tipo];
  let q = query.eq("kind", spec.kind) as Q;
  if (spec.kind === "archivo") {
    if (spec.anyLike?.length === 1) q = q.ilike("mime", spec.anyLike[0]) as Q;
    else if (spec.anyLike) q = q.or(spec.anyLike.map((p) => `mime.ilike.${p}`).join(",")) as Q;
    if (spec.noneLike) q = q.or(`mime.is.null,and(${spec.noneLike.map((p) => `mime.not.ilike.${p}`).join(",")})`) as Q;
  }
  return q;
}

/** Misma condición en SQL (para pruebas con PGlite). */
export function docTipoSql(tipo: DocTipo): string {
  const spec = TIPO_SPEC[tipo];
  const parts = [`kind = '${spec.kind}'`];
  if (spec.kind === "archivo") {
    if (spec.anyLike) parts.push(`(${spec.anyLike.map((p) => `mime ilike '${p}'`).join(" or ")})`);
    if (spec.noneLike) parts.push(`(mime is null or (${spec.noneLike.map((p) => `mime not ilike '${p}'`).join(" and ")}))`);
  }
  return parts.join(" and ");
}
