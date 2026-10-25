"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByKey } from "@/lib/security/rate-limit";

/** Descarga para el cliente: RLS (tabla y Storage) solo permite documentos compartidos de sus casos. */
export async function portalSignedUrl(id: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const docId = z.string().uuid().parse(id);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Vuelve a iniciar sesión." };
  const lim = await rateLimitByKey("portal-descarga", auth.user.id, 30, 10 * 60_000); // 30 descargas / 10 min por usuario
  if (!lim.ok) return { ok: false, error: lim.message };
  const { data: d } = await supabase.from("documents").select("storage_path,kind").eq("id", docId).maybeSingle();
  if (!d?.storage_path) return { ok: false, error: "Este documento no se puede descargar." };
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 60);
  if (error || !data) return { ok: false, error: "No se pudo preparar la descarga." };
  return { ok: true, url: data.signedUrl };
}
