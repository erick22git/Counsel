import { fromCents, toCents } from "./money";

export interface BillableEntry {
  id: string;
  description: string | null;
  minutes: number;
  rate: number | string;
  worked_on?: string;
}

/** Horas decimales a 2 decimales (90 min -> 1.5, 50 min -> 0.83). */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Monto estimado de una entrada en centavos: minutos × tarifa/hora, redondeado al centavo. */
export function entryAmountCents(minutes: number, hourlyRate: number | string): number {
  const rateCents = toCents(hourlyRate);
  return Math.round((minutes * rateCents) / 60);
}

export function entryAmount(minutes: number, hourlyRate: number | string): number {
  return fromCents(entryAmountCents(minutes, hourlyRate));
}

/** Convierte horas pendientes en ítems de cobro (una línea por entrada, cantidad en horas). */
export function hoursToItems(entries: BillableEntry[]) {
  return entries.map((e) => ({
    description: `${e.description?.trim() || "Horas de trabajo"}${e.worked_on ? ` (${e.worked_on.split("-").reverse().join("/")})` : ""}`,
    quantity: minutesToHours(e.minutes),
    unit_price: Number(e.rate),
    time_entry_id: e.id,
  }));
}

/** "1:05:09" para el cronómetro. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${h}:${p(m)}:${p(sec)}`;
}

/** Minutos a registrar al detener el timer: redondea hacia arriba, mínimo 1. */
export function secondsToMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(Math.max(0, seconds) / 60));
}

export function hoursMinutesToMinutes(hours: number | string, minutes: number | string): number {
  return Math.round(Number(hours || 0) * 60) + Math.round(Number(minutes || 0));
}

export interface TimerState {
  startedAt: number;
  caseId: string;
  description: string;
}

export function parseTimerState(raw: string | null): TimerState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v.startedAt === "number" && Number.isFinite(v.startedAt)) {
      return {
        startedAt: v.startedAt,
        caseId: typeof v.caseId === "string" ? v.caseId : "",
        description: typeof v.description === "string" ? v.description : "",
      };
    }
  } catch {
    /* JSON dañado: se ignora */
  }
  return null;
}

/** Agrupa entradas por día (más reciente primero). */
export function groupByDay<T extends { worked_on: string; minutes: number; billable: boolean; rate: number | string }>(entries: T[]) {
  const map = new Map<string, T[]>();
  for (const e of entries) map.set(e.worked_on, [...(map.get(e.worked_on) ?? []), e]);
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, list]) => ({
      day,
      entries: list,
      minutes: list.reduce((s, e) => s + e.minutes, 0),
      amountCents: list.reduce((s, e) => s + (e.billable ? entryAmountCents(e.minutes, e.rate) : 0), 0),
    }));
}

/** Minutos por caso (null = sin caso). Ordenado de mayor a menor. */
export function minutesByCase<T extends { case_id: string | null; minutes: number }>(entries: T[]) {
  const map = new Map<string | null, number>();
  for (const e of entries) map.set(e.case_id, (map.get(e.case_id) ?? 0) + e.minutes);
  return [...map.entries()].map(([caseId, minutes]) => ({ caseId, minutes })).sort((a, b) => b.minutes - a.minutes);
}
