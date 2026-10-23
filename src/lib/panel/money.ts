export type Currency = "BOB" | "USD";

export const toCents = (n: number | string | null | undefined) => Math.round(Number(n ?? 0) * 100);

/** Saldo en centavos: total de ítems menos pagos (nunca negativo). */
export function balanceCents(
  items: { quantity: number | string; unit_price: number | string }[],
  payments: { amount: number | string }[]
): number {
  const total = items.reduce((s, i) => s + Math.round(Number(i.quantity) * toCents(i.unit_price)), 0);
  const paid = payments.reduce((s, p) => s + toCents(p.amount), 0);
  return Math.max(0, total - paid);
}

export type CurrencyTotals = Record<Currency, number>;
export const emptyTotals = (): CurrencyTotals => ({ BOB: 0, USD: 0 });

/** Por cobrar: facturas enviadas (las vencidas siguen "enviada"; se deducen por due_date). */
export function receivableByCurrency(
  invoices: {
    status: string;
    currency: Currency;
    invoice_items?: { quantity: number | string; unit_price: number | string }[] | null;
    payments?: { amount: number | string }[] | null;
  }[]
): CurrencyTotals {
  const t = emptyTotals();
  for (const inv of invoices) {
    if (inv.status !== "enviada") continue;
    t[inv.currency] += balanceCents(inv.invoice_items ?? [], inv.payments ?? []);
  }
  return t;
}

export function collectedByCurrency(
  payments: { amount: number | string; invoices?: { currency: Currency } | { currency: Currency }[] | null }[]
): CurrencyTotals {
  const t = emptyTotals();
  for (const p of payments) {
    const inv = Array.isArray(p.invoices) ? p.invoices[0] : p.invoices;
    t[inv?.currency ?? "BOB"] += toCents(p.amount);
  }
  return t;
}
