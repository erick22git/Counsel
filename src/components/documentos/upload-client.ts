"use client";
import { createClient } from "@/lib/supabase/client";
import { buildStoragePath, validateFile } from "@/lib/documentos/files";

export type UploadResult =
  | { ok: true; path: string; mime: string; size: number; fileName: string }
  | { ok: false; error: string };

/** Valida y sube un archivo a Storage con el cliente del navegador (RLS por despacho). */
export async function uploadToStorage(file: File, firmId: string, caseId: string | null): Promise<UploadResult> {
  const check = validateFile(file);
  if (!check.ok) return check;
  const path = buildStoragePath({ firmId, caseId, uuid: crypto.randomUUID(), fileName: file.name });
  try {
    const { error } = await createClient().storage.from("documents").upload(path, file, { contentType: check.mime, upsert: false });
    if (error) return { ok: false, error: "No pudimos subir el archivo. Revise su conexión e intente de nuevo." };
  } catch {
    return { ok: false, error: "No pudimos subir el archivo. Revise su conexión e intente de nuevo." };
  }
  return { ok: true, path, mime: check.mime, size: file.size, fileName: file.name };
}

/** Borra un archivo recién subido cuando falló el registro (mejor esfuerzo). */
export async function removeFromStorage(path: string) {
  try {
    await createClient().storage.from("documents").remove([path]);
  } catch {
    /* sin acción */
  }
}
