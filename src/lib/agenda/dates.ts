/**
 * Utilidades puras de fechas para Agenda y Tareas.
 * Zona horaria: America/La_Paz = UTC-4 fijo, sin horario de verano.
 * Una "clave de día" es un texto "YYYY-MM-DD" en hora de La Paz.
 */
export const LA_PAZ_OFFSET_MIN = -240;
const OFFSET_MS = LA_PAZ_OFFSET_MIN * 60_000;
const DAY_MS = 86_400_000;

export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** Cabecera de la cuadrícula del mes (empieza en lunes). */
export const WEEKDAYS_SHORT = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Desplaza el instante para leer con getUTC* la hora de La Paz. */
function shifted(d: Date | string) {
  return new Date(new Date(d).getTime() + OFFSET_MS);
}

/** Día (hora de La Paz) de un instante. */
export function dayKey(d: Date | string): string {
  const s = shifted(d);
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`;
}

/** Hora "HH:mm" (La Paz) de un instante. */
export function timeKey(d: Date | string): string {
  const s = shifted(d);
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
}

export function todayKey(now: Date = new Date()): string {
  return dayKey(now);
}

export function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

function keyToUtcMs(key: string) {
  const { y, m, d } = parseKey(key);
  return Date.UTC(y, m - 1, d);
}

function utcMsToKey(ms: number) {
  const x = new Date(ms);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

export function addDays(key: string, n: number): string {
  return utcMsToKey(keyToUtcMs(key) + n * DAY_MS);
}

/** Días entre dos claves (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((keyToUtcMs(b) - keyToUtcMs(a)) / DAY_MS);
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(key: string): number {
  return new Date(keyToUtcMs(key)).getUTCDay();
}

/** Lunes de la semana de `key`. */
export function startOfWeek(key: string): string {
  const wd = weekdayOf(key);
  return addDays(key, -((wd + 6) % 7));
}

/** Domingo de la semana de `key`. */
export function endOfWeek(key: string): string {
  return addDays(startOfWeek(key), 6);
}

/** Convierte fecha "YYYY-MM-DD" y hora "HH:mm" (La Paz) a ISO UTC. */
export function laPazToIso(date: string, time: string): string {
  const { y, m, d } = parseKey(date);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - OFFSET_MS).toISOString();
}

// ───────── Formato ─────────

/** "lunes 5 de mayo" (agrega el año si no es el actual). */
export function fmtDayLong(key: string, now: Date = new Date()): string {
  const { y, m, d } = parseKey(key);
  const base = `${WEEKDAYS[weekdayOf(key)]} ${d} de ${MONTHS[m - 1]}`;
  return y === parseKey(todayKey(now)).y ? base : `${base} de ${y}`;
}

export function fmtMonthTitle(year: number, month: number): string {
  return `${MONTHS[month - 1][0].toUpperCase()}${MONTHS[month - 1].slice(1)} ${year}`;
}

/** "09:00" o "09:00 a 10:30". */
export function fmtTimeRange(startsAt: string, endsAt?: string | null): string {
  const s = timeKey(startsAt);
  if (!endsAt) return s;
  const e = timeKey(endsAt);
  return e === s ? s : `${s} a ${e}`;
}

/** "Hoy", "Mañana", "Ayer" o "lunes 5 de mayo". */
export function fmtDayRelative(key: string, now: Date = new Date()): string {
  const diff = diffDays(todayKey(now), key);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return fmtDayLong(key, now);
}

/** Texto para fechas de tareas: "Vence hoy", "Venció hace 2 días", "Vence mañana". */
export function fmtTaskDue(due: string | null, now: Date = new Date()): string {
  if (!due) return "Sin fecha";
  const diff = diffDays(todayKey(now), due.slice(0, 10));
  if (diff === 0) return "Vence hoy";
  if (diff === 1) return "Vence mañana";
  if (diff === -1) return "Venció ayer";
  if (diff < 0) return `Venció hace ${-diff} días`;
  return `Vence ${fmtDayLong(due.slice(0, 10), now)}`;
}

// ───────── Mes ─────────

export interface MonthCell {
  key: string;
  day: number;
  inMonth: boolean;
}

/** Cuadrícula del mes en semanas completas (lunes a domingo). month: 1-12. */
export function monthGrid(year: number, month: number): MonthCell[][] {
  const first = `${year}-${pad(month)}-01`;
  const nextMonthFirst = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
  const last = addDays(nextMonthFirst, -1);
  let cur = startOfWeek(first);
  const end = endOfWeek(last);
  const weeks: MonthCell[][] = [];
  while (diffDays(cur, end) >= 0) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      const p = parseKey(cur);
      week.push({ key: cur, day: p.d, inMonth: p.m === month && p.y === year });
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
