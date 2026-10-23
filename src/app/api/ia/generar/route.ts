import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { audit, completeClaude, guard } from "@/lib/ai/stream";
import { EXTRACT_SYSTEM } from "@/lib/ai/prompts";
import type { Template } from "@/lib/db/types";

export const maxDuration = 60;

const body = z.object({ templateId: z.string().uuid(), description: z.string().trim().min(10, "Cuéntame un poco más del caso").max(6000) });

/** Generador desde plantilla: extrae los valores de las variables a partir de un relato (dictado o escrito). El abogado revisa antes de crear el escrito. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const g = await guard(supabase);
  if (g.error) return g.error;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { data: tpl } = await supabase.from("templates").select("id,title,variables").eq("id", parsed.data.templateId).maybeSingle<Pick<Template, "id" | "title" | "variables">>();
  if (!tpl) return Response.json({ error: "No encontré la plantilla" }, { status: 404 });

  const vars = tpl.variables.map((v) => `- ${v.key} (${v.label}, ${v.type ?? "texto"})`).join("\n");
  const prompt = `PLANTILLA: ${tpl.title}\nVARIABLES:\n${vars}\n\nRELATO:\n${parsed.data.description}\n\nResponde solo el JSON.`;
  try {
    const raw = await completeClaude(EXTRACT_SYSTEM, prompt, 3000);
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { values?: Record<string, string>; missing?: string[] };
    const allowed = new Set(tpl.variables.map((v) => v.key));
    const values = Object.fromEntries(Object.entries(json.values ?? {}).filter(([k, v]) => allowed.has(k) && typeof v === "string" && v.trim()));
    const missing = tpl.variables.map((v) => v.key).filter((k) => !(k in values));
    await audit(supabase, "generar", `Tu relato y los nombres de las variables de la plantilla «${tpl.title}».`, prompt.length);
    return Response.json({ values, missing, sent: "Tu relato y la lista de campos de la plantilla." });
  } catch (e) {
    console.error("[ia/generar]", e instanceof Error ? e.message : e);
    return Response.json({ error: "No pude leer el relato. Intenta con más detalle." }, { status: 502 });
  }
}
