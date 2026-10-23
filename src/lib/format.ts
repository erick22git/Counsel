import { format, formatDistanceToNowStrict, isToday, isTomorrow, isPast } from "date-fns";
import { es } from "date-fns/locale";

export const TZ = "America/La_Paz";

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: es });
}

export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy, HH:mm", { locale: es });
}

export function fmtTime(d: string | Date) {
  return format(new Date(d), "HH:mm", { locale: es });
}

/** "Hoy", "Mañana", "Vence en 3 días", "Vencido hace 2 días" */
export function fmtDue(d: string | Date | null | undefined) {
  if (!d) return "Sin fecha";
  const date = new Date(d);
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  if (isPast(date)) return `Vencido hace ${formatDistanceToNowStrict(date, { locale: es })}`;
  return `En ${formatDistanceToNowStrict(date, { locale: es })}`;
}

export function fmtMoney(n: number | string | null | undefined, currency: "BOB" | "USD" = "BOB") {
  const v = Number(n ?? 0);
  const num = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  return currency === "USD" ? `$us ${num}` : `Bs ${num}`;
}

export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m ? `${m} min` : ""}`.trim() : `${m} min`;
}

export const MATTERS: Record<string, string> = {
  civil: "Civil",
  penal: "Penal",
  familia: "Familia",
  laboral: "Laboral",
  comercial: "Comercial",
  administrativo: "Administrativo",
  constitucional: "Constitucional",
  otro: "Otro",
};

export const STAGES: { id: string; label: string; hint: string }[] = [
  { id: "nuevo", label: "Nuevo", hint: "Recién abierto" },
  { id: "en_tramite", label: "En trámite", hint: "Avanzando en el juzgado" },
  { id: "audiencia", label: "Audiencia", hint: "Con audiencia pendiente" },
  { id: "resolucion", label: "Resolución", hint: "Esperando o recibiendo fallo" },
  { id: "cerrado", label: "Cerrado", hint: "Terminado" },
];
