"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { fail, toastWithUndo } from "@/components/ui/undo-toast";
import { Paginacion } from "@/components/paginacion/paginacion";
import { EntryDialog, type EntryDraft } from "./entry-dialog";
import { deleteTimeEntry, restoreTimeEntry } from "@/app/(app)/tiempo/actions";
import { fmtDate, fmtMinutes, fmtMoney } from "@/lib/format";
import { fromCents } from "@/lib/cobros/money";
import type { TimeSummary } from "@/lib/paginacion/tiempo-resumen";
import { entryAmountCents, formatClock, groupByDay, minutesByCase, parseTimerState, secondsToMinutes, type TimerState } from "@/lib/cobros/time";

export interface Entry {
  id: string; case_id: string | null; description: string | null; minutes: number; worked_on: string; billable: boolean; rate: number; invoice_id: string | null;
}

const KEY = "counsel.timer.v1";
const PENDING_KEY = "counsel.timer.pending.v1";

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };

export function TimeWorkspace({
  today, defaultRate, cases, entries, openManual, summary, total = entries.length, page = 1, pageSize = 25,
}: {
  today: string; defaultRate: number; cases: { id: string; title: string }[]; entries: Entry[]; openManual: boolean;
  /** Totales de TODO el mes (el servidor los calcula aparte; `entries` es solo la página actual). */
  summary?: TimeSummary; total?: number; page?: number; pageSize?: number;
}) {
  const router = useRouter();
  const caseName = (id: string | null) => cases.find((c) => c.id === id)?.title ?? "Sin caso";

  // ── Timer ──
  const [timer, setTimer] = React.useState<TimerState | null>(null);
  const [now, setNow] = React.useState(0);
  const [caseId, setCaseId] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [hydrated, setHydrated] = React.useState(false);
  const [pending, setPending] = React.useState<EntryDraft | null>(null);

  // Lee localStorage solo en el navegador (evita diferencias con el HTML del servidor).
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    const t = parseTimerState(read(KEY));
    if (t) { setTimer(t); setCaseId(t.caseId); setDesc(t.description); }
    try {
      const p = read(PENDING_KEY);
      if (p) setPending(JSON.parse(p) as EntryDraft);
    } catch { write(PENDING_KEY, null); }
    setNow(Date.now());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  React.useEffect(() => {
    if (!timer) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [timer]);

  // Guarda caso y descripción del timer en curso
  React.useEffect(() => {
    if (timer) write(KEY, JSON.stringify({ ...timer, caseId, description: desc }));
  }, [timer, caseId, desc]);

  const start = () => {
    const t = { startedAt: Date.now(), caseId, description: desc };
    setNow(Date.now());
    setTimer(t);
  };
  const stop = () => {
    if (!timer) return;
    const minutes = Math.min(24 * 60, secondsToMinutes((Date.now() - timer.startedAt) / 1000));
    const draft: EntryDraft = { worked_on: today, minutes, case_id: caseId || null, description: desc, billable: true, rate: defaultRate };
    write(KEY, null);
    write(PENDING_KEY, JSON.stringify(draft));
    setTimer(null);
    setPending(draft);
  };
  const clearPending = () => { write(PENDING_KEY, null); setPending(null); setCaseId(""); setDesc(""); };

  const seconds = timer ? (now - timer.startedAt) / 1000 : 0;

  // ── Manual / edición ──
  const [manual, setManual] = React.useState<EntryDraft | null>(
    openManual ? { worked_on: today, minutes: 0, case_id: null, description: "", billable: true, rate: defaultRate } : null
  );

  // ── Resumen del mes ──
  // Un día puede quedar partido entre dos páginas: el total del día sale de los agregados del mes.
  const days = groupByDay(entries).map((d) => ({ ...d, ...(summary?.dayTotals[d.day] ?? {}) }));
  const totalMin = summary?.totalMin ?? entries.reduce((s, e) => s + e.minutes, 0);
  const totalCents = summary?.totalCents ?? days.reduce((s, d) => s + d.amountCents, 0);
  const perCase = summary?.perCase ?? minutesByCase(entries);

  async function remove(e: Entry) {
    const r = await deleteTimeEntry(e.id);
    if (!r.ok) return fail(r.error);
    router.refresh();
    toastWithUndo("Entrada eliminada.", async () => {
      const u = await restoreTimeEntry(r.row);
      if (!u.ok) { fail(u.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8">
      <Card className="grid gap-5">
        <div className="text-center" aria-live="off">
          <p className="tabular-nums text-[length:var(--text-display)] font-semibold leading-none" role="timer" aria-label="Cronómetro">
            {formatClock(seconds)}
          </p>
          <p className="mt-2 text-ink-2">{timer ? "Midiendo tu tiempo…" : "Listo para empezar"}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Caso" htmlFor="tm-caso">
            <Select id="tm-caso" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">Sin caso (lo elijo después)</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <Field label="¿Qué estás haciendo?" htmlFor="tm-desc">
            <TextWithDictation id="tm-desc" value={desc} onChange={setDesc} rows={2} placeholder="Puedes escribirlo ahora o al terminar" />
          </Field>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {timer ? (
            <Button variant="primary" size="lg" className="min-w-56" onClick={stop}><Square size={22} aria-hidden /> Detener</Button>
          ) : (
            <Button variant="primary" size="lg" className="min-w-56" disabled={!hydrated} onClick={start}><Play size={22} aria-hidden /> Empezar</Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={() => setManual({ worked_on: today, minutes: 0, case_id: null, description: "", billable: true, rate: defaultRate })}
          >
            <Plus size={20} aria-hidden /> Agregar tiempo a mano
          </Button>
        </div>
      </Card>

      <section aria-labelledby="mes-t" className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="mes-t" className="text-[length:var(--text-heading-sm)] font-semibold">Este mes</h2>
          {total > 0 && (
            <p className="text-ink-2">
              {fmtMinutes(totalMin)} · estimado <span className="tabular-nums">{fmtMoney(fromCents(totalCents))}</span>
            </p>
          )}
        </div>

        {total === 0 ? (
          <EmptyState
            title="Aún no hay horas este mes"
            description="Pulsa Empezar cuando comiences a trabajar, o agrega el tiempo a mano."
          />
        ) : (
          <>
            <Card className="grid gap-2">
              <h3 className="text-[length:var(--text-subheading)] font-semibold">Horas por caso</h3>
              <ul className="grid gap-1">
                {perCase.map((p) => (
                  <li key={p.caseId ?? "none"} className="flex justify-between gap-4 border-b border-line py-2 last:border-0">
                    <span>{caseName(p.caseId)}</span>
                    <span className="tabular-nums text-ink-2">{fmtMinutes(p.minutes)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {days.map((d) => (
              <Card key={d.day} className="p-0">
                <div className="flex flex-wrap justify-between gap-2 border-b border-line px-4 py-3">
                  <h3 className="font-semibold">{fmtDate(d.day)}</h3>
                  <p className="text-ink-2 tabular-nums">{fmtMinutes(d.minutes)} · {fmtMoney(fromCents(d.amountCents))}</p>
                </div>
                <ul>
                  {d.entries.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{e.description || "Sin descripción"}</p>
                        <p className="text-ink-2 text-[length:var(--text-body-sm)]">
                          {caseName(e.case_id)} · {fmtMinutes(e.minutes)}
                          {e.billable ? ` · ${fmtMoney(fromCents(entryAmountCents(e.minutes, e.rate)))}` : " · no facturable"}
                        </p>
                      </div>
                      {e.invoice_id ? (
                        <Pill tone="ok">Ya cobrado</Pill>
                      ) : (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" aria-label={`Editar: ${e.description || "entrada"}`}
                            onClick={() => setManual({ id: e.id, worked_on: e.worked_on, minutes: e.minutes, case_id: e.case_id, description: e.description ?? "", billable: e.billable, rate: e.rate })}>
                            <Pencil size={18} aria-hidden /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" aria-label={`Eliminar: ${e.description || "entrada"}`} onClick={() => remove(e)}>
                            <Trash2 size={18} aria-hidden /> Eliminar
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
            <Paginacion total={total} page={page} pageSize={pageSize} basePath="/tiempo" noun="entradas" />
          </>
        )}
      </section>

      {manual && (
        <EntryDialog
          open
          onOpenChange={(o) => { if (!o) setManual(null); }}
          draft={manual}
          cases={cases}
          today={today}
          onSaved={() => router.refresh()}
        />
      )}
      {pending && (
        <EntryDialog
          open
          onOpenChange={(o) => { if (!o) clearPending(); }}
          draft={pending}
          cases={cases}
          today={today}
          discardLabel="Descartar este tiempo"
          onSaved={() => router.refresh()}
          onDiscard={clearPending}
        />
      )}
    </div>
  );
}
