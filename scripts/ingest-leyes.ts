/**
 * Ingesta de leyes desde Lexivox (MediaWiki, texto bajo GFDL con atribución) a law_sources/law_chunks.
 *
 *   npm run ingest:leyes -- [--dry-run] [--only=CC] [--embed] [ruta/config.json]
 *
 * - Idempotente: upsert por (source_id, article) y salta lo que no cambió (content_hash).
 * - Reintentable: backoff exponencial + timeout; si una ley falla sigue con la siguiente.
 * - --dry-run: descarga y parte, no escribe en la BD. Funciona sin claves.
 * - --embed: genera embeddings solo si hay proveedor (EMBEDDINGS_PROVIDER / VOYAGE_API_KEY).
 * Variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (nunca se imprimen).
 * Escribe evals/ingest-report.json. Requiere la migración 0007.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getEmbedder } from "../src/lib/ai/providers/embeddings";
import { formatReport, parseArgs, runIngest, type FetchLike, type LawConfig, type LawStore } from "./ingest-core";

function supabaseStore(url: string, key: string): LawStore {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  return {
    async upsertSource(row) {
      const { data, error } = await sb.from("law_sources").upsert(row, { onConflict: "code" }).select("id").single();
      if (error) throw new Error(`law_sources: ${error.message}`);
      return data.id as string;
    },
    async findSourceId(code) {
      const { data } = await sb.from("law_sources").select("id").eq("code", code).maybeSingle();
      return (data?.id as string) ?? null;
    },
    async listChunks(sourceId) {
      const out: { article: string | null; content_hash: string | null }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from("law_chunks").select("article, content_hash").eq("source_id", sourceId).range(from, from + 999);
        if (error) throw new Error(`law_chunks: ${error.message}`);
        out.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return out;
    },
    async upsertChunks(rows) {
      const { error } = await sb.from("law_chunks").upsert(rows, { onConflict: "source_id,article" });
      if (error) throw new Error(`law_chunks: ${error.message}`);
    },
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log("Uso: npm run ingest:leyes -- [--dry-run] [--only=CODIGO] [--embed] [config.json]");
    return;
  }
  const laws: LawConfig[] = JSON.parse(fs.readFileSync(opts.configPath, "utf8"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key && !opts.dryRun) {
    console.error("BLOQUEADO: requiere SUPABASE_SERVICE_ROLE_KEY (sin ella solo se permite --dry-run).");
    process.exitCode = 1;
    return;
  }
  if (!opts.dryRun && !url) {
    console.error("BLOQUEADO: requiere NEXT_PUBLIC_SUPABASE_URL.");
    process.exitCode = 1;
    return;
  }
  const store = url && key ? supabaseStore(url, key) : null;
  const embedder = opts.embed ? getEmbedder() : null;

  const report = await runIngest({
    laws,
    fetchImpl: fetch as unknown as FetchLike,
    store,
    embedder,
    options: opts,
    log: (m) => console.log(m),
  });
  fs.mkdirSync("evals", { recursive: true });
  fs.writeFileSync(path.join("evals", "ingest-report.json"), JSON.stringify(report, null, 2));
  console.log("\n" + formatReport(report));
  console.log("Reporte: evals/ingest-report.json");
  if (report.totals.errors) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
