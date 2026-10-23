"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { isValidStoragePath, validateFile, MAX_FILE_BYTES } from "@/lib/documentos/files";
import type { Doc, DocVersion } from "@/lib/db/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const BUCKET = "documents";
const uuid = z.string().uuid();
const optUuid = z.string().uuid().nullable().optional();

const fileMeta = {
  path: z.string().min(10).max(400),
  mime: z.string().min(3).max(120),
  size: z.number().int().positive().max(MAX_FILE_BYTES, "El archivo supera el máximo de 25 MB."),
  fileName: z.string().min(1).max(300),
};

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Datos no válidos.";
}

function done() {
  revalidatePath("/documentos");
}

/** Crea el registro `documents` (kind='archivo') + versión 1 después de subir el archivo a Storage. */
export async function createDocument(input: {
  path: string; mime: string; size: number; fileName: string; title: string; caseId?: string | null;
}): Promise<Result<{ id: string }>> {
  const p = z.object({ ...fileMeta, title: z.string().trim().min(1, "Escriba un título.").max(200), caseId: optUuid }).safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const d = p.data;
  const { supabase, profile } = await requireStaff();
  const check = validateFile({ name: d.fileName, size: d.size });
  if (!check.ok) return check;
  if (!isValidStoragePath(d.path, profile.firm_id, d.caseId ?? null)) return { ok: false, error: "La ruta del archivo no es válida." };

  let clientId: string | null = null;
  if (d.caseId) {
    const { data: c } = await supabase.from("cases").select("client_id").eq("id", d.caseId).maybeSingle();
    if (!c) return { ok: false, error: "No encontramos ese caso." };
    clientId = (c as { client_id: string }).client_id;
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      title: d.title, kind: "archivo", case_id: d.caseId ?? null, client_id: clientId, storage_path: d.path,
      mime: d.mime, size_bytes: d.size, current_version: 1, created_by: profile.id,
    })
    .select("id")
    .single();
  if (error || !doc) return { ok: false, error: "No pudimos guardar el documento. Intente de nuevo." };

  const { error: vErr } = await supabase
    .from("document_versions")
    .insert({ document_id: doc.id, version: 1, storage_path: d.path, note: null, created_by: profile.id });
  if (vErr) {
    await supabase.from("documents").delete().eq("id", doc.id);
    return { ok: false, error: "No pudimos guardar la versión del documento. Intente de nuevo." };
  }

  if (d.caseId) {
    await supabase.from("case_events").insert({
      case_id: d.caseId, kind: "documento", title: `Documento subido: ${d.title}`, body: null,
      visible_to_client: false, created_by: profile.id,
    });
    revalidatePath(`/casos/${d.caseId}`);
  }
  done();
  return { ok: true, id: doc.id };
}

async function loadDoc(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], id: string) {
  const { data } = await supabase.from("documents").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  return (data as Doc | null) ?? null;
}

/** Sube una versión nueva (el archivo ya está en Storage). */
export async function addVersion(input: {
  documentId: string; path: string; mime: string; size: number; fileName: string; note?: string;
}): Promise<Result<{ version: number }>> {
  const p = z.object({ documentId: uuid, ...fileMeta, note: z.string().trim().max(1000).optional() }).safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const d = p.data;
  const { supabase, profile } = await requireStaff();
  const doc = await loadDoc(supabase, d.documentId);
  if (!doc || doc.kind !== "archivo") return { ok: false, error: "No encontramos el documento." };
  const check = validateFile({ name: d.fileName, size: d.size });
  if (!check.ok) return check;
  if (!isValidStoragePath(d.path, profile.firm_id, doc.case_id)) return { ok: false, error: "La ruta del archivo no es válida." };

  const version = doc.current_version + 1;
  const { error: vErr } = await supabase
    .from("document_versions")
    .insert({ document_id: doc.id, version, storage_path: d.path, note: d.note || null, created_by: profile.id });
  if (vErr) return { ok: false, error: "No pudimos guardar la nueva versión. Intente de nuevo." };
  const { error } = await supabase
    .from("documents")
    .update({ current_version: version, storage_path: d.path, mime: d.mime, size_bytes: d.size, updated_at: new Date().toISOString() })
    .eq("id", doc.id);
  if (error) {
    await supabase.from("document_versions").delete().eq("document_id", doc.id).eq("version", version);
    return { ok: false, error: "No pudimos actualizar el documento. Intente de nuevo." };
  }
  if (doc.case_id) {
    await supabase.from("case_events").insert({
      case_id: doc.case_id, kind: "documento", title: `Nueva versión (v${version}): ${doc.title}`, body: d.note || null,
      visible_to_client: false, created_by: profile.id,
    });
  }
  done();
  return { ok: true, version };
}

