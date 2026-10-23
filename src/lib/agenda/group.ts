import { dayKey, diffDays, endOfWeek, todayKey } from "./dates";

export type AgendaBucket = "hoy" | "manana" | "semana" | "despues" | "pasadas";

export interface DayGroup<T> {
  key: string; // día YYYY-MM-DD
  items: T[];
}
export interface AgendaGroups<T> {
  hoy: DayGroup<T>[];
  manana: DayGroup<T>[];
  semana: DayGroup<T>[];
  despues: DayGroup<T>[];
  /** Más recientes primero. */
  pasadas: DayGroup<T>[];
}

/** Dónde cae un día respecto a hoy. "Esta semana" = pasado mañana hasta el domingo. */
export function bucketOfDay(key: string, now: Date = new Date()): AgendaBucket {
  const today = todayKey(now);
  const diff = diffDays(today, key);
  if (diff < 0) return "pasadas";
  if (diff === 0) return "hoy";
  if (diff === 1) return "manana";
  if (diff <= diffDays(today, endOfWeek(today))) return "semana";
  return "despues";
}

/** Agrupa citas por día y por bloque (Hoy, Mañana, Esta semana, Más adelante, Pasadas). */
export function groupAppointments<T extends { starts_at: string }>(items: T[], now: Date = new Date()): AgendaGroups<T> {
  const byDay = new Map<string, T[]>();
  for (const it of items) {
    const k = dayKey(it.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), it]);
  }
  const out: AgendaGroups<T> = { hoy: [], manana: [], semana: [], despues: [], pasadas: [] };
  const keys = [...byDay.keys()].sort();
  for (const k of keys) {
    const list = [...byDay.get(k)!].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    out[bucketOfDay(k, now)].push({ key: k, items: list });
  }
  out.pasadas.reverse();
  return out;
}

/** Plazo próximo: de hoy a 3 días (hora de La Paz), aún programado. */
export function isDeadlineSoon(
  a: { kind: string; starts_at: string; status: string },
  now: Date = new Date()
): boolean {
  if (a.kind !== "plazo" || a.status !== "programada") return false;
  const diff = diffDays(todayKey(now), dayKey(a.starts_at));
  return diff >= 0 && diff <= 3;
}

/** Citas indexadas por día, para la vista Mes. */
export function indexByDay<T extends { starts_at: string }>(items: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = dayKey(it.starts_at);
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  for (const list of m.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return m;
}

// ───────── Tareas ─────────

export type TaskBucket = "vencidas" | "hoy" | "semana" | "mas_tarde" | "sin_fecha" | "hechas";

export function classifyTask(
  t: { due_at: string | null; done_at: string | null },
  now: Date = new Date()
): TaskBucket {
  if (t.done_at) return "hechas";
  if (!t.due_at) return "sin_fecha";
  const today = todayKey(now);
  const diff = diffDays(today, t.due_at.slice(0, 10));
  if (diff < 0) return "vencidas";
  if (diff === 0) return "hoy";
  if (diff <= diffDays(today, endOfWeek(today))) return "semana";
  return "mas_tarde";
}

export function groupTasks<T extends { due_at: string | null; done_at: string | null; created_at: string }>(
  tasks: T[],
  now: Date = new Date()
): Record<TaskBucket, T[]> {
  const out: Record<TaskBucket, T[]> = { vencidas: [], hoy: [], semana: [], mas_tarde: [], sin_fecha: [], hechas: [] };
  for (const t of tasks) out[classifyTask(t, now)].push(t);
  const byDue = (a: T, b: T) => (a.due_at ?? "").localeCompare(b.due_at ?? "") || a.created_at.localeCompare(b.created_at);
  for (const k of ["vencidas", "hoy", "semana", "mas_tarde"] as const) out[k].sort(byDue);
  out.sin_fecha.sort((a, b) => b.created_at.localeCompare(a.created_at));
  out.hechas.sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  return out;
}
