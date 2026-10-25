import { entryAmountCents } from "@/lib/cobros/time";

export interface TimeAgg {
  case_id: string | null;
  worked_on: string;
  minutes: number;
  billable: boolean;
  rate: number | string;
}

export interface TimeSummary {
  totalMin: number;
  totalCents: number;
  perCase: { caseId: string | null; minutes: number }[];
  dayTotals: Record<string, { minutes: number; amountCents: number }>;
}

/** Totales del mes completo (todas las entradas, no solo la página mostrada). */
export function resumenTiempo(rows: TimeAgg[]): TimeSummary {
  let totalMin = 0;
  let totalCents = 0;
  const cases = new Map<string | null, number>();
  const dayTotals: TimeSummary["dayTotals"] = {};
  for (const r of rows) {
    const cents = r.billable ? entryAmountCents(r.minutes, r.rate) : 0;
    totalMin += r.minutes;
    totalCents += cents;
    cases.set(r.case_id, (cases.get(r.case_id) ?? 0) + r.minutes);
    const d = (dayTotals[r.worked_on] ??= { minutes: 0, amountCents: 0 });
    d.minutes += r.minutes;
    d.amountCents += cents;
  }
  const perCase = [...cases.entries()].map(([caseId, minutes]) => ({ caseId, minutes })).sort((a, b) => b.minutes - a.minutes);
  return { totalMin, totalCents, perCase, dayTotals };
}
