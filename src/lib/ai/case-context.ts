import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fmtDateTime, fmtDate } from "@/lib/format";
import { redactPII } from "./text";

export interface CaseContext {
  text: string;
  /** Lista legible de lo que se enviará a la IA (se muestra al usuario). */
  disclosure: { label: string; count: number }[];
  chars: number;
  title: string;
}

/** Arma el bloque CASO que se envía al LLM. Con hidePII=true oculta nombre/CI/contacto del cliente. */
export async function buildCaseContext(supabase: SupabaseClient, caseId: string, hidePII: boolean): Promise<CaseContext | null> {
  const { data: c } = await supabase.from("cases").select("*").eq("id", caseId).is("deleted_at", null).maybeSingle();
  if (!c) return null;
  const [client, events, appts, tasks, docs] = await Promise.all([
    supabase.from("clients").select("full_name, ci_nit, email, phone, address").eq("id", c.client_id).maybeSingle(),
    supabase.from("case_events").select("kind,title,body,happened_at").eq("case_id", caseId).order("happened_at", { ascending: false }).limit(40),
    supabase.from("appointments").select("kind,title,location,starts_at,status").eq("case_id", caseId).order("starts_at", { ascending: false }).limit(15),
    supabase.from("tasks").select("title,due_at,done_at").eq("case_id", caseId).limit(25),
    supabase.from("documents").select("title,kind").eq("case_id", caseId).is("deleted_at", null).limit(30),
  ]);

  const cl = client.data;
  const lines: string[] = [
    `CASO: ${c.title}`,
    `Materia: ${c.matter} · Etapa: ${c.stage} · Expediente: ${c.case_number ?? "s/n"} · Juzgado: ${c.court ?? "s/d"} · Parte contraria: ${c.opponent ?? "s/d"}`,
    `Abierto: ${fmtDate(c.opened_at)}`,
    c.description ? `Descripción: ${c.description}` : "",
    !hidePII && cl ? `Cliente: ${cl.full_name} (CI/NIT ${cl.ci_nit ?? "s/d"})` : "Cliente: [CLIENTE]",
    "",
    "LÍNEA DE TIEMPO (más reciente primero):",
    ...(events.data ?? []).map((e) => `- ${fmtDateTime(e.happened_at)} [${e.kind}] ${e.title}${e.body ? `: ${e.body}` : ""}`),
    "",
    "CITAS Y AUDIENCIAS:",
    ...(appts.data ?? []).map((a) => `- ${fmtDateTime(a.starts_at)} ${a.kind} (${a.status}) ${a.title}${a.location ? ` en ${a.location}` : ""}`),
    "",
    "TAREAS:",
    ...(tasks.data ?? []).map((t) => `- [${t.done_at ? "x" : " "}] ${t.title}${t.due_at ? ` (vence ${fmtDate(t.due_at)})` : ""}`),
    "",
    "DOCUMENTOS (solo títulos):",
    ...(docs.data ?? []).map((d) => `- ${d.title} (${d.kind})`),
  ].filter((l) => l !== undefined);

  let text = lines.join("\n");
  if (hidePII) text = redactPII(text, { names: [cl?.full_name ?? ""], ids: [cl?.ci_nit, cl?.phone, cl?.email] });

  return {
    text,
    chars: text.length,
    title: c.title,
    disclosure: [
      { label: hidePII ? "Datos del caso (sin datos personales del cliente)" : "Datos del caso y del cliente", count: 1 },
      { label: "Notas y eventos de la línea de tiempo", count: events.data?.length ?? 0 },
      { label: "Citas y audiencias", count: appts.data?.length ?? 0 },
      { label: "Tareas", count: tasks.data?.length ?? 0 },
      { label: "Títulos de documentos (no su contenido)", count: docs.data?.length ?? 0 },
    ],
  };
}
