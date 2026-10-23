// Lógica pura del tablero de casos (sin React ni base de datos): agrupar por etapa y calcular `position`.
import type { Case, Stage } from "@/lib/db/types";

export const STAGE_IDS: Stage[] = ["nuevo", "en_tramite", "audiencia", "resolucion", "cerrado"];
/** Separación entre posiciones cuando solo hay un vecino (o ninguno). */
export const POSITION_STEP = 1000;
/** Si la diferencia entre vecinos es menor a esto, conviene renumerar la columna. */
export const MIN_GAP = 1e-7;

type Positioned = Pick<Case, "id" | "stage" | "position">;

/** Posición para insertar entre dos vecinos (null = no hay vecino de ese lado). */
export function positionBetween(prev: number | null, next: number | null): number {
  if (prev == null && next == null) return POSITION_STEP;
  if (prev == null) return next! - POSITION_STEP;
  if (next == null) return prev + POSITION_STEP;
  return (prev + next) / 2;
}

/** Agrupa por etapa y ordena por position (desempate estable por id). Siempre devuelve las 5 etapas. */
export function groupByStage<T extends Positioned>(cases: T[]): Record<Stage, T[]> {
  const out = { nuevo: [], en_tramite: [], audiencia: [], resolucion: [], cerrado: [] } as Record<Stage, T[]>;
  for (const c of cases) (out[c.stage] ?? out.nuevo).push(c);
  for (const s of STAGE_IDS) out[s].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  return out;
}

/** Posición al insertar en `column` (ya sin la tarjeta que se mueve) en el índice `index`. */
export function positionAtIndex(column: Pick<Case, "position">[], index: number): number {
  const i = Math.max(0, Math.min(index, column.length));
  const prev = i > 0 ? column[i - 1].position : null;
  const next = i < column.length ? column[i].position : null;
  return positionBetween(prev, next);
}

export interface MoveTarget {
  stage: Stage;
  /** Tarjeta sobre la que se soltó; null/undefined = al final de la columna. */
  overId?: string | null;
}

export interface MovePlan {
  stage: Stage;
  position: number;
  index: number;
  fromStage: Stage;
  changed: boolean;
}

/**
 * Calcula a dónde va una tarjeta. Soltar sobre otra tarjeta deja la movida en el lugar de esa tarjeta
 * (igual que arrayMove de dnd-kit); sin tarjeta destino va al final de la columna.
 */
export function planMove<T extends Positioned>(cases: T[], activeId: string, target: MoveTarget): MovePlan | null {
  const active = cases.find((c) => c.id === activeId);
  if (!active) return null;
  const column = groupByStage(cases)[target.stage];
  const withoutActive = column.filter((c) => c.id !== activeId);
  const currentIndex = column.findIndex((c) => c.id === activeId);
  let index = withoutActive.length;
  if (target.overId === activeId) {
    index = Math.max(currentIndex, 0);
  } else if (target.overId) {
    const overIdx = column.findIndex((c) => c.id === target.overId);
    if (overIdx >= 0) index = overIdx;
  }
  index = Math.max(0, Math.min(index, withoutActive.length));
  const position = positionAtIndex(withoutActive, index);
  const changed = active.stage !== target.stage || currentIndex !== index;
  return { stage: target.stage, position, index, fromStage: active.stage, changed };
}

/** Para "Mover a…": va al final de la etapa elegida. */
export function planMoveToStageEnd<T extends Positioned>(cases: T[], activeId: string, stage: Stage): MovePlan | null {
  return planMove(cases, activeId, { stage, overId: null });
}

/** ¿Los vecinos quedaron tan juntos que hay que renumerar la columna? */
export function needsRebalance(column: Pick<Case, "position">[]): boolean {
  for (let i = 1; i < column.length; i++) if (column[i].position - column[i - 1].position < MIN_GAP) return true;
  return false;
}

/** Renumera una columna ordenada: 1000, 2000, … */
export function rebalance<T extends Pick<Case, "id">>(column: T[]): { id: string; position: number }[] {
  return column.map((c, i) => ({ id: c.id, position: (i + 1) * POSITION_STEP }));
}

/** Aplica un plan a la lista local (actualización optimista). */
export function applyPlan<T extends Positioned>(cases: T[], activeId: string, plan: Pick<MovePlan, "stage" | "position">): T[] {
  return cases.map((c) => (c.id === activeId ? { ...c, stage: plan.stage, position: plan.position } : c));
}

export function stageLabel(stages: { id: string; label: string }[], id: string): string {
  return stages.find((s) => s.id === id)?.label ?? id;
}
