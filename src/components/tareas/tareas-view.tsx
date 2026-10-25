"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastWithUndo, fail, ok } from "@/components/ui/undo-toast";
import { DictationButton } from "@/components/dictation/dictation-button";
import { TaskDialog } from "./task-dialog";
import { createTask, setTaskDone } from "@/app/(app)/tareas/actions";
import { fmtTaskDue, todayKey } from "@/lib/agenda/dates";
import { groupTasks, type TaskBucket } from "@/lib/agenda/group";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/types";

export interface CaseOpt { id: string; title: string; case_number: string | null }
export interface Person { id: string; full_name: string }

const SECTIONS: { id: TaskBucket; title: string }[] = [
  { id: "vencidas", title: "Vencidas" },
  { id: "hoy", title: "Hoy" },
  { id: "semana", title: "Esta semana" },
  { id: "mas_tarde", title: "Más tarde" },
  { id: "sin_fecha", title: "Sin fecha" },
  { id: "hechas", title: "Hechas" },
];

export function TareasView({
  tasks, cases, people, meId, openNew, presetCaseId, hechasTotal, hechasMoreHref, pendientesTruncadas, hechasAbierto,
}: {
  tasks: Task[]; cases: CaseOpt[]; people: Person[]; meId: string; openNew: boolean; presetCaseId: string;
  /** Hechas de los últimos 30 días (en total) y enlace a "ver más"; el servidor solo envía un bloque a la vez. */
  hechasTotal?: number; hechasMoreHref?: string | null; pendientesTruncadas?: boolean; hechasAbierto?: boolean;
}) {
  const [filter, setFilter] = React.useState<"mias" | "todas">("mias");
  const [dialogOpen, setDialogOpen] = React.useState(!!presetCaseId);
  const [editing, setEditing] = React.useState<Task | null>(null);
  const [title, setTitle] = React.useState("");
  const [due, setDue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const now = React.useMemo(() => new Date(), []);

  React.useEffect(() => {
    if (openNew) inputRef.current?.focus();
  }, [openNew]);

  const caseTitle = React.useMemo(() => new Map(cases.map((c) => [c.id, c.title])), [cases]);
  const personName = React.useMemo(() => new Map(people.map((p) => [p.id, p.full_name])), [people]);
  const visible = filter === "mias" ? tasks.filter((t) => t.assigned_to === meId) : tasks;
  const groups = groupTasks(visible, now);

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Escribe la tarea antes de agregar");
    setBusy(true);
    setError(null);
    const res = await createTask({ title, due_at: due });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setTitle("");
    setDue("");
    ok("Tarea agregada");
    inputRef.current?.focus();
  }

  async function toggle(t: Task) {
    const done = !t.done_at;
    const res = await setTaskDone(t.id, done);
    if (!res.ok) return fail(res.error);
    toastWithUndo(done ? "Tarea hecha" : "Tarea vuelve a pendientes", async () => {
      const back = await setTaskDone(t.id, !done);
      if (!back.ok) fail(back.error);
    });
  }

  const openEdit = (t: Task) => {
    setEditing(t);
    setDialogOpen(true);
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={quickAdd} className="grid gap-2" aria-label="Agregar tarea">
        <label htmlFor="tarea-nueva" className="font-medium">Escribe una tarea y presiona Agregar</label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="tarea-nueva"
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej.: Llamar al perito"
            className="min-w-60 flex-1"
            autoComplete="off"
          />
          <Input
            type="date"
            aria-label="Fecha límite (opcional)"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-auto"
            min={todayKey(now)}
          />
          <DictationButton onText={(t) => setTitle((v) => (v ? v + " " : "") + t.trim())} />
          <Button type="submit" variant="primary" disabled={busy}>Agregar</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            Agregar con más detalles (caso, responsable)
          </Button>
        </div>
        <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
      </form>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as "mias" | "todas")}>
        <TabsList className="mb-0" aria-label="Qué tareas ver">
          <TabsTrigger value="mias">Mis tareas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {pendientesTruncadas && (
        <p className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-3 text-ink-2" role="status">
          Mostrando las 500 tareas pendientes más próximas. Termina o reorganiza algunas para ver el resto.
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title={filter === "mias" ? "No tienes tareas pendientes" : "No hay tareas todavía"}
          description="Escribe arriba lo próximo que debas hacer y presiona Agregar."
        />
      ) : (
        <div className="grid gap-8">
          {SECTIONS.map((s) => {
            const list = groups[s.id];
            if (list.length === 0) return null;
            const rows = (
              <ul className="grid gap-2">
                {list.map((t) => (
                  <TaskRow
                    key={t.id}
                    t={t}
                    now={now}
                    caseName={t.case_id ? caseTitle.get(t.case_id) : undefined}
                    who={filter === "todas" && t.assigned_to ? personName.get(t.assigned_to) : undefined}
                    overdue={s.id === "vencidas"}
                    onToggle={toggle}
                    onEdit={openEdit}
                  />
                ))}
              </ul>
            );
            return s.id === "hechas" ? (
              <details key={s.id} id="hechas" open={hechasAbierto || undefined}>
                <summary className="press flex min-h-11 cursor-pointer items-center text-[length:var(--text-heading-sm)] font-semibold">
                  Hechas ({list.length}{hechasTotal && filter === "todas" && hechasTotal > list.length ? ` de ${hechasTotal}` : ""})
                </summary>
                <div className="mt-3 grid gap-3">
                  {rows}
                  {hechasMoreHref && (
                    <Button asChild variant="outline" className="justify-self-start"><Link href={hechasMoreHref} scroll={false}>Ver más hechas</Link></Button>
                  )}
                </div>
              </details>
            ) : (
              <section key={s.id} aria-label={s.title} className="grid gap-3">
                <h2 className="text-[length:var(--text-heading-sm)]">
                  {s.title} <span className="text-ink-3">({list.length})</span>
                </h2>
                {rows}
              </section>
            );
          })}
        </div>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        cases={cases}
        people={people}
        meId={meId}
        presetCaseId={presetCaseId}
      />
    </div>
  );
}

function TaskRow({
  t, now, caseName, who, overdue, onToggle, onEdit,
}: {
  t: Task; now: Date; caseName?: string; who?: string; overdue: boolean; onToggle: (t: Task) => void; onEdit: (t: Task) => void;
}) {
  const done = !!t.done_at;
  const id = `tarea-${t.id}`;
  return (
    <li>
      <Card className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 sm:px-4">
        <label htmlFor={id} className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            id={id}
            type="checkbox"
            checked={done}
            onChange={() => onToggle(t)}
            className="size-7 shrink-0 cursor-pointer accent-[var(--accent)]"
          />
          <span className="min-w-0">
            <span className={cn("block text-[length:var(--text-subheading)]", done && "text-ink-3 line-through")}>{t.title}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--text-body-sm)] text-ink-2">
              {!done && t.due_at && (
                overdue ? <Pill tone="danger">{fmtTaskDue(t.due_at, now)}</Pill> : <span>{fmtTaskDue(t.due_at, now)}</span>
              )}
              {caseName && <span>Caso: {caseName}</span>}
              {who && <span>Para: {who}</span>}
            </span>
          </span>
        </label>
        {!done && (
          <Button size="sm" variant="ghost" onClick={() => onEdit(t)}>Editar</Button>
        )}
      </Card>
    </li>
  );
}
