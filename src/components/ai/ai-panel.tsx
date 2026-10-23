"use client";
import * as React from "react";
import { X, Sparkles } from "lucide-react";

export const AI_DISCLAIMER = "No reemplaza la verificación oficial en la Gaceta Oficial de Bolivia.";

/** Panel lateral de IA (Sprint 3 lo reemplaza con el asistente real). */
export function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <aside
      aria-label="Asistente legal"
      className="enter fixed inset-y-0 right-0 z-40 flex w-[min(100vw,26rem)] flex-col border-l border-line bg-surface"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="flex items-center gap-2 text-[length:var(--text-subheading)]">
          <Sparkles size={20} aria-hidden /> Asistente legal
        </h2>
        <button onClick={onClose} aria-label="Cerrar asistente" className="press grid size-11 cursor-pointer place-items-center rounded-lg hover:bg-surface-2">
          <X size={22} aria-hidden />
        </button>
      </div>
      <div className="p-5 text-ink-2">
        <p>{AI_DISCLAIMER}</p>
      </div>
    </aside>
  );
}
