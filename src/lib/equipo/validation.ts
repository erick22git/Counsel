import { z } from "zod";
import { MAX_TEAM_MEMBERS, type StaffRole } from "./roles";

/** Nunca se acepta 'client': el portal tiene su propio flujo de invitación. */
export const inviteSchema = z.object({
  full_name: z.string().trim().min(2, "Escribe el nombre completo").max(120, "El nombre es muy largo"),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido").max(200, "El correo es muy largo"),
  role: z.enum(["owner", "lawyer", "assistant"], { message: "Elige un rol" }),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "lawyer", "assistant"], { message: "Elige un rol" }),
});

export const memberIdSchema = z.string().uuid();

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Valida una invitación contra el estado actual del equipo (puro, sin base de datos). */
export function validateInvite(
  raw: unknown,
  ctx: { activeMembers: number; existingEmails: string[] }
): Result<{ data: InviteInput }> {
  const p = inviteSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Datos no válidos" };
  if (ctx.activeMembers >= MAX_TEAM_MEMBERS) {
    return { ok: false, error: `Tu despacho ya tiene ${MAX_TEAM_MEMBERS} miembros. Quita a alguien para invitar a otra persona.` };
  }
  if (ctx.existingEmails.map((e) => e.toLowerCase()).includes(p.data.email)) {
    return { ok: false, error: "Ese correo ya tiene una cuenta." };
  }
  return { ok: true, data: p.data };
}

export interface MemberLite {
  id: string;
  role: StaffRole;
  active: boolean;
}

/** Regla del último titular: no se puede bajar de rol ni quitar al único titular activo. */
export function checkRoleChange(members: MemberLite[], userId: string, newRole: StaffRole): Result {
  const target = members.find((m) => m.id === userId);
  if (!target) return { ok: false, error: "No encontré a esa persona." };
  const otherOwners = members.filter((m) => m.role === "owner" && m.active && m.id !== userId).length;
  if (target.role === "owner" && newRole !== "owner" && otherOwners === 0) {
    return { ok: false, error: "No puedes cambiar el rol del último titular." };
  }
  return { ok: true };
}

export function checkRemove(members: MemberLite[], userId: string, actorId: string): Result {
  const target = members.find((m) => m.id === userId);
  if (!target) return { ok: false, error: "No encontré a esa persona." };
  if (userId === actorId) return { ok: false, error: "No puedes quitarte a ti mismo." };
  const otherOwners = members.filter((m) => m.role === "owner" && m.active && m.id !== userId).length;
  if (target.role === "owner" && otherOwners === 0) return { ok: false, error: "No puedes quitar al último titular." };
  return { ok: true };
}

/** Traduce errores de las funciones SQL (mensajes ya en español) a texto seguro para mostrar. */
export function friendlyDbError(message: string | undefined): string {
  const known = [
    "último titular",
    "10 miembros",
    "Solo el titular",
    "No puedes quitarte",
    "No encontré a esa persona",
    "Rol no permitido",
    "cliente del portal",
  ];
  if (message && known.some((k) => message.includes(k))) return message;
  return "No se pudo completar. Intenta de nuevo.";
}