/** Restaurar = crear una versión nueva que apunta al mismo archivo; el historial no se borra. */
export async function restoreVersion(input: { documentId: string; version: number }): Promise<Result<{ version: number }>> {
  const p = z.object({ documentId: uuid, version: z.number().int().positive() }).safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { supabase, profile } = await requireStaff();
  const doc = await loadDoc(supabase, p.data.documentId);
  if (!doc || doc.kind !== "archivo") return { ok: false, error: "No encontramos el documento." };
  const { data: old } = await supabase
    .from("document_versions").select("*").eq("document_id", doc.id).eq("version", p.data.version).maybeSingle();
  const src = old as DocVersion | null;
  if (!src?.storage_path) return { ok: false, error: "No encontramos esa versión." };

  // Tamaño y tipo del archivo de esa versión (mejor esfuerzo).
  let size: number | null = doc.size_bytes;
  let mime: string | null = doc.mime;
  const slash = src.storage_path.lastIndexOf("/");
  const { data: listed } = await supabase.storage
    .from(BUCKET)
    .list(src.storage_path.slice(0, slash), { search: src.storage_path.slice(slash + 1), limit: 5 });
  const meta = listed?.find((o) => o.name === src.storage_path!.slice(slash + 1))?.metadata as { size?: number; mimetype?: string } | undefined;
  if (meta?.size) size = meta.size;
  if (meta?.mimetype) mime = meta.mimetype;

  const version = doc.current_version + 1;
  const { error: vErr } = await supabase.from("document_versions").insert({
    document_id: doc.id, version, storage_path: src.storage_path, note: `Restaurada desde la versión ${src.version}`, created_by: profile.id,
  });
  if (vErr) return { ok: false, error: "No pudimos restaurar la versión. Intente de nuevo." };
  const { error } = await supabase
    .from("documents")
    .update({ current_version: version, storage_path: src.storage_path, mime, size_bytes: size, updated_at: new Date().toISOString() })
    .eq("id", doc.id);
  if (error) {
    await supabase.from("document_versions").delete().eq("document_id", doc.id).eq("version", version);
    return { ok: false, error: "No pudimos restaurar la versión. Intente de nuevo." };
  }
  if (doc.case_id) {
    await supabase.from("case_events").insert({
      case_id: doc.case_id, kind: "documento", title: `Versión ${src.version} restaurada como v${version}: ${doc.title}`,
      body: null, visible_to_client: false, created_by: profile.id,
    });
  }
  done();
  return { ok: true, version };
}

export interface VersionRow {
  version: number; note: string | null; created_at: string; author: string | null; storage_path: string | null;
}

/** Lista de versiones con nombre del autor. */
export async function listVersions(documentId: string): Promise<Result<{ versions: VersionRow[] }>> {
  if (!uuid.safeParse(documentId).success) return { ok: false, error: "Documento no válido." };
  const { supabase } = await requireStaff();
  const { data, error } = await supabase
    .from("document_versions")
    .select("version, note, created_at, storage_path, author:profiles(full_name)")
    .eq("document_id", documentId)
    .order("version", { ascending: false });
  if (error) return { ok: false, error: "No pudimos cargar las versiones." };
  const versions = (data ?? []).map((r) => {
    const row = r as unknown as { version: number; note: string | null; created_at: string; storage_path: string | null; author: { full_name: string } | { full_name: string }[] | null };
    const a = Array.isArray(row.author) ? row.author[0] : row.author;
    return { version: row.version, note: row.note, created_at: row.created_at, storage_path: row.storage_path, author: a?.full_name ?? null };
  });
  return { ok: true, versions };
}

