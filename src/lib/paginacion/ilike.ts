import { escapeIlike, ilikePattern } from "@/lib/panel/search";

export { escapeIlike, ilikePattern };

const COLUMN = /^[a-z_][a-z0-9_.]*$/;

/**
 * Filtro para `.or(...)` de PostgREST: `col.ilike."%texto%",otra.ilike."%texto%"`.
 * El valor va entre comillas dobles para que comas y paréntesis del usuario no rompan el filtro,
 * y se escapan % _ \ (literales en ilike) y las comillas.
 */
export function orIlike(columns: readonly string[], q: string): string {
  const pattern = ilikePattern(q).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return columns
    .map((c) => {
      if (!COLUMN.test(c)) throw new Error(`Columna no válida: ${c}`);
      return `${c}.ilike."${pattern}"`;
    })
    .join(",");
}
