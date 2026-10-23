import type { SupabaseClient } from "@supabase/supabase-js";
import type { Appointment, Task } from "@/lib/db/types";
import { dayStartIso, monthStartDay, paDay, splitTasks, groupTodayTomorrow, upcomingWithin } from "./dates";
import { collectedByCurrency, receivableByCurrency, type Currency, type CurrencyTotals } from "./money";
import { countByStage } from "./stages";

export type Result<T> = { ok: true; data: T } | { ok: false };

/** Convierte una consulta que puede fallar en un resultado seguro: una tarjeta rota no rompe el resto. */
async function safe<T>(fn: () => PromiseLike<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch {
    return { ok: false };
  }
}
function must<T>(r: { data: T | null; error: unknown }): T {
  if (r.error || r.data === null) throw new Error("query");
  return r.data;
}

export type AgendaItem = Pick<Appointment, "id" | "kind" | "title" | "location" | "starts_at"> & { case_title: string | null };
export type TaskItem = Pick<Task, "id" | "title" | "due_at" | "done_at"> & { case_title: string | null };

const caseTitle = (c: unknown): string | null => {
  const o = Array.isArray(c) ? c[0] : c;
  return (o as { title?: string } | null | undefined)?.title ?? null;
};

export async function loadPanel(supabase: SupabaseClient, now: Date) {
  const today = paDay(now);
  const dayStart = dayStartIso(today);
  const dayAfter = dayStartIso(today, 2);
  const weekEnd = dayStartIso(today, 8);
  const tomorrowStart = dayStartIso(today, 1);
  const month = monthStartDay(now);

  const [agenda, tasks, deadlines, stages, receivable, collected, hours, counts] = await Promise.all([
    safe(async () => {
      const rows = must(
        await supabase
          .from("appointments")
          .select("id, kind, title, location, starts_at, cases(title)")
          .eq("status", "programada")
          .gte("starts_at", dayStart)
          .lt("starts_at", dayAfter)
          .order("starts_at")
          .limit(40)
      );
      const items: AgendaItem[] = rows.map((r: Record<string, unknown>) => ({ ...(r as unknown as AgendaItem), case_title: caseTitle(r.cases) }));
      return groupTodayTomorrow(items, now);
    }),
    safe(async () => {
      const rows = must(
        await supabase
          .from("tasks")
          .select("id, title, due_at, done_at, cases(title)")
          .is("done_at", null)
          .not("due_at", "is", null)
          .lt("due_at", tomorrowStart)
          .order("due_at")
          .limit(40)
      );
      const items: TaskItem[] = rows.map((r: Record<string, unknown>) => ({ ...(r as unknown as TaskItem), case_title: caseTitle(r.cases) }));
      return splitTasks(items, now);
    }),
    safe(async () => {
      const rows = must(
        await supabase
          .from("appointments")
          .select("id, kind, title, location, starts_at, cases(title)")
          .eq("kind", "plazo")
          .eq("status", "programada")
          .gte("starts_at", dayStart)
          .lt("starts_at", weekEnd)
          .order("starts_at")
          .limit(30)
      );
      const items: AgendaItem[] = rows.map((r: Record<string, unknown>) => ({ ...(r as unknown as AgendaItem), case_title: caseTitle(r.cases) }));
      return upcomingWithin(items, now, 7);
    }),
    safe(async () => {
      const rows = must(await supabase.from("cases").select("stage").is("deleted_at", null).neq("stage", "cerrado").limit(5000));
      return countByStage(rows as { stage: string }[]);
    }),
    safe(async () => {
      const rows = must(
        await supabase
          .from("invoices")
          .select("status, currency, invoice_items(quantity, unit_price), payments(amount)")
          .eq("status", "enviada")
          .limit(500)
      );
      return receivableByCurrency(rows as unknown as Parameters<typeof receivableByCurrency>[0]);
    }),
    safe(async () => {
      const rows = must(await supabase.from("payments").select("amount, invoices(currency)").gte("paid_on", month).limit(1000));
      return collectedByCurrency(rows as unknown as Parameters<typeof collectedByCurrency>[0]);
    }),
    safe(async () => {
      const rows = must(await supabase.from("time_entries").select("minutes").gte("worked_on", month).limit(5000));
      return (rows as { minutes: number }[]).reduce((s, r) => s + r.minutes, 0);
    }),
    safe(async () => {
      const [c, k] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("cases").select("id", { count: "exact", head: true }).is("deleted_at", null),
      ]);
      if (c.error || k.error) throw new Error("query");
      return { clients: c.count ?? 0, cases: k.count ?? 0 };
    }),
  ]);

  return { agenda, tasks, deadlines, stages, receivable, collected, hours, counts };
}

export type { Currency, CurrencyTotals };
