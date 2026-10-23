/** Dinero en centavos enteros: evita errores de punto flotante (0.1 + 0.2). */

/** Convierte un monto decimal (p. ej. 12.345) a centavos enteros, redondeando a la mitad hacia arriba. */
export function toCents(amount: number | string | null | undefined): number {
  const n = typeof amount === "string" ? Number(amount.replace(",", ".")) : Number(amount ?? 0);
  if (!Number.isFinite(n)) return 0;
  // Pequeño épsilon relativo para que 1.005 -> 1.01 (como espera una persona).
  const sign = n < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(n) * 100 * (1 + Number.EPSILON * 4));
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Redondea a 2 decimales sin errores de punto flotante. */
export function round2(amount: number | string | null | undefined): number {
  return fromCents(toCents(amount));
}

/** Total de una línea en centavos: cantidad (hasta 2 decimales) × precio unitario. */
export function lineCents(quantity: number | string, unitPrice: number | string): number {
  const qtyHundredths = Math.round(Number(quantity) * 100);
  const priceCents = toCents(unitPrice);
  if (!Number.isFinite(qtyHundredths)) return 0;
  const raw = qtyHundredths * priceCents; // en centésimas de centavo
  const sign = raw < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(raw) + 50) / 100);
}

export interface LineLike {
  quantity: number | string;
  unit_price: number | string;
}

export function itemsTotalCents(items: LineLike[]): number {
  return items.reduce((s, i) => s + lineCents(i.quantity, i.unit_price), 0);
}

export function itemsTotal(items: LineLike[]): number {
  return fromCents(itemsTotalCents(items));
}

export function paymentsTotalCents(payments: { amount: number | string }[]): number {
  return payments.reduce((s, p) => s + toCents(p.amount), 0);
}

/** Saldo pendiente (nunca negativo) en centavos. */
export function balanceCents(items: LineLike[], payments: { amount: number | string }[]): number {
  return Math.max(0, itemsTotalCents(items) - paymentsTotalCents(payments));
}

export function balance(items: LineLike[], payments: { amount: number | string }[]): number {
  return fromCents(balanceCents(items, payments));
}

/** Formatea un número de cobro correlativo: 1 -> "F-0001". */
export function formatInvoiceNumber(n: number, prefix = "F"): string {
  return `${prefix}-${String(Math.max(0, Math.floor(n))).padStart(4, "0")}`;
}

/** Calcula el siguiente número a partir de los existentes. Ignora números con otro formato. */
export function nextInvoiceNumber(existing: (string | null | undefined)[], prefix = "F"): string {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const n of existing) {
    const m = n ? re.exec(n.trim()) : null;
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return formatInvoiceNumber(max + 1, prefix);
}
