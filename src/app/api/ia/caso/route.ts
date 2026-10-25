import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { audit, guard, ndjson, streamLLM } from "@/lib/ai/stream";
import { retrieveLaws } from "@/lib/ai/rag";
import { buildCaseContext } from "@/lib/ai/case-context";
import { CASE_SYSTEM } from "@/lib/ai/prompts";
import { sourcesBlock, usedCitations, invalidCitationMarkers } from "@/lib/ai/text";

export const maxDuration = 120;

const body = z.object({
  caseId: z.string().uuid(),
  question: z.string().trim().min(3).max(2000),
  hidePII: z.boolean().default(true),
  preview: z.boolean().default(false), // solo mostrar qué se enviaría
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(10).default([]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const { caseId, question, hidePII, preview, history } = parsed.data;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const ctx = await buildCaseContext(supabase, caseId, hidePII);
  if (!ctx) return Response.json({ error: "No encontré ese caso" }, { status: 404 });
  if (preview) return Response.json({ title: ctx.title, disclosure: ctx.disclosure, chars: ctx.chars, hidePII });

  const g = await guard(supabase);
  if ("error" in g) return g.error;

  return ndjson(async (send) => {
    const sources = await retrieveLaws(supabase, question, 5);
    const sent = `${ctx.disclosure.map((d) => `${d.count} ${d.label.toLowerCase()}`).join(", ")}${sources.length ? `, y ${sources.length} fragmentos de leyes` : ""}.`;
    send({ type: "meta", sent, hasSources: sources.length > 0 });
    const userMsg = `${ctx.text}\n\nFUENTES:\n${sources.length ? sourcesBlock(sources) : "(ninguna encontrada en la base para esta pregunta)"}\n\nPREGUNTA DEL ABOGADO:\n${question}`;
    const text = await streamLLM(g.provider, { system: CASE_SYSTEM, messages: [...history.slice(-6), { role: "user", content: userMsg }] }, send);
    const cites = usedCitations(text, sources).map(({ n, source }) => ({
      n, code: source.code, law_title: source.law_title, article: source.article, source_name: source.source_name,
      source_url: source.source_url, license: source.license, is_demo: source.is_demo,
    }));
    send({ type: "done", citations: cites, invalid: invalidCitationMarkers(text, sources.length) });
    await audit(supabase, g.provider, "caso", sent, userMsg.length + CASE_SYSTEM.length);
  });
}
