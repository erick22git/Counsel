import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { audit, guard, ndjson } from "@/lib/ai/stream";
import { retrieveLaws } from "@/lib/ai/rag";
import { answerLegalQuestion } from "@/lib/ai/legal-answer";

export const maxDuration = 120;

const body = z.object({
  question: z.string().trim().min(5, "Escribe una pregunta más completa").max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(6000) })).max(10).default([]),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const g = await guard(supabase);
  if ("error" in g) return g.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { question, history } = parsed.data;

  return ndjson(async (send) => {
    const r = await answerLegalQuestion({
      question, history, provider: g.provider,
      retrieve: (q) => retrieveLaws(supabase, q),
      onMeta: (sent) => send({ type: "meta", sent, citations: [] }),
      onText: (delta) => send({ type: "text", delta }),
    });
    if (r.noSource) {
      send({ type: "done", noSource: true });
      return;
    }
    send({ type: "done", citations: r.citations, invalid: r.invalid });
    await audit(supabase, g.provider, "legal", r.sent, r.charsSent);
  });
}
