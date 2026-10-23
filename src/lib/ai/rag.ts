import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toSearchQuery, type SourceForPrompt } from "./text";

export type LawHit = SourceForPrompt & { id: string; rank: number };

async function embedQuery(q: string): Promise<number[] | null> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: [q], model: "voyage-3", input_type: "query" }),
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: { embedding: number[] }[] };
    return j.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

type Row = {
  id: string; code: string; law_title: string; article: string | null; heading: string | null; content: string;
  source_name: string; source_url: string | null; license: string; is_demo: boolean; rank: number;
};

/** Búsqueda híbrida: texto completo (siempre) + vectores (si hay VOYAGE_API_KEY), fusionados por RRF. Respeta RLS (cliente del usuario). */
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
