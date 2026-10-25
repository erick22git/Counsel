import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { audit, guard } from "@/lib/ai/stream";
import { ProviderConfigError } from "@/lib/ai/providers";
import { POLISH_SYSTEM } from "@/lib/ai/prompts";

export const maxDuration = 60;

const body = z.object({ text: z.string().trim().min(5, "No hay texto para corregir").max(12000) });

/** Dictado → redacción corregida. No agrega hechos; devuelve texto para que el abogado acepte o descarte. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const g = await guard(supabase);
  if ("error" in g) return g.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    const text = await g.provider.complete({ system: POLISH_SYSTEM, messages: [{ role: "user", content: parsed.data.text }], maxTokens: 6000, effort: "low" });
    await audit(supabase, g.provider, "redaccion", "El texto que dictaste (solo ese texto).", parsed.data.text.length);
    return Response.json({ text: text.trim(), sent: "Solo el texto que dictaste." });
  } catch (e) {
    console.error("[ia/redactar]", e instanceof Error ? e.message : e);
    return Response.json({ error: e instanceof ProviderConfigError ? e.message : "No pude corregir el texto. Intenta de nuevo." }, { status: 502 });
  }
}
