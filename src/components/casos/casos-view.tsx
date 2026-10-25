"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { BuscadorLista } from "@/components/paginacion/buscador-lista";
import { Paginacion } from "@/components/paginacion/paginacion";
import { fail, toastWithUndo } from "@/components/ui/undo-toast";
import { Kanban } from "@/components/casos/kanban";
import { MoveMenu, type CaseView } from "@/components/casos/caso-card";
import { NuevoCasoDialog, type ClientOption } from "@/components/casos/nuevo-caso-dialog";
import { buildHref } from "@/lib/paginacion/params";
import { applyPlan, planMove, stageLabel } from "@/lib/casos/board";
import { fmtDateTime, MATTERS, STAGES } from "@/lib/format";
import { moveCaseAction, undoMoveAction } from "@/app/(app)/casos/actions";
import type { Stage } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export function CasosView({
  cases: initial, clients, initialOpen, presetClientId, vista = "tablero", q = "", materia = "", hasAny = initial.length > 0, total = initial.length, page = 1, pageSize = 25, truncatedStages = [], perColumn = 200,
}: {
  cases: CaseView[];
  clients: ClientOption[];
  initialOpen: boolean;
  presetClientId: string | null;
  /** Modo de vista y filtros: vienen de la URL y se aplican en el servidor. */
  vista?: "tablero" | "lista";
  q?: string;
  materia?: string;
  /** Hay casos en el despacho (sin contar filtros). */
  hasAny?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  /** Etapas del tablero que superan el tope por columna. */
  truncatedStages?: string[];
  perColumn?: number;
}) {
  const router = useRouter();
  const [cases, setCases] = React.useState(initial);
  const [seen, setSeen] = React.useState(initial);
  if (seen !== initial) { // datos nuevos del servidor
    setSeen(initial);
    setCases(initial);
  }
  const [open, setOpen] = React.useState(initialOpen);

  const shown = cases;
  const view = vista;
  const keep = { q, materia, vista: vista === "lista" ? "lista" : "" };

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

  if (!hasAny) {
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

      <BuscadorLista
        basePath="/casos" q={q} id="buscar-caso" label="Buscar caso" placeholder="Buscar por título, cliente, expediente o parte contraria"
        params={{ vista: vista === "lista" ? "lista" : "" }} active={Boolean(q || materia)} clearHref={vista === "lista" ? "/casos?vista=lista" : "/casos"}
      >
        <div className="grid min-w-44 gap-1.5">
          <label htmlFor="filtro-materia" className="font-medium">Materia</label>
          <Select id="filtro-materia" name="materia" defaultValue={materia}>
            <option value="">Todas las materias</option>
            {Object.entries(MATTERS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </Select>
        </div>
        <div role="group" aria-label="Forma de ver los casos" className="inline-flex rounded-[var(--radius-btn)] border border-line-strong bg-surface p-1">
          {([["tablero", "Tablero", LayoutGrid], ["lista", "Lista", List]] as const).map(([id, label, Icon]) => (
            <Link
              key={id} href={buildHref("/casos", { q, materia, vista: id === "lista" ? "lista" : "" }, 1)} aria-current={view === id ? "page" : undefined}
              className={cn(
                "press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-4",
                view === id ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-surface-2"
              )}
            >
              <Icon size={18} aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </BuscadorLista>

      <p className="sr-only" aria-live="polite">{total} casos</p>
      {shown.length === 0 ? (
        <Card className="text-center text-ink-2">Ningún caso coincide con tu búsqueda. Borra el texto o elige “Todas las materias”.</Card>
      ) : view === "tablero" ? (
        <>
          {truncatedStages.length > 0 && (
            <p className="mb-3 rounded-[var(--radius-card)] border border-line bg-surface-2 p-3 text-ink-2" role="status">
              Mostrando las {perColumn} más recientes; usa la lista para ver el resto.{" "}
              <span className="text-ink-3">(Columnas: {truncatedStages.map((s) => stageLabel(STAGES, s)).join(", ")}.)</span>{" "}
              <Link href={buildHref("/casos", { q, materia, vista: "lista" }, 1)} className="font-medium text-accent underline underline-offset-4">Ver la lista</Link>
            </p>
          )}
          <Kanban cases={shown} onMove={move} />
        </>
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
      {view === "lista" && <Paginacion total={total} page={page} pageSize={pageSize} basePath="/casos" params={keep} noun="casos" />}
      {dialog}
    </>
  );
}
