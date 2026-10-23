"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { fail, ok } from "@/components/ui/undo-toast";
import { createTimeEntry, updateTimeEntry } from "@/app/(app)/tiempo/actions";
import { timeEntrySchema } from "@/lib/cobros/schemas";
import { hoursMinutesToMinutes } from "@/lib/cobros/time";

export interface EntryDraft {
  id?: string;
  worked_on: string;
  minutes: number;
  case_id: string | null;
  description: string;
  billable: boolean;
  rate: number;
}

export function EntryDialog({
  open, onOpenChange, draft, cases, today, discardLabel, onSaved, onDiscard,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  draft: EntryDraft;
  cases: { id: string; title: string }[];
  today: string;
  /** Si se pasa, el botón de cancelar descarta el tiempo medido. */
  discardLabel?: string;
  onSaved?: () => void;
  onDiscard?: () => void;
}) {
  // El diálogo se monta nuevo cada vez que se abre, así que el borrador inicializa el estado.
  const [date, setDate] = React.useState(draft.worked_on);
  const [h, setH] = React.useState(draft.minutes >= 60 ? String(Math.floor(draft.minutes / 60)) : "");
  const [m, setM] = React.useState(draft.minutes % 60 ? String(draft.minutes % 60) : "");
  const [caseId, setCaseId] = React.useState(draft.case_id ?? "");
  const [desc, setDesc] = React.useState(draft.description);
  const [billable, setBillable] = React.useState(draft.billable);
  const [rate, setRate] = React.useState(String(draft.rate));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      case_id: caseId || null,
      description: desc.trim() || null,
      minutes: hoursMinutesToMinutes(h.replace(",", "."), m),
      worked_on: date,
      billable,
      rate: Number(rate.replace(",", ".") || 0),
    };
    const v = timeEntrySchema.safeParse(payload);
    if (!v.success) return setError(v.error.issues[0]?.message ?? "Revisa los datos.");
    setBusy(true);
    const r = draft.id ? await updateTimeEntry(draft.id, payload) : await createTimeEntry(payload);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    ok(draft.id ? "Cambios guardados." : "Tiempo guardado.");
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && discardLabel) return; onOpenChange(o); }}>
      <DialogContent title={draft.id ? "Editar tiempo" : discardLabel ? "Guardar el tiempo medido" : "Agregar tiempo a mano"}>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Fecha" htmlFor="t-fecha"><Input id="t-fecha" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Horas" htmlFor="t-h"><Input id="t-h" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value)} placeholder="0" /></Field>
            <Field label="Minutos" htmlFor="t-m"><Input id="t-m" inputMode="numeric" value={m} onChange={(e) => setM(e.target.value)} placeholder="0" /></Field>
          </div>
          <Field label="Caso" htmlFor="t-caso">
            <Select id="t-caso" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">Sin caso</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <Field label="¿Qué hiciste?" htmlFor="t-desc">
            <TextWithDictation id="t-desc" value={desc} onChange={setDesc} rows={3} placeholder="Ej.: Revisión del expediente y redacción de memorial" />
          </Field>
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-6 accent-[var(--accent)]" checked={billable} onChange={(e) => setBillable(e.target.checked)} />
            <span>Se le puede cobrar al cliente</span>
          </label>
          <Field label="Tarifa por hora" htmlFor="t-rate" hint="Viene de tu tarifa en Ajustes; puedes cambiarla solo para esta entrada.">
            <Input id="t-rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
          </Field>
          <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
          <div className="flex flex-wrap justify-end gap-3">
            {discardLabel ? (
              <Button variant="outline" onClick={() => { onOpenChange(false); onDiscard?.(); fail("Tiempo descartado."); }}>{discardLabel}</Button>
            ) : (
              <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            )}
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
