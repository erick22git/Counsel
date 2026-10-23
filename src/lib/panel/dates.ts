// Fechas del panel en America/La_Paz (UTC-4 todo el año, sin horario de verano).
const OFFSET_MS = 4 * 3600_000;
const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" del día calendario en La Paz. */
export function paDay(d: Date | string): string {
  const t = new Date(d).getTime() - OFFSET_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Instante UTC (ISO) en que empieza ese día en La Paz, desplazado `plusDays` días. */
export function dayStartIso(day: string, plusDays = 0): string {
  const base = Date.parse(`${day}T00:00:00.000Z`) + OFFSET_MS + plusDays * DAY_MS;
  return new Date(base).toISOString();
}

/** Primer día del mes (La Paz) como "YYYY-MM-01". */
export function monthStartDay(now: Date): string {
  return `${paDay(now).slice(0, 8)}01`;
}

/** Días calendario entre hoy y la fecha (0 = hoy, 1 = mañana, negativo = pasado). */
export function daysUntil(target: Date | string, now: Date): number {
  const a = Date.parse(`${paDay(target)}T00:00:00.000Z`);
  const b = Date.parse(`${paDay(now)}T00:00:00.000Z`);
  return Math.round((a - b) / DAY_MS);
}

export type DayBucket = "hoy" | "manana";

/** Agrupa por día: hoy, mañana, o null si cae fuera. */
export function bucketOf(startsAt: Date | string, now: Date): DayBucket | null {
  const n = daysUntil(startsAt, now);
  return n === 0 ? "hoy" : n === 1 ? "manana" : null;
}

export function groupTodayTomorrow<T extends { starts_at: string }>(items: T[], now: Date): { hoy: T[]; manana: T[] } {
  const out: { hoy: T[]; manana: T[] } = { hoy: [], manana: [] };
  for (const it of items) {
    const b = bucketOf(it.starts_at, now);
    if (b) out[b].push(it);
  }
  const byTime = (a: T, b: T) => a.starts_at.localeCompare(b.starts_at);
  out.hoy.sort(byTime);
  out.manana.sort(byTime);
  return out;
}

/** Elementos de los próximos `days` días (incluye hoy), ordenados. */
export function upcomingWithin<T extends { starts_at: string }>(items: T[], now: Date, days = 7): T[] {
  return items
    .filter((i) => {
      const n = daysUntil(i.starts_at, now);
      return n >= 0 && n <= days;
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function isUrgent(startsAt: Date | string, now: Date): boolean {
  return daysUntil(startsAt, now) <= 3;
}

export function dueLabel(startsAt: Date | string, now: Date): string {
  const n = daysUntil(startsAt, now);
  if (n === 0) return "Hoy";
  if (n === 1) return "Mañana";
  if (n < 0) return `Vencido hace ${-n} ${n === -1 ? "día" : "días"}`;
  return `En ${n} días`;
}

/** Tareas: separa vencidas (antes de hoy) y de hoy; ignora hechas, sin fecha y futuras. */
export function splitTasks<T extends { due_at: string | null; done_at: string | null }>(tasks: T[], now: Date) {
  const overdue: T[] = [];
  const today: T[] = [];
  for (const t of tasks) {
    if (t.done_at || !t.due_at) continue;
    const n = daysUntil(t.due_at, now);
    if (n < 0) overdue.push(t);
    else if (n === 0) today.push(t);
  }
  const byDue = (a: T, b: T) => (a.due_at ?? "").localeCompare(b.due_at ?? "");
  return { overdue: overdue.sort(byDue), today: today.sort(byDue) };
}

export function greeting(now: Date): string {
  const h = Number(new Date(now.getTime() - OFFSET_MS).toISOString().slice(11, 13));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/** "14:30" en hora de La Paz, sin depender de la zona del servidor. */
export function timeLaPaz(d: Date | string): string {
  return new Intl.DateTimeFormat("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/La_Paz" }).format(new Date(d));
}

/** "jueves, 23 de octubre" en La Paz. */
export function longDateLaPaz(d: Date): string {
  return new Intl.DateTimeFormat("es-BO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/La_Paz" }).format(d);
}

/** "vie 30 oct" */
export function shortDateLaPaz(d: Date | string): string {
  return new Intl.DateTimeFormat("es-BO", { weekday: "short", day: "numeric", month: "short", timeZone: "America/La_Paz" }).format(new Date(d)).replace(/\./g, "");
}
