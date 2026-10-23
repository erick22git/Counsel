"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { ok } from "@/components/ui/undo-toast";
import { createAppointment, updateAppointment, type AppointmentInput } from "@/app/(app)/agenda/actions";
import { dayKey, timeKey, todayKey } from "@/lib/agenda/dates";
import type { Appointment } from "@/lib/db/types";

export const KIND_LABEL: Record<Appointment["kind"], string> = {
  audiencia: "Audiencia (en el juzgado)",
  cita: "Cita (con cliente u otra persona)",
  plazo: "Plazo (fecha límite)",
};

export interface CaseOption {
  id: string;
  title: string;
  case_number: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Appointment | null;
  cases: CaseOption[];
  presetCaseId?: string;
  defaultDate?: string;
}

export function AppointmentDialog({ open, onOpenChange, editing, cases, presetCaseId = "", defaultDate }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Editar cita" : "Nueva cita"} description="Audiencia, cita o plazo.">
        <AppointmentForm editing={editing} cases={cases} presetCaseId={presetCaseId} defaultDate={defaultDate} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Se monta al abrir el diálogo, así el formulario siempre parte limpio. */
function AppointmentForm({
  editing, cases, presetCaseId, defaultDate, onDone,
}: Pick<Props, "editing" | "cases" | "defaultDate"> & { presetCaseId: string; onDone: () => void }) {
  const [form, setForm] = React.useState<AppointmentInput>(() =>
    editing
      ? {
          kind: editing.kind,
          title: editing.title,
          case_id: editing.case_id ?? "",
          date: dayKey(editing.starts_at),
          start: timeKey(editing.starts_at),
          end: editing.ends_at ? timeKey(editing.ends_at) : "",
          location: editing.location ?? "",
          notes: editing.notes ?? "",
          visible_to_client: editing.visible_to_client,
        }
      : blank(presetCaseId, defaultDate)
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof AppointmentInput>(k: K, v: AppointmentInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = editing ? await updateAppointment(editing.id, form) : await createAppointment(form);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    ok(editing ? "Cambios guardados" : "Cita guardada");
    onDone();
  }

  return (
    <>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Tipo" htmlFor="ag-kind">
            <Select id="ag-kind" value={form.kind} onChange={(e) => set("kind", e.target.value as AppointmentInput["kind"])}>
              {(Object.keys(KIND_LABEL) as Appointment["kind"][]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Título" htmlFor="ag-title">
            <Input id="ag-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ej.: Audiencia de conciliación" required />
          </Field>
          <Field label="Caso (opcional)" htmlFor="ag-case">
            <Select id="ag-case" value={form.case_id ?? ""} onChange={(e) => set("case_id", e.target.value)}>
              <option value="">Sin caso</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title}{c.case_number ? ` (${c.case_number})` : ""}</option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha" htmlFor="ag-date">
            <Input id="ag-date" type="date" value={form.date} onChange={(e) => set("date", e.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hora de inicio" htmlFor="ag-start">
              <Input id="ag-start" type="time" value={form.start} onChange={(e) => set("start", e.target.value)} required />
            </Field>
            <Field label="Hora de fin (opcional)" htmlFor="ag-end">
              <Input id="ag-end" type="time" value={form.end ?? ""} onChange={(e) => set("end", e.target.value)} />
            </Field>
          </div>
          <Field label="Lugar o juzgado (opcional)" htmlFor="ag-loc">
            <Input id="ag-loc" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Ej.: Juzgado 3.º de Familia, La Paz" />
          </Field>
          <Field label="Notas (opcional)" htmlFor="ag-notes">
            <TextWithDictation id="ag-notes" value={form.notes ?? ""} onChange={(v) => set("notes", v)} />
          </Field>
          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={form.visible_to_client}
              disabled={!form.case_id}
              onChange={(e) => set("visible_to_client", e.target.checked)}
              className="mt-1 size-6 shrink-0 accent-[var(--accent)]"
            />
            <span>
              Mostrar al cliente en su portal
              <span className="block text-[length:var(--text-body-sm)] text-ink-3">
                {form.case_id ? "El cliente verá la fecha y el lugar, no las notas." : "Primero elige un caso."}
              </span>
            </span>
          </label>
          <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
    </>
  );
}

function blank(caseId: string, date?: string): AppointmentInput {
  return {
    kind: "cita",
    title: "",
    case_id: caseId,
    date: date ?? todayKey(),
    start: "09:00",
    end: "",
    location: "",
    notes: "",
    visible_to_client: false,
  };
}
