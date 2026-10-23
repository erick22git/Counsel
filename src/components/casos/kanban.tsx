"use client";
import * as React from "react";
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, closestCorners, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, type Announcements,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useReducedMotion } from "framer-motion";
import { CasoCardBody, DragHandle, type CaseView } from "@/components/casos/caso-card";
import { groupByStage, planMove, STAGE_IDS } from "@/lib/casos/board";
import { STAGES } from "@/lib/format";
import type { Stage } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const colId = (s: Stage) => `col:${s}`;
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

function SortableCard({ c, onMove, reduce }: { c: CaseView; onMove: (id: string, s: Stage) => void; reduce: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: c.id,
    transition: reduce ? null : { duration: 200, easing: EASE },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <CasoCardBody
        c={c}
        onMove={(s) => onMove(c.id, s)}
        handle={
          <DragHandle
            label={`Mover la tarjeta ${c.title} con arrastre o con el teclado (espacio para tomarla, flechas para moverla)`}
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
          />
        }
      />
    </li>
  );
}

function Column({ stage, items, onMove, reduce }: { stage: Stage; items: CaseView[]; onMove: (id: string, s: Stage) => void; reduce: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: colId(stage) });
  const info = STAGES.find((s) => s.id === stage)!;
  return (
    <section
      aria-labelledby={`h-${stage}`}
      className={cn(
        "flex w-[19rem] shrink-0 snap-start flex-col rounded-[var(--radius-card)] border bg-surface-2 p-3 transition-colors duration-150 md:w-auto md:min-w-0 md:flex-1",
        isOver ? "border-accent" : "border-line"
      )}
    >
      <header className="mb-3 px-1">
        <h2 id={`h-${stage}`} className="flex items-center justify-between gap-2 text-[length:var(--text-subheading)] font-semibold">
          {info.label}
          <span className="rounded-full bg-surface px-2.5 text-[length:var(--text-body-sm)] font-medium text-ink-2">{items.length}</span>
        </h2>
        <p className="text-[length:var(--text-caption)] text-ink-3">{info.hint}</p>
      </header>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="grid min-h-24 flex-1 content-start gap-3">
          {items.map((c) => <SortableCard key={c.id} c={c} onMove={onMove} reduce={reduce} />)}
          {items.length === 0 && (
            <li className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-4 text-center text-[length:var(--text-body-sm)] text-ink-3">
              Sin casos. Suelta una tarjeta aquí.
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}

export function Kanban({
  cases, onMove,
}: {
  cases: CaseView[];
  /** Mueve un caso a una etapa/posición (el padre actualiza, guarda y ofrece Deshacer). */
  onMove: (id: string, stage: Stage, position: number) => void;
}) {
  const reduce = !!useReducedMotion();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const grouped = React.useMemo(() => groupByStage(cases), [cases]);
  const active = activeId ? cases.find((c) => c.id === activeId) ?? null : null;

  function targetOf(overId: string | number | undefined): { stage: Stage; overId: string | null } | null {
    if (overId == null) return null;
    const s = String(overId);
    if (s.startsWith("col:")) return { stage: s.slice(4) as Stage, overId: null };
    const over = cases.find((c) => c.id === s);
    return over ? { stage: over.stage, overId: over.id } : null;
  }

  function end(e: DragEndEvent) {
    setActiveId(null);
    const t = targetOf(e.over?.id);
    if (!t) return;
    const plan = planMove(cases, String(e.active.id), t);
    if (plan?.changed) onMove(String(e.active.id), plan.stage, plan.position);
  }

  const name = (id: string | number) => cases.find((c) => c.id === id)?.title ?? "tarjeta";
  const where = (id: string | number | undefined) => {
    const t = targetOf(id);
    return t ? STAGES.find((s) => s.id === t.stage)?.label : undefined;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Tomaste “${name(active.id)}”. Usa las flechas para moverla.`,
    onDragOver: ({ active, over }) => (over ? `“${name(active.id)}” está sobre la columna ${where(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `Soltaste “${name(active.id)}” en la columna ${where(over.id)}.` : `Soltaste “${name(active.id)}” sin moverla.`),
    onDragCancel: ({ active }) => `Cancelaste el movimiento de “${name(active.id)}”.`,
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable: "Para mover una tarjeta con el teclado: presiona espacio sobre “Arrastrar”, usa las flechas y presiona espacio otra vez para soltar. Escape cancela.",
        },
      }}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={end}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        {STAGE_IDS.map((s) => <Column key={s} stage={s} items={grouped[s]} onMove={(id, st) => {
          const plan = planMove(cases, id, { stage: st, overId: null });
          if (plan?.changed) onMove(id, plan.stage, plan.position);
        }} reduce={reduce} />)}
      </div>
      <DragOverlay dropAnimation={reduce ? null : { duration: 180, easing: EASE }}>
        {active ? <CasoCardBody c={active} onMove={() => {}} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
