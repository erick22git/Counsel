"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { VIEWABLE_ENTITIES } from "./format";

const schema = z.object({ entity: z.enum(VIEWABLE_ENTITIES), id: z.string().uuid() });

/** Registra "quién vio" una ficha. Usa la sesión del usuario: RLS garantiza que solo registra lo que puede ver. */
export async function logView(entity: string, id: string): Promise<{ ok: boolean }> {
  const p = schema.safeParse({ entity, id });
  if (!p.success) return { ok: false };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };

  // La etiqueta se lee con RLS: si no puede verlo, no se registra.
  const col = p.data.entity === "clients" ? "full_name" : "title";
  const { data: row } = await supabase.from(p.data.entity).select(`id,${col}`).eq("id", p.data.id).maybeSingle();
  if (!row) return { ok: false };
  const label = String((row as unknown as Record<string, unknown>)[col] ?? "").slice(0, 200);

  const { data: me } = await supabase.from("profiles").select("full_name,role,active").eq("id", auth.user.id).maybeSingle();
  if (!me || me.role === "client" || !me.active) return { ok: false };

  const { error } = await supabase.from("audit_log").insert({
    user_id: auth.user.id,
    action: "view",
    entity: p.data.entity,
    entity_id: p.data.id,
    summary: label,
    meta: { actor: me.full_name },
  });
  return { ok: !error };
}
