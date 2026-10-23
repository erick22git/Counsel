"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Invita a un cliente al portal por correo. Solo personal del despacho; usa service-role de forma acotada. */
export async function inviteClientToPortal(clientId: string): Promise<{ ok: boolean; error?: string }> {
  const id = z.string().uuid().parse(clientId);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "No autenticado" };
  const { data: me } = await supabase.from("profiles").select("firm_id,role").eq("id", auth.user.id).single();
  if (!me || me.role === "client") return { ok: false, error: "Sin permiso" };
  // RLS garantiza que solo veo clientes de mi despacho
  const { data: client } = await supabase.from("clients").select("id,full_name,email").eq("id", id).maybeSingle();
  if (!client) return { ok: false, error: "No encontré al cliente" };
  if (!client.email) return { ok: false, error: "El cliente no tiene correo. Agrégalo primero." };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("client_id", id).maybeSingle();
  if (existing) return { ok: false, error: "Este cliente ya tiene acceso al portal." };

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback?siguiente=/portal/clave`;
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(client.email, { redirectTo, data: { full_name: client.full_name } });
  if (error || !invited.user) return { ok: false, error: "No se pudo enviar la invitación. Revisa el correo del cliente." };
  const { error: pe } = await admin.from("profiles").insert({
    id: invited.user.id, firm_id: me.firm_id, full_name: client.full_name, email: client.email, role: "client", client_id: id,
  });
  if (pe) return { ok: false, error: "Se envió la invitación pero no se pudo vincular la cuenta." };
  revalidatePath(`/clientes/${id}`);
  return { ok: true };
}