/** URL firmada de 60 s, generada con el cliente del usuario (RLS de Storage aplica). */
export async function getSignedUrl(input: { documentId: string; version?: number; download?: boolean }): Promise<Result<{ url: string }>> {
  const p = z.object({ documentId: uuid, version: z.number().int().positive().optional(), download: z.boolean().optional() }).safeParse(input);
  if (!p.success) return { ok: false, error: "Documento no válido." };
  const { supabase } = await requireStaff();
  const doc = await loadDoc(supabase, p.data.documentId);
  if (!doc) return { ok: false, error: "No encontramos el documento." };
  let path = doc.storage_path;
  if (p.data.version) {
    const { data } = await supabase
      .from("document_versions").select("storage_path").eq("document_id", doc.id).eq("version", p.data.version).maybeSingle();
    path = (data as { storage_path: string | null } | null)?.storage_path ?? null;
  }
  if (!path) return { ok: false, error: "Este documento no tiene archivo." };
  const fileName = path.slice(path.lastIndexOf("/") + 1).replace(/^[0-9a-f-]{36}-/, "");
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, p.data.download ? { download: fileName } : undefined);
  if (error || !data) return { ok: false, error: "No pudimos preparar la descarga. Intente de nuevo." };
  return { ok: true, url: data.signedUrl };
}

export async function renameDocument(input: { id: string; title: string }): Promise<Result> {
  const p = z.object({ id: uuid, title: z.string().trim().min(1, "Escriba un título.").max(200) }).safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("documents").update({ title: p.data.title, updated_at: new Date().toISOString() }).eq("id", p.data.id);
  if (error) return { ok: false, error: "No pudimos cambiar el nombre." };
  done();
  return { ok: true };
}

/** Asocia o cambia el caso. El archivo conserva su ruta en Storage. */
export async function setDocumentCase(input: { id: string; caseId: string | null }): Promise<Result> {
  const p = z.object({ id: uuid, caseId: z.string().uuid().nullable() }).safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  const { supabase } = await requireStaff();
  let clientId: string | null = null;
  if (p.data.caseId) {
    const { data: c } = await supabase.from("cases").select("client_id").eq("id", p.data.caseId).maybeSingle();
    if (!c) return { ok: false, error: "No encontramos ese caso." };
    clientId = (c as { client_id: string }).client_id;
  }
  const { error } = await supabase
    .from("documents").update({ case_id: p.data.caseId, client_id: clientId, updated_at: new Date().toISOString() }).eq("id", p.data.id);
  if (error) return { ok: false, error: "No pudimos cambiar el caso." };
  done();
  return { ok: true };
}

export async function setShared(input: { id: string; shared: boolean }): Promise<Result> {
  const p = z.object({ id: uuid, shared: z.boolean() }).safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("documents").update({ shared_with_client: p.data.shared }).eq("id", p.data.id);
  if (error) return { ok: false, error: "No pudimos cambiar el permiso." };
  done();
  return { ok: true };
}

/** Soft delete / deshacer. */
export async function setDeleted(input: { id: string; deleted: boolean }): Promise<Result> {
  const p = z.object({ id: uuid, deleted: z.boolean() }).safeParse(input);
  if (!p.success) return { ok: false, error: "Datos no válidos." };
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: p.data.deleted ? new Date().toISOString() : null })
    .eq("id", p.data.id);
  if (error) return { ok: false, error: "No pudimos completar la acción." };
  done();
  return { ok: true };
}
