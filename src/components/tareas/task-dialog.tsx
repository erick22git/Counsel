"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { ok } from "@/components/ui/undo-toast";
import { DictationButton } from "@/components/dictation/dictation-button";
import { createTask, updateTask } from "@/app/(app)/tareas/actions";
import type { Task } from "@/lib/db/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Task | null;
  cases: { id: string; title: string; case_number: string | null }[];
  people: { id: string; full_name: string }[];
  meId: string;
  presetCaseId: string;
}

export function TaskDialog({ open, onOpenChange, editing, cases, people, meId, presetCaseId }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={editing ? "Editar tarea" : "Nueva tarea"} description="Agrega los detalles que necesites.">
        <TaskForm editing={editing} cases={cases} people={people} meId={meId} presetCaseId={presetCaseId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Se monta al abrir el diálogo, así el formulario siempre parte limpio. */
function TaskForm({
  editing, cases, people, meId, presetCaseId, onDone,
}: Pick<Props, "editing" | "cases" | "people" | "meId" | "presetCaseId"> & { onDone: () => void }) {
  const [title, setTitle] = React.useState(editing?.title ?? "");
  const [due, setDue] = React.useState(editing?.due_at?.slice(0, 10) ?? "");
  const [caseId, setCaseId] = React.useState(editing ? (editing.case_id ?? "") : presetCaseId);
  const [who, setWho] = React.useState(editing ? (editing.assigned_to ?? "") : meId);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const input = { title, due_at: due, case_id: caseId, assigned_to: who };
    const res = editing ? await updateTask(editing.id, input) : await createTask(input);
    setSaving(false);
    if (!res.ok) return setError(res.error);
    ok(editing ? "Cambios guardados" : "Tarea agregada");
    onDone();
  }

  return (
    <>
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Tarea" htmlFor="tk-title">
            <div className="flex flex-wrap items-center gap-3">
              <Input id="tk-title" value={title} onChange={(e) => setTitle(e.target.value)} className="min-w-52 flex-1" required />
              <DictationButton onText={(t) => setTitle((v) => (v ? v + " " : "") + t.trim())} />
            </div>
          </Field>
          <Field label="Fecha límite (opcional)" htmlFor="tk-due">
            <Input id="tk-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Caso (opcional)" htmlFor="tk-case">
            <Select id="tk-case" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
              <option value="">Sin caso</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.title}{c.case_number ? ` (${c.case_number})` : ""}</option>
              ))}
            </Select>
          </Field>
          <Field label="Asignada a" htmlFor="tk-who">
            <Select id="tk-who" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">Sin asignar</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}{p.id === meId ? " (yo)" : ""}</option>
              ))}
            </Select>
          </Field>
          <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
    </>
  );
}
