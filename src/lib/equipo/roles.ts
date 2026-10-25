/** Roles del personal del despacho y sus textos en español simple. Sin dependencias de servidor. */
export type StaffRole = "owner" | "lawyer" | "assistant";

export const MAX_TEAM_MEMBERS = 10;

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Titular",
  lawyer: "Abogado",
  assistant: "Asistente",
};

export const ROLE_HINTS: Record<StaffRole, string> = {
  owner: "Administra todo: equipo, cobros y auditoría.",
  lawyer: "Trabaja casos, documentos y cobros. No administra el equipo.",
  assistant: "Clientes, casos, agenda, tareas y documentos. Sin cobros.",
};

export const ASSIGNABLE_ROLES: StaffRole[] = ["lawyer", "assistant", "owner"];

export function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? "Cliente del portal";
}

export function roleTone(role: string): "accent" | "ok" | "neutral" {
  if (role === "owner") return "accent";
  if (role === "lawyer") return "ok";
  return "neutral";
}
