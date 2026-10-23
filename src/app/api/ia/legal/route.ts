import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { audit, guard, ndjson, streamClaude } from "@/lib/ai/stream";
import { retrieveLaws } from "@/lib/ai/rag";
import { LEGAL_SYSTEM, NO_SOURCE_MESSAGE } from "@/lib/ai/prompts";
import { sourcesBlock, usedCitations, invalidCitationMarkers } from "@/lib/ai/text";

export const maxDuration = 60;

const body = z.object({
  question: z.string().trim().min(5, "Escribe una pregunta más completa").max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(10).default([]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const g = await guard(supabase);
  if (g.error) return g.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { question, history } = parsed.data;

  return ndjson(async (send) => {
    const sources = await retrieveLaws(supabase, question);
    // Garantía anti-invención: sin fuentes no se llama al modelo.
    if (sources.length === 0) {
      send({ type: "meta", citations: [], sent: "Nada: no hubo fuentes, no se consultó a la IA." });
      send({ type: "text", delta: NO_SOURCE_MESSAGE });
      send({ type: "done", noSource: true });
      return;
    }
    const sent = `Tu pregunta y ${sources.length} fragmentos de leyes de la base. No se envían datos de tus casos ni de tus clientes.`;
    send({ type: "meta", sent });
    const userMsg = `FUENTES:\n${sourcesBlock(sources)}\n\nPREGUNTA DEL ABOGADO:\n${question}`;
    const text = await streamClaude({
      system: LEGAL_SYSTEM,
      messages: [...history.slice(-6), { role: "user", content: userMsg }],
      send,
    });
    const cites = usedCitations(text, sources).map(({ n, source }) => ({
      n, code: source.code, law_title: source.law_title, article: source.article, source_name: source.source_name,
      source_url: source.source_url, license: source.license, is_demo: source.is_demo,
    }));
    send({ type: "done", citations: cites, invalid: invalidCitationMarkers(text, sources.length) });
    await audit(supabase, "legal", sent, userMsg.length + LEGAL_SYSTEM.length);
  });
}
