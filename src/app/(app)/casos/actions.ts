"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { caseSchema, moveSchema, STAGE_VALUES } from "@/lib/casos/schemas";
import { STAGES } from "@/lib/format";

type Res<T extends object = Record<never, never>> = ({ ok: true } & T) | { ok: false; error: string };

const uuid = z.string().uuid();
const label = (id: string) => STAGES.find((s) => s.id === id)?.label ?? id;

function refresh(id?: string) {
  revalidatePath("/casos");
  if (id) revalidatePath(`/casos/${id}`);
}

export async function createCaseAction(input: unknown): Promise<Res<{ id: string }>> {
  const parsed = caseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const { supabase, profile } = await requireStaff();
  // Va al final de la columna "Nuevo".
  const { data: last } = await supabase
    .from("cases").select("position").eq("stage", "nuevo").is("deleted_at", null)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const position = ((last?.position as number | undefined) ?? 0) + 1000;
  const { data, error } = await supabase
    .from("cases")
    .insert({ ...parsed.data, stage: "nuevo", position, responsible_id: profile.id })
    .select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo crear el caso. Intenta de nuevo." };
  await supabase.from("case_events").insert({
    case_id: data.id, kind: "sistema", title: "Caso creado", created_by: profile.id,
  });
  refresh();
  revalidatePath(`/clientes/${parsed.data.client_id}`);
  return { ok: true, id: data.id as string };
}

/** Mueve un caso de etapa/orden. Si cambia de etapa registra un evento y devuelve su id (para deshacer). */
export async function moveCaseAction(input: unknown): Promise<Res<{ eventId: string | null }>> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Movimiento no válido." };
  const { id, stage, position, fromStage } = parsed.data;
  const { supabase, profile } = await requireStaff();
  const { error } = await supabase.from("cases").update({ stage, position }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo mover el caso." };
  let eventId: string | null = null;
  if (stage !== fromStage) {
    const { data } = await supabase
      .from("case_events")
      .insert({ case_id: id, kind: "etapa", title: `Pasó de ${label(fromStage)} a ${label(stage)}`, created_by: profile.id })
      .select("id").single();
    eventId = (data?.id as string | undefined) ?? null;
  }
  refresh(id);
  return { ok: true, eventId };
}

/** Revierte un movimiento: restaura etapa/posición y borra el evento "Pasó de…" que generó. */
export async function undoMoveAction(input: unknown, eventId: string | null): Promise<Res> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Movimiento no válido." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("cases").update({ stage: parsed.data.stage, position: parsed.data.position }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "No se pudo deshacer." };
  if (eventId && uuid.safeParse(eventId).success) await supabase.from("case_events").delete().eq("id", eventId);
  refresh(parsed.data.id);
  return { ok: true };
}

export async function updateCaseAction(id: string, input: unknown): Promise<Res> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Caso no válido." };
  const parsed = z.object({
    title: z.string().trim().min(2, "Escribe un título.").max(200).optional(),
    description: z.string().trim().max(10000).nullable().optional().transform((v) => (v === undefined ? undefined : v || null)),
    court: z.string().trim().max(200).nullable().optional().transform((v) => (v === undefined ? undefined : v || null)),
    opponent: z.string().trim().max(200).nullable().optional().transform((v) => (v === undefined ? undefined : v || null)),
    case_number: z.string().trim().max(60).nullable().optional().transform((v) => (v === undefined ? undefined : v || null)),
    portal_visible: z.boolean().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("cases").update(patch).eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar." };
  refresh(id);
  return { ok: true };
}

/** Cambio de etapa desde la página de detalle (va al final de la nueva columna). */
export async function changeStageAction(id: string, stage: string): Promise<Res<{ eventId: string | null; prev: { stage: string; position: number } }>> {
  if (!uuid.safeParse(id).success || !(STAGE_VALUES as readonly string[]).includes(stage)) return { ok: false, error: "Etapa no válida." };
  const { supabase } = await requireStaff();
  const { data: cur } = await supabase.from("cases").select("stage, position").eq("id", id).single();
  if (!cur) return { ok: false, error: "No se encontró el caso." };
  if (cur.stage === stage) return { ok: true, eventId: null, prev: { stage: cur.stage, position: cur.position } };
  const { data: last } = await supabase
    .from("cases").select("position").eq("stage", stage).is("deleted_at", null)
    .order("position", { ascending: false }).limit(1).maybeSingle();
  const position = ((last?.position as number | undefined) ?? 0) + 1000;
  const r = await moveCaseAction({ id, stage, position, fromStage: cur.stage });
  if (!r.ok) return r;
  return { ok: true, eventId: r.eventId, prev: { stage: cur.stage, position: cur.position } };
}

export async function archiveCaseAction(id: string): Promise<Res> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Caso no válido." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("cases").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo archivar el caso." };
  refresh(id);
  return { ok: true };
}

export async function restoreCaseAction(id: string): Promise<Res> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Caso no válido." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("cases").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo deshacer." };
  refresh(id);
  return { ok: true };
}

export async function addNoteAction(caseId: string, body: string, visible: boolean): Promise<Res> {
  if (!uuid.safeParse(caseId).success) return { ok: false, error: "Caso no válido." };
  const text = z.string().trim().min(1, "Escribe la nota.").max(10000).safeParse(body);
  if (!text.success) return { ok: false, error: text.error.issues[0]?.message ?? "Escribe la nota." };
  const { supabase, profile } = await requireStaff();
  const { error } = await supabase.from("case_events").insert({
    case_id: caseId, kind: "nota", title: "Nota", body: text.data, visible_to_client: visible === true, created_by: profile.id,
  });
  if (error) return { ok: false, error: "No se pudo guardar la nota." };
  refresh(caseId);
  return { ok: true };
}

export async function setEventVisibilityAction(eventId: string, caseId: string, visible: boolean): Promise<Res> {
  if (!uuid.safeParse(eventId).success) return { ok: false, error: "Evento no válido." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("case_events").update({ visible_to_client: visible === true }).eq("id", eventId);
  if (error) return { ok: false, error: "No se pudo cambiar." };
  refresh(caseId);
  return { ok: true };
}
