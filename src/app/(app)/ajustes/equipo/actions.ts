"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  changeRoleSchema,
  friendlyDbError,
  memberIdSchema,
  validateInvite,
  type Result,
} from "@/lib/equipo/validation";

const PATH = "/ajustes/equipo";

/** Verifica con el cliente del usuario (RLS) que quien llama es titular activo. */
async function requireOwner() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: me } = await supabase.from("profiles").select("id,firm_id,role,active").eq("id", auth.user.id).maybeSingle();
  if (!me || me.role !== "owner" || !me.active) return null;
  return { supabase, me };
}

export async function inviteMember(raw: unknown): Promise<Result> {
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "Solo el titular puede invitar colegas." };
  const { supabase, me } = ctx;

  const { data: staff } = await supabase.from("profiles").select("id,email,role,active").neq("role", "client");
  const activeMembers = (staff ?? []).filter((m) => m.active).length;
  const v = validateInvite(raw, { activeMembers, existingEmails: [] });
  if (!v.ok) return v;
  const input = v.data;

  // Persona de este mismo despacho que fue quitada: se reactiva con el rol elegido (sin correo nuevo).
  const prev = (staff ?? []).find((m) => (m.email ?? "").toLowerCase() === input.email);
  if (prev) {
    if (prev.active) return { ok: false, error: "Esa persona ya está en tu equipo." };
    const r1 = await supabase.rpc("set_member_role", { p_user: prev.id, p_role: input.role });
    if (r1.error) return { ok: false, error: friendlyDbError(r1.error.message) };
    const r2 = await supabase.rpc("set_member_active", { p_user: prev.id, p_active: true });
    if (r2.error) return { ok: false, error: friendlyDbError(r2.error.message) };
    revalidatePath(PATH);
    return { ok: true };
  }

  // BLOQUEADO si falta la clave de servidor: degradamos con un mensaje claro.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ok: false,
      error: "Las invitaciones por correo todavía no están activadas en este sistema. Avisa a quien lo instaló (falta configurar el servidor).",
    };
  }

  const admin = createAdminClient();
  const { data: other } = await admin.from("profiles").select("id").ilike("email", input.email).maybeSingle();
  if (other) return { ok: false, error: "Ese correo ya tiene una cuenta." };

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/auth/callback?siguiente=/panel`;
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: { full_name: input.full_name },
  });
  if (error || !invited.user) {
    return { ok: false, error: "No se pudo enviar la invitación. Revisa el correo o inténtalo más tarde." };
  }
  const { error: pe } = await admin.from("profiles").insert({
    id: invited.user.id,
    firm_id: me.firm_id,
    full_name: input.full_name,
    email: input.email,
    role: input.role,
  });
  if (pe) {
    // No dejamos una cuenta huérfana sin despacho.
    await admin.auth.admin.deleteUser(invited.user.id);
    return { ok: false, error: friendlyDbError(pe.message) };
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function changeMemberRole(userId: string, role: string): Promise<Result> {
  const p = changeRoleSchema.safeParse({ userId, role });
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datos no válidos" };
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "Solo el titular puede cambiar roles." };
  const { error } = await ctx.supabase.rpc("set_member_role", { p_user: p.data.userId, p_role: p.data.role });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath(PATH);
  return { ok: true };
}

async function setActive(userId: string, active: boolean): Promise<Result> {
  const id = memberIdSchema.safeParse(userId);
  if (!id.success) return { ok: false, error: "Datos no válidos" };
  const ctx = await requireOwner();
  if (!ctx) return { ok: false, error: "Solo el titular puede quitar miembros." };
  const { error } = await ctx.supabase.rpc("set_member_active", { p_user: id.data, p_active: active });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath(PATH);
  return { ok: true };
}

/** Quitar = desactivar (reversible con "Deshacer" o desde "Personas quitadas"). */
export async function removeMember(userId: string): Promise<Result> {
  return setActive(userId, false);
}

export async function restoreMember(userId: string): Promise<Result> {
  return setActive(userId, true);
}
