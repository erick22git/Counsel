import { balanceCents, itemsTotalCents, paymentsTotalCents, type LineLike } from "./money";
import { derivedStatus, todayLaPaz, type DisplayStatus, type StoredStatus } from "./status";

export type Currency = "BOB" | "USD";

export interface InvoiceRow {
  id: string;
  number: string;
  status: StoredStatus;
  currency: Currency;
  issue_date: string;
  due_date: string | null;
  client_id: string;
  case_id: string | null;
  client_name: string;
  case_title: string | null;
  items: LineLike[];
  payments: { amount: number | string; paid_on: string }[];
}

export interface InvoiceView extends InvoiceRow {
  total_cents: number;
  balance_cents: number;
  display: DisplayStatus;
}

export function toView(row: InvoiceRow, today: string = todayLaPaz()): InvoiceView {
  const bal = row.status === "anulada" ? 0 : balanceCents(row.items, row.payments);
  return {
    ...row,
    total_cents: itemsTotalCents(row.items),
    balance_cents: bal,
    display: derivedStatus(row, bal, today),
  };
}

export type ByCurrency = Record<Currency, number>;
const zero = (): ByCurrency => ({ BOB: 0, USD: 0 });

/**
 * Resumen en centavos por moneda (no se mezclan Bs y $us).
 * - porCobrar: saldo de las enviadas (incluye las vencidas).
 * - vencido: saldo de las vencidas.
 * - cobradoMes: pagos con fecha dentro del mes de `today`, en cobros no anulados.
 */
export function summarize(views: InvoiceView[], today: string = todayLaPaz()) {
  const month = today.slice(0, 7);
  const porCobrar = zero();
  const vencido = zero();
  const cobradoMes = zero();
  for (const v of views) {
    if (v.status === "anulada") continue;
    if (v.status === "enviada") porCobrar[v.currency] += v.balance_cents;
    if (v.display === "vencida") vencido[v.currency] += v.balance_cents;
    cobradoMes[v.currency] += paymentsTotalCents(v.payments.filter((p) => p.paid_on.slice(0, 7) === month));
  }
  return { porCobrar, vencido, cobradoMes };
}

export function filterViews(views: InvoiceView[], f: { estado?: string; cliente?: string }) {
  return views.filter((v) => (!f.estado || v.display === f.estado) && (!f.cliente || v.client_id === f.cliente));
}
