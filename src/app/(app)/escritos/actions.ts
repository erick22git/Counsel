"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { extractVariables } from "@/lib/editor/template";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const uuid = z.string().uuid();
const html = z.string().max(2_000_000);
const GENERIC = "No se pudo completar. Intenta de nuevo.";

/** Crea un escrito (documents kind='escrito') y su versión 1. */
async function insertEscrito(input: { title: string; html: string; caseId?: string | null; clientId?: string | null }): Promise<Result<{ id: string }>> {
  const { supabase, user } = await requireStaff();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      kind: "escrito",
      title: input.title,
      content_html: input.html,
      case_id: input.caseId || null,
      client_id: input.clientId || null,
      current_version: 1,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: GENERIC };
  const v = await supabase
    .from("document_versions")
    .insert({ document_id: data.id, version: 1, content_html: input.html, note: "Versión inicial", created_by: user.id });
  if (v.error) return { ok: false, error: GENERIC };
  revalidatePath("/escritos");
  return { ok: true, id: data.id };
}

export async function createBlankEscrito(): Promise<Result<{ id: string }>> {
  return insertEscrito({ title: "Escrito sin título", html: "<p></p>" });
}

const fromTemplateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  html,
  caseId: uuid.nullish(),
  clientId: uuid.nullish(),
});

/** Para el diálogo "Completar datos" (y para el módulo de IA): el HTML ya viene renderizado con renderTemplate. */
export async function createEscritoFromTemplate(input: unknown): Promise<Result<{ id: string }>> {
  const p = fromTemplateSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa los datos e intenta de nuevo." };
  return insertEscrito(p.data);
}

const saveSchema = z.object({
  id: uuid,
  html,
  title: z.string().trim().min(1).max(200).optional(),
  caseId: uuid.nullish(),
  setCase: z.boolean().optional(),
});

/** Autoguardado: actualiza el contenido actual (sin crear versión). */
export async function saveEscrito(input: unknown): Promise<Result> {
  const p = saveSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  const { supabase } = await requireStaff();
  const patch: Record<string, unknown> = { content_html: p.data.html };
  if (p.data.title) patch.title = p.data.title;
  if (p.data.setCase) patch.case_id = p.data.caseId || null;
  const { error } = await supabase.from("documents").update(patch).eq("id", p.data.id).eq("kind", "escrito");
  if (error) return { ok: false, error: "No se pudo guardar. Se reintentará." };
  return { ok: true };
}

const versionSchema = z.object({ id: uuid, html, note: z.string().trim().max(500).optional() });

export async function saveVersion(input: unknown): Promise<Result<{ version: number }>> {
  const p = versionSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  const { supabase, user } = await requireStaff();
  const { data: doc } = await supabase.from("documents").select("current_version").eq("id", p.data.id).eq("kind", "escrito").maybeSingle();
  if (!doc) return { ok: false, error: "No se encontró el escrito." };
  const next = doc.current_version + 1;
  const ins = await supabase
    .from("document_versions")
    .insert({ document_id: p.data.id, version: next, content_html: p.data.html, note: p.data.note || null, created_by: user.id });
  if (ins.error) return { ok: false, error: GENERIC };
  const upd = await supabase.from("documents").update({ content_html: p.data.html, current_version: next }).eq("id", p.data.id);
  if (upd.error) return { ok: false, error: GENERIC };
  revalidatePath(`/escritos/${p.data.id}`);
  return { ok: true, version: next };
}

const restoreSchema = z.object({ id: uuid, version: z.number().int().positive() });

/** Restaurar = crear una versión nueva con el contenido de la antigua (no se pierde nada). */
export async function restoreVersion(input: unknown): Promise<Result<{ version: number; html: string }>> {
  const p = restoreSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  const { supabase, user } = await requireStaff();
  const [{ data: old }, { data: doc }] = await Promise.all([
    supabase.from("document_versions").select("content_html").eq("document_id", p.data.id).eq("version", p.data.version).maybeSingle(),
    supabase.from("documents").select("current_version").eq("id", p.data.id).eq("kind", "escrito").maybeSingle(),
  ]);
  if (!old || !doc) return { ok: false, error: "No se encontró esa versión." };
  const next = doc.current_version + 1;
  const content = old.content_html ?? "";
  const ins = await supabase
    .from("document_versions")
    .insert({ document_id: p.data.id, version: next, content_html: content, note: `Restaurada desde la versión ${p.data.version}`, created_by: user.id });
  if (ins.error) return { ok: false, error: GENERIC };
  const upd = await supabase.from("documents").update({ content_html: content, current_version: next }).eq("id", p.data.id);
  if (upd.error) return { ok: false, error: GENERIC };
  revalidatePath(`/escritos/${p.data.id}`);
  return { ok: true, version: next, html: content };
}

const tplSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).optional(),
  html,
});

/** "Guardar este escrito como plantilla" del despacho. Las partes que quedaron como {{clave}} pasan a ser variables. */
export async function saveAsTemplate(input: unknown): Promise<Result> {
  const p = tplSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Escribe un nombre para la plantilla." };
  const { supabase } = await requireStaff();
  const variables = extractVariables(p.data.html).map((key) => ({ key, label: key.replace(/_/g, " "), type: "texto" as const }));
  const { error } = await supabase.from("templates").insert({
    title: p.data.title,
    category: p.data.category,
    description: p.data.description || null,
    body_html: p.data.html,
    variables,
  });
  if (error) return { ok: false, error: GENERIC };
  revalidatePath("/plantillas");
  return { ok: true };
}

/** Soft delete del escrito (se puede deshacer). */
export async function archiveEscrito(input: unknown): Promise<Result> {
  const p = z.object({ id: uuid, undo: z.boolean().optional() }).safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("documents").update({ deleted_at: p.data.undo ? null : new Date().toISOString() }).eq("id", p.data.id).eq("kind", "escrito");
  if (error) return { ok: false, error: GENERIC };
  revalidatePath("/escritos");
  return { ok: true };
}
