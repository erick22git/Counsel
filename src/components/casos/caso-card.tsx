"use client";
import * as React from "react";
import Link from "next/link";
import { CalendarClock, ChevronDown, GripVertical } from "lucide-react";
import * as M from "@radix-ui/react-dropdown-menu";
import { Pill } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtDateTime, MATTERS, STAGES } from "@/lib/format";
import type { Case, Stage } from "@/lib/db/types";

export interface NextAppt { kind: string; title: string; starts_at: string }
export interface CaseView extends Case { client_name: string; next?: NextAppt | null }

const apptKind: Record<string, string> = { audiencia: "Audiencia", plazo: "Plazo", cita: "Cita" };

/** Menú "Mover a…" con texto: funciona sin arrastrar (teclado, móvil, 50+). */
export function MoveMenu({ current, onMove, label = "Mover a…" }: { current: Stage; onMove: (s: Stage) => void; label?: string }) {
  return (
    <M.Root>
      <M.Trigger asChild>
        <button
          type="button"
          className="press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--radius-btn)] border border-line-strong bg-surface px-3 text-[length:var(--text-body-sm)] text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent"
        >
          {label} <ChevronDown size={16} aria-hidden />
        </button>
      </M.Trigger>
      <M.Portal>
        <M.Content
          align="start" sideOffset={4}
          className="fade-in z-50 min-w-48 rounded-[var(--radius-card)] border border-line bg-surface p-1.5 shadow-[0_6px_10px_rgba(0,0,0,.04),0_2px_4px_rgba(0,0,0,.04)]"
        >
          {STAGES.map((s) => (
            <M.Item
              key={s.id}
              disabled={s.id === current}
              onSelect={() => onMove(s.id as Stage)}
              className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-3 text-ink outline-none data-[disabled]:cursor-default data-[disabled]:text-ink-3 data-[highlighted]:bg-surface-2"
            >
              {s.label}
              {s.id === current && <span className="text-[length:var(--text-caption)]">Aquí está</span>}
            </M.Item>
          ))}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

/** Contenido visual de una tarjeta (sin lógica de arrastre). */
export function CasoCardBody({
  c, onMove, handle, dragging,
}: {
  c: CaseView;
  onMove: (s: Stage) => void;
  handle?: React.ReactNode;
  dragging?: boolean;
}) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border bg-surface p-4", dragging ? "border-accent" : "border-line")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link href={`/casos/${c.id}`} className="block break-words font-semibold leading-snug text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
            {c.title}
          </Link>
          <p className="mt-0.5 break-words text-ink-2">{c.client_name}</p>
        </div>
        {handle}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pill tone="neutral">{MATTERS[c.matter] ?? c.matter}</Pill>
        {c.case_number && <span className="text-[length:var(--text-body-sm)] text-ink-2">Exp. {c.case_number}</span>}
      </div>
      {c.next && (
        <p className="mt-3 flex items-start gap-2 text-[length:var(--text-body-sm)] text-warn">
          <CalendarClock size={18} aria-hidden className="mt-0.5 shrink-0" />
          <span><span className="font-medium">{apptKind[c.next.kind] ?? "Cita"}:</span> {fmtDateTime(c.next.starts_at)}</span>
        </p>
      )}
      <div className="mt-3">
        <MoveMenu current={c.stage} onMove={onMove} />
      </div>
    </div>
  );
}

export const DragHandle = React.forwardRef<HTMLButtonElement, { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ label, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      {...rest}
      className="press -mr-1 -mt-1 inline-flex min-h-11 shrink-0 cursor-grab touch-none items-center gap-1 rounded-lg px-2 text-[length:var(--text-caption)] text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
    >
      <GripVertical size={18} aria-hidden /> Arrastrar
    </button>
  )
);
DragHandle.displayName = "DragHandle";
