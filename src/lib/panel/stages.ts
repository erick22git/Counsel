import { STAGES } from "@/lib/format";

/** Cuenta casos por etapa (sin cerrados), en el orden de STAGES. */
export function countByStage(rows: { stage: string }[]) {
  return STAGES.filter((s) => s.id !== "cerrado").map((s) => ({
    id: s.id,
    label: s.label,
    count: rows.filter((r) => r.stage === s.id).length,
  }));
}
