import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmbedder, embedderMatchesDb } from "./providers";
import { toSearchQuery, type SourceForPrompt } from "./text";

export type LawHit = SourceForPrompt & { id: string; rank: number };

async function embedQuery(q: string): Promise<number[] | null> {
  try {
    const e = getEmbedder();
    // Si la dimensión del modelo no coincide con la columna vector(N), no se usan vectores (solo texto completo).
    if (!e || !embedderMatchesDb(e)) return null;
    return (await e.embed([q], "query"))[0] ?? null;
  } catch {
    return null;
  }
}

type Row = {
  id: string; code: string; law_title: string; article: string | null; heading: string | null; content: string;
  source_name: string; source_url: string | null; license: string; is_demo: boolean; rank: number;
};

/** Búsqueda híbrida: texto completo (siempre) + vectores (si hay embeddings compatibles), fusionados por RRF. Respeta RLS. */
export async function retrieveLaws(supabase: SupabaseClient, question: string, limit = 6): Promise<LawHit[]> {
  const ftsQuery = toSearchQuery(question);
  const [fts, emb] = await Promise.all([
    ftsQuery ? supabase.rpc("search_laws", { p_query: ftsQuery, p_limit: limit * 2 }) : Promise.resolve({ data: [] as Row[] }),
    embedQuery(question),
  ]);
  const lists: Row[][] = [(fts.data as Row[]) ?? []];
  if (emb) {
    const v = await supabase.rpc("match_laws", { p_embedding: JSON.stringify(emb), p_limit: limit * 2 });
    lists.push((v.data as Row[]) ?? []);
  }
  const score = new Map<string, { row: Row; s: number }>();
  for (const list of lists) {
    list.forEach((row, i) => {
      const cur = score.get(row.id) ?? { row, s: 0 };
      cur.s += 1 / (60 + i);
      score.set(row.id, cur);
    });
  }
  return [...score.values()]
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ row }) => row);
}
