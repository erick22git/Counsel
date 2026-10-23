/**
 * Ingesta de leyes desde Lexivox (MediaWiki, texto bajo GFDL con atribución) a law_sources/law_chunks.
 *
 *   npx tsx scripts/ingest-leyes.ts [scripts/leyes.config.json]
 *
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (el esquema bloquea escritura a usuarios).
 * Con VOYAGE_API_KEY también genera embeddings. Revisa los títulos de página en leyes.config.json:
 * deben coincidir con el título exacto en lexivox.org.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { wikitextToPlain, chunkByArticle } from "../src/lib/ai/chunker";

interface LawConfig { code: string; title: string; page: string; kind?: string }

const BASE = "https://www.lexivox.org";

async function fetchWikitext(page: string): Promise<string> {
  const url = `${BASE}/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
  const r = await fetch(url, { headers: { "User-Agent": "CounselLegalIngest/0.1 (contacto: administrador del despacho)" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${page}`);
  const j = (await r.json()) as { parse?: { wikitext?: { "*": string } }; error?: { info: string } };
  if (!j.parse?.wikitext) throw new Error(j.error?.info ?? "sin contenido");
  return j.parse.wikitext["*"];
}

async function embed(texts: string[]): Promise<number[][] | null> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return null;
  const r = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ input: texts, model: "voyage-3", input_type: "document" }),
  });
  if (!r.ok) throw new Error(`Voyage ${r.status}`);
  return ((await r.json()) as { data: { embedding: number[] }[] }).data.map((d) => d.embedding);
}

async function main() {
  const cfgPath = process.argv[2] ?? "scripts/leyes.config.json";
  const laws: LawConfig[] = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  for (const law of laws) {
    try {
      console.log(`→ ${law.title}`);
      const chunks = chunkByArticle(wikitextToPlain(await fetchWikitext(law.page)));
      if (!chunks.length) {
        console.warn("  sin artículos detectados; revisa el título de página");
        continue;
      }
      const { data: src, error } = await sb
        .from("law_sources")
        .upsert(
          { code: law.code, title: law.title, kind: law.kind ?? "ley", source_name: "Lexivox", source_url: `${BASE}/wiki/${encodeURIComponent(law.page)}`, license: "GFDL", is_demo: false, retrieved_at: new Date().toISOString() },
          { onConflict: "code" }
        )
        .select("id")
        .single();
      if (error) throw error;
      await sb.from("law_chunks").delete().eq("source_id", src.id);
      for (let i = 0; i < chunks.length; i += 50) {
        const batch = chunks.slice(i, i + 50);
        const vecs = await embed(batch.map((c) => `${c.article}. ${c.content}`));
        const rows = batch.map((c, j) => ({ source_id: src.id, article: c.article, heading: c.heading, content: c.content, ...(vecs ? { embedding: JSON.stringify(vecs[j]) } : {}) }));
        const { error: e2 } = await sb.from("law_chunks").insert(rows);
        if (e2) throw e2;
      }
      console.log(`  ${chunks.length} fragmentos cargados`);
    } catch (e) {
      console.error(`  ✗ ${law.title}:`, e instanceof Error ? e.message : e);
    }
  }
}

main();
