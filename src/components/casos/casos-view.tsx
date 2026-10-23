"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { fail, toastWithUndo } from "@/components/ui/undo-toast";
import { Kanban } from "@/components/casos/kanban";
import { MoveMenu, type CaseView } from "@/components/casos/caso-card";
import { NuevoCasoDialog, type ClientOption } from "@/components/casos/nuevo-caso-dialog";
import { applyPlan, planMove, stageLabel } from "@/lib/casos/board";
import { filterCases } from "@/lib/casos/filters";
import { fmtDateTime, MATTERS, STAGES } from "@/lib/format";
import { moveCaseAction, undoMoveAction } from "@/app/(app)/casos/actions";
import type { Stage } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export function CasosView({
  cases: initial, clients, initialOpen, presetClientId,
}: {
  cases: CaseView[];
  clients: ClientOption[];
  initialOpen: boolean;
  presetClientId: string | null;
}) {
  const router = useRouter();
  const [cases, setCases] = React.useState(initial);
  const [seen, setSeen] = React.useState(initial);
  if (seen !== initial) { // datos nuevos del servidor
    setSeen(initial);
    setCases(initial);
  }
  const [view, setView] = React.useState<"tablero" | "lista">("tablero");
  const [text, setText] = React.useState("");
  const [matter, setMatter] = React.useState("");
  const [open, setOpen] = React.useState(initialOpen);

  const clientName = React.useMemo(() => {
    const m = new Map(clients.map((c) => [c.id, c.full_name]));
    return (id: string) => m.get(id) ?? "";
  }, [clients]);
  const shown = React.useMemo(() => filterCases(cases, { text, matter, clientName }), [cases, text, matter, clientName]);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o && (initialOpen || presetClientId)) router.replace("/casos");
  }

  async function persist(id: string, stage: Stage, position: number, fromStage: Stage, fromPosition: number, title: string) {
    const r = await moveCaseAction({ id, stage, position, fromStage });
    if (!r.ok) {
      setCases((p) => applyPlan(p, id, { stage: fromStage, position: fromPosition }));
      return fail(r.error);
    }
    const msg = stage === fromStage ? `“${title}” cambió de lugar` : `“${title}” pasó de ${stageLabel(STAGES, fromStage)} a ${stageLabel(STAGES, stage)}`;
    toastWithUndo(msg, async () => {
      setCases((p) => applyPlan(p, id, { stage: fromStage, position: fromPosition }));
      const u = await undoMoveAction({ id, stage: fromStage, position: fromPosition, fromStage: stage }, r.eventId);
      if (!u.ok) fail(u.error);
      router.refresh();
    });
  }

  function move(id: string, stage: Stage, position: number) {
    const c = cases.find((x) => x.id === id);
    if (!c) return;
    setCases((p) => applyPlan(p, id, { stage, position })); // optimista
    void persist(id, stage, position, c.stage, c.position, c.title);
  }

  function moveToEnd(id: string, stage: Stage) {
    const plan = planMove(cases, id, { stage, overId: null });
    if (plan?.changed) move(id, plan.stage, plan.position);
  }

  const newButton = (
    <Button variant="primary" onClick={() => setOpen(true)}><Plus size={20} aria-hidden /> Nuevo caso</Button>
  );
  const dialog = <NuevoCasoDialog open={open} onOpenChange={onOpenChange} clients={clients} presetClientId={presetClientId} />;

  if (initial.length === 0) {
    return (
      <>
        <PageHeader title="Casos" subtitle="Aquí verás todos tus casos ordenados por etapa." />
        <EmptyState
          title="Todavía no hay casos"
          description="Abre tu primer caso con un título y el cliente. Después lo moverás de etapa a medida que avance."
          action={newButton}
        />
        {dialog}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Casos" subtitle="Arrastra las tarjetas entre columnas o usa “Mover a…”." action={newButton} />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="relative min-w-60 flex-1 sm:max-w-md">
          <label htmlFor="buscar-caso" className="sr-only">Buscar caso</label>
          <Search aria-hidden size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input id="buscar-caso" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Buscar por título, cliente o expediente" className="pl-12" autoComplete="off" />
        </div>
        <div className="min-w-44">
          <label htmlFor="filtro-materia" className="sr-only">Filtrar por materia</label>
          <Select id="filtro-materia" value={matter} onChange={(e) => setMatter(e.target.value)}>
            <option value="">Todas las materias</option>
            {Object.entries(MATTERS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </Select>
        </div>
        <div role="group" aria-label="Forma de ver los casos" className="inline-flex rounded-[var(--radius-btn)] border border-line-strong bg-surface p-1">
          {([["tablero", "Tablero", LayoutGrid], ["lista", "Lista", List]] as const).map(([id, label, Icon]) => (
            <button
              key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}
              className={cn(
                "press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4",
                view === id ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-surface-2"
              )}
            >
              <Icon size={18} aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{shown.length} casos</p>
      {shown.length === 0 ? (
        <Card className="text-center text-ink-2">Ningún caso coincide con tu búsqueda. Borra el texto o elige “Todas las materias”.</Card>
      ) : view === "tablero" ? (
        <Kanban cases={shown} onMove={move} />
      ) : (
        <ul className="grid gap-3">
          {shown.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1 basis-64">
                  <Link href={`/casos/${c.id}`} className="font-semibold text-ink hover:text-accent">{c.title}</Link>
                  <p className="text-ink-2">{c.client_name}{c.case_number ? ` · Exp. ${c.case_number}` : ""}</p>
                  {c.next && <p className="text-[length:var(--text-body-sm)] text-warn">Próximo: {fmtDateTime(c.next.starts_at)}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="neutral">{MATTERS[c.matter] ?? c.matter}</Pill>
                  <Pill tone="accent">{stageLabel(STAGES, c.stage)}</Pill>
                  <MoveMenu current={c.stage} onMove={(s) => moveToEnd(c.id, s)} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </>
  );
}
