import { balanceCents, toCents, type LineLike } from "@/lib/cobros/money";
import { derivedStatus, todayLaPaz } from "@/lib/cobros/status";
import type { ByCurrency, Currency } from "@/lib/cobros/summary";

export interface EnviadaAgg {
  currency: Currency;
  due_date: string | null;
  items: LineLike[];
  payments: { amount: number | string }[];
}

const zero = (): ByCurrency => ({ BOB: 0, USD: 0 });

/**
 * Tarjetas de Cobros calculadas sobre TODO el despacho (no sobre la página mostrada):
 * - porCobrar y vencido: a partir de TODAS las cuentas enviadas.
 * - cobradoMes: pagos del mes en cuentas no anuladas (ya filtrados por la consulta).
 */
export function resumenCobros(
  enviadas: EnviadaAgg[],
  pagosMes: { amount: number | string; currency: Currency }[],
  today: string = todayLaPaz()
) {
  const porCobrar = zero();
  const vencido = zero();
  const cobradoMes = zero();
  for (const e of enviadas) {
    const bal = balanceCents(e.items, e.payments);
    porCobrar[e.currency] += bal;
    if (derivedStatus({ status: "enviada", due_date: e.due_date }, bal, today) === "vencida") vencido[e.currency] += bal;
  }
  for (const p of pagosMes) cobradoMes[p.currency] += toCents(p.amount);
  return { porCobrar, vencido, cobradoMes };
}
