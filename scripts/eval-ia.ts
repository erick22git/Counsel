/**
 * Evaluación de la IA legal.
 *
 *   npm run eval:ia -- [--provider=mock|env] [--retrieval=fixture|db] [--questions=ruta.json]
 *
 * Modo por defecto (mock + fixture): corre SIN claves ni base de datos, con texto ficticio, para validar el arnés y la CI.
 * --retrieval=db usa search_laws/match_laws con SUPABASE_SERVICE_ROLE_KEY (BLOQUEADO si falta).
 * --provider=env usa AI_PROVIDER del entorno (BLOQUEADO si falta la clave de ese proveedor).
 * Salida: tabla en consola + evals/resultados.json.
 */
import fs from "node:fs";
import path from "node:path";
import { answerLegalQuestion, type LawHitLike } from "../src/lib/ai/legal-answer";
import { getLLM, mockProvider, providerBlocker } from "../src/lib/ai/providers";
import { getEmbedder } from "../src/lib/ai/providers/embeddings";
import { toSearchQuery } from "../src/lib/ai/text";
import type { LLMProvider } from "../src/lib/ai/providers/types";
import { fixtureRetriever, formatTable, runEval, UNOFFICIAL_BANNER, type FixtureChunk, type Question } from "../evals/harness";

function arg(name: string): string | undefined {
  return process.argv.slice(2).find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}
const readJson = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));

async function dbRetriever(): Promise<(q: string) => Promise<LawHitLike[]>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("BLOQUEADO: requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para --retrieval=db");
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const embedder = getEmbedder();
  type Row = LawHitLike;
  return async (question) => {
    const fts = toSearchQuery(question);
    const lists: Row[][] = [];
    if (fts) lists.push(((await sb.rpc("search_laws", { p_query: fts, p_limit: 12 })).data as Row[]) ?? []);
    if (embedder) {
      try {
        const [v] = await embedder.embed([question], "query");
        lists.push(((await sb.rpc("match_laws", { p_embedding: JSON.stringify(v), p_limit: 12 })).data as Row[]) ?? []);
      } catch {
        /* sin vectores: solo texto completo */
      }
    }
    const score = new Map<string, { row: Row; s: number }>();
    for (const list of lists) list.forEach((row, i) => {
      const cur = score.get(row.id) ?? { row, s: 0 };
      cur.s += 1 / (60 + i);
      score.set(row.id, cur);
    });
    return [...score.values()].sort((a, b) => b.s - a.s).slice(0, 6).map((x) => x.row);
  };
}

async function main() {
  const providerArg = arg("provider") ?? "mock";
  const retrievalArg = arg("retrieval") ?? "fixture";
  const notes: string[] = [];

  let provider: LLMProvider;
  if (providerArg === "mock") provider = mockProvider();
  else {
    const blocker = providerBlocker();
    if (blocker) {
      console.error(blocker);
      process.exitCode = 1;
      return;
    }
    provider = getLLM();
  }

  let retrieve: (q: string) => Promise<LawHitLike[]>;
  let questionsPath = arg("questions");
  if (retrievalArg === "db") {
    try {
      retrieve = await dbRetriever();
    } catch (e) {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
      return;
    }
    questionsPath ??= "evals/preguntas.json";
  } else {
    const corpus = readJson("evals/corpus-fixture.json") as { chunks: FixtureChunk[] };
    retrieve = fixtureRetriever(corpus.chunks);
    questionsPath ??= "evals/preguntas-fixture.json";
    notes.push("Corpus ficticio (evals/corpus-fixture.json): valida el arnés, no la calidad legal real.");
  }

  const file = readJson(questionsPath) as { preguntas: Question[]; controles?: Question[] };
  const questions = [...file.preguntas, ...(file.controles ?? [])];
  const { results, metrics, unverified, official } = await runEval(questions, { answer: answerLegalQuestion, retrieve, provider });

  console.log(`Proveedor: ${provider.label} (${provider.model})  Recuperación: ${retrievalArg}  Preguntas: ${questionsPath}\n`);
  console.log(formatTable(results, metrics, { official, unverified }));
  for (const n of notes) console.log(`Nota: ${n}`);

  const out = {
    generatedAt: new Date().toISOString(),
    provider: { id: provider.id, model: provider.model },
    retrieval: retrievalArg,
    questionsFile: questionsPath,
    official,
    aviso: official ? null : UNOFFICIAL_BANNER,
    unverified,
    metrics,
    notes,
    results,
  };
  fs.mkdirSync("evals", { recursive: true });
  fs.writeFileSync(path.join("evals", "resultados.json"), JSON.stringify(out, null, 2));
  console.log("\nResultados: evals/resultados.json");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
