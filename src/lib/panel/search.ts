import { z } from "zod";

/** Escapa % _ y \ para usar el texto como literal dentro de un patrón ilike. */
export function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export const ilikePattern = (q: string) => `%${escapeIlike(q.trim())}%`;

export const searchSchema = z.object({ q: z.string().trim().min(2).max(80) });

export interface SearchHit { id: string; label: string; sub?: string; href: string; group: string }

export const PER_GROUP = 5;

/** Une resultados de varias columnas sin repetir ids y limita a 5. */
export function mergeHits(lists: SearchHit[][], max = PER_GROUP): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const l of lists) {
    for (const h of l) {
      if (!seen.has(h.id) && out.length < max) {
        seen.add(h.id);
        out.push(h);
      }
    }
  }
  return out;
}
