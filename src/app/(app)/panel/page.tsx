import Link from "next/link";
import { Briefcase, CalendarPlus, Clock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";
import { fmtMinutes, fmtMoney } from "@/lib/format";
import { dueLabel, greeting, isUrgent, longDateLaPaz, shortDateLaPaz, timeLaPaz } from "@/lib/panel/dates";
import { loadPanel, type AgendaItem, type Result } from "@/lib/panel/queries";
import type { CurrencyTotals } from "@/lib/panel/money";
import { AskAssistant } from "@/components/panel/ask-assistant";
import { TaskRow } from "@/components/panel/task-row";

export const metadata = { title: "Inicio · Counsel" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { audiencia: "Audiencia", cita: "Cita", plazo: "Plazo" };

function Soft({ children = "No pude cargar esta parte ahora. El resto sigue funcionando; intenta recargar en un momento." }: { children?: string }) {
  return <p className="text-ink-2">{children}</p>;
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <h2 className="mb-3 text-[length:var(--text-subheading)]">{title}</h2>
      {children}
    </Card>
  );
}

function moneyLines(t: CurrencyTotals) {
  const lines = (["BOB", "USD"] as const).filter((c) => t[c] > 0).map((c) => fmtMoney(t[c] / 100, c));
  return lines.length ? lines : [fmtMoney(0, "BOB")];
}

function Stat({ title, result, children }: { title: string; result: Result<unknown>; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="text-[length:var(--text-body-sm)] font-medium text-ink-2">{title}</h2>
      <div className="mt-2">{result.ok ? children : <Soft>No pude cargar este dato.</Soft>}</div>
    </Card>
  );
}

function AgendaList({ label, items }: { label: string; items: AgendaItem[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-1 text-[length:var(--text-body-sm)] font-medium text-ink-2">{label}</h3>
      <ul className="divide-y divide-line">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
            <span className="w-14 shrink-0 font-semibold tabular-nums">{timeLaPaz(a.starts_at)}</span>
            <span className="min-w-0 flex-1">
              <span className="block">{a.title}</span>
              <span className="block text-[length:var(--text-body-sm)] text-ink-2">
                {[a.case_title, a.location].filter(Boolean).join(" · ") || "Sin caso ni lugar"}
              </span>
            </span>
            <Pill tone={a.kind === "plazo" ? "warn" : a.kind === "audiencia" ? "accent" : "neutral"}>{KIND[a.kind] ?? a.kind}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function Panel() {
  const { supabase, profile } = await requireStaff();
  const now = new Date();
  const d = await loadPanel(supabase, now);
  const first = profile.full_name.split(" ")[0];

  const welcome = d.counts.ok && d.counts.data.clients === 0 && d.counts.data.cases === 0;

  if (welcome) {
    return (
      <>
        <PageHeader title={`${greeting(now)}, ${first}`} subtitle={longDateLaPaz(now)} />
        <EmptyState
          title="Bienvenido a Counsel"
          description="Empecemos con tres pasos sencillos. Lo demás vendrá solo."
          action={
            <div className="flex flex-col items-center gap-5">
              <ol className="space-y-2 text-left text-ink">
                <li>1. Crea tu primer cliente</li>
                <li>2. Abre su caso</li>
                <li>3. Anota la próxima audiencia</li>
              </ol>
              <Button asChild variant="primary" size="lg">
                <Link href="/clientes?nuevo=1">Crear mi primer cliente</Link>
              </Button>
            </div>
          }
        />
      </>
    );
  }

  const agenda = d.agenda.ok ? d.agenda.data : null;
  const tasks = d.tasks.ok ? d.tasks.data : null;
  const nothingToday =
    agenda && tasks && !agenda.hoy.length && !agenda.manana.length && !tasks.overdue.length && !tasks.today.length;

  return (
    <>
      <PageHeader title={`${greeting(now)}, ${first}`} subtitle={longDateLaPaz(now)} />

      <nav aria-label="Atajos" className="mb-6 flex flex-wrap gap-3">
        <Button asChild variant="primary">
          <Link href="/casos?nuevo=1"><Briefcase size={18} aria-hidden /> Nuevo caso</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/agenda?nuevo=1"><CalendarPlus size={18} aria-hidden /> Nueva cita</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/clientes?nuevo=1"><UserPlus size={18} aria-hidden /> Nuevo cliente</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/tiempo"><Clock size={18} aria-hidden /> Registrar tiempo</Link>
        </Button>
        <AskAssistant />
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Lo de hoy" className="lg:col-span-2">
          {!d.agenda.ok && !d.tasks.ok ? (
            <Soft />
          ) : nothingToday ? (
            <p className="text-ink-2">Nada urgente para hoy ni mañana. Buen momento para adelantar un caso.</p>
          ) : (
            <div className="space-y-5">
              {d.agenda.ok ? (
                <>
                  <AgendaList label="Hoy" items={d.agenda.data.hoy} />
                  <AgendaList label="Mañana" items={d.agenda.data.manana} />
                </>
              ) : (
                <Soft>No pude cargar las audiencias y citas.</Soft>
              )}
              {d.tasks.ok ? (
                (d.tasks.data.overdue.length > 0 || d.tasks.data.today.length > 0) && (
                  <div>
                    <h3 className="mb-1 text-[length:var(--text-body-sm)] font-medium text-ink-2">Tareas</h3>
                    <ul>
                      {d.tasks.data.overdue.map((t) => (
                        <TaskRow key={t.id} id={t.id} title={t.title} caseTitle={t.case_title} when={dueLabel(t.due_at!, now)} overdue />
                      ))}
                      {d.tasks.data.today.map((t) => (
                        <TaskRow key={t.id} id={t.id} title={t.title} caseTitle={t.case_title} when="Hoy" />
                      ))}
                    </ul>
                  </div>
                )
              ) : (
                <Soft>No pude cargar las tareas.</Soft>
              )}
            </div>
          )}
        </Section>

        <Section title="Plazos que se acercan">
          {!d.deadlines.ok ? (
            <Soft />
          ) : d.deadlines.data.length === 0 ? (
            <p className="text-ink-2">No hay plazos en los próximos 7 días.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.deadlines.data.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block">{p.title}</span>
                      <span className="block truncate text-[length:var(--text-body-sm)] text-ink-2">
                        {p.case_title ?? "Sin caso"} · {shortDateLaPaz(p.starts_at)}
                      </span>
                    </span>
                    <Pill tone={isUrgent(p.starts_at, now) ? "warn" : "neutral"}>{dueLabel(p.starts_at, now)}</Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2 lg:col-span-2">
          <h2 className="text-[length:var(--text-body-sm)] font-medium text-ink-2">Casos activos por etapa</h2>
          <div className="mt-3">
            {!d.stages.ok ? (
              <Soft>No pude cargar este dato.</Soft>
            ) : (
              (() => {
                const rows = d.stages.data;
                const max = Math.max(1, ...rows.map((r) => r.count));
                return (
                  <ul className="space-y-2">
                    {rows.map((r) => (
                      <li key={r.id} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-[length:var(--text-body-sm)]">{r.label}</span>
                        <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                          <span className="block h-full rounded-full bg-sky" style={{ width: `${(r.count / max) * 100}%` }} />
                        </span>
                        <span className="w-16 shrink-0 text-right tabular-nums">
                          {r.count} {r.count === 1 ? "caso" : "casos"}
                        </span>
                      </li>
                    ))}
                  </ul>
                );
              })()
            )}
          </div>
        </Card>

        <div className="grid gap-6 sm:col-span-2 sm:grid-cols-3 lg:col-span-2">
          <Stat title="Por cobrar" result={d.receivable}>
            {d.receivable.ok && moneyLines(d.receivable.data).map((l) => <p key={l} className="text-[length:var(--text-heading-sm)] font-semibold leading-tight">{l}</p>)}
            <Link href="/cobros" className="mt-2 inline-block min-h-11 py-2 text-accent underline-offset-2 hover:underline">Ver cobros</Link>
          </Stat>
          <Stat title="Cobrado este mes" result={d.collected}>
            {d.collected.ok && moneyLines(d.collected.data).map((l) => <p key={l} className="text-[length:var(--text-heading-sm)] font-semibold leading-tight">{l}</p>)}
          </Stat>
          <Stat title="Horas este mes" result={d.hours}>
            {d.hours.ok && <p className="text-[length:var(--text-heading-sm)] font-semibold leading-tight">{fmtMinutes(d.hours.data)}</p>}
            <Link href="/tiempo" className="mt-2 inline-block min-h-11 py-2 text-accent underline-offset-2 hover:underline">Registrar tiempo</Link>
          </Stat>
        </div>
      </div>
    </>
  );
}
