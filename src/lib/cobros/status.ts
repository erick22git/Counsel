export type StoredStatus = "borrador" | "enviada" | "pagada" | "anulada";
export type DisplayStatus = StoredStatus | "vencida";

/** Fecha de hoy (yyyy-mm-dd) según la hora de La Paz (UTC-4, sin horario de verano). */
export function todayLaPaz(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/**
 * Estado que se muestra. 'vencida' no se guarda: es una enviada con saldo pendiente
 * cuya fecha de vencimiento ya pasó (el mismo día del vencimiento aún no está vencida).
 */
export function derivedStatus(
  inv: { status: StoredStatus; due_date: string | null },
  balanceCents: number,
  today: string = todayLaPaz()
): DisplayStatus {
  if (inv.status === "enviada" && balanceCents > 0 && inv.due_date && inv.due_date < today) return "vencida";
  return inv.status;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  pagada: "Pagada",
  anulada: "Anulada",
  vencida: "Vencida",
};

export const STATUS_TONE: Record<DisplayStatus, "neutral" | "accent" | "ok" | "warn" | "danger"> = {
  borrador: "neutral",
  enviada: "accent",
  pagada: "ok",
  anulada: "neutral",
  vencida: "danger",
};

/** Cuenta como "por cobrar": enviadas (vencidas o no). Los borradores y anuladas no. */
export function isReceivable(status: StoredStatus): boolean {
  return status === "enviada";
}

export const PAYMENT_METHODS: { id: string; label: string }[] = [
  { id: "efectivo", label: "Efectivo" },
  { id: "transferencia", label: "Transferencia" },
  { id: "qr", label: "QR" },
  { id: "cheque", label: "Cheque" },
  { id: "otro", label: "Otro" },
];

export function methodLabel(id: string): string {
  return PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;
}
