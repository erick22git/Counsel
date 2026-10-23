"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { toastWithUndo, fail } from "@/components/ui/undo-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentDialog, KIND_LABEL, type CaseOption } from "./appointment-dialog";
import { setAppointmentStatus } from "@/app/(app)/agenda/actions";
import {
  WEEKDAYS_SHORT, fmtDayLong, fmtDayRelative, fmtMonthTitle, fmtTimeRange, monthGrid, parseKey, shiftMonth, todayKey,
} from "@/lib/agenda/dates";
import { groupAppointments, indexByDay, isDeadlineSoon, type DayGroup } from "@/lib/agenda/group";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/db/types";

type View = "lista" | "mes";

const KIND_TONE = { audiencia: "accent", cita: "ok", plazo: "neutral" } as const;

export function AgendaView({
  appointments,
  cases,
  openNew,
  presetCaseId,
}: {
  appointments: Appointment[];
  cases: CaseOption[];
  openNew: boolean;
  presetCaseId: string;
}) {
  const [view, setView] = React.useState<View>("lista");
  const [dialogOpen, setDialogOpen] = React.useState(openNew || !!presetCaseId);
  const [editing, setEditing] = React.useState<Appointment | null>(null);
  const [newDate, setNewDate] = React.useState<string | undefined>();
  const now = React.useMemo(() => new Date(), []);
  const caseTitle = React.useMemo(() => new Map(cases.map((c) => [c.id, c.title])), [cases]);

  const openCreate = (date?: string) => {
    setEditing(null);
    setNewDate(date);
    setDialogOpen(true);
  };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setDialogOpen(true);
  };

  async function change(a: Appointment, status: Appointment["status"], message: string) {
    const res = await setAppointmentStatus(a.id, status);
    if (!res.ok) return fail(res.error);
    toastWithUndo(message, async () => {
      const back = await setAppointmentStatus(a.id, a.status);
      if (!back.ok) fail(back.error);
    });
  }

  const rowProps = {
    now,
    caseTitle,
    onEdit: openEdit,
    onDone: (a: Appointment) => change(a, "realizada", "Marcada como realizada"),
    onDelete: (a: Appointment) => change(a, "cancelada", "Cita eliminada"),
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="mb-0" aria-label="Forma de ver la agenda">
            <TabsTrigger value="lista">Lista por día</TabsTrigger>
            <TabsTrigger value="mes">Mes</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="primary" onClick={() => openCreate()}>
          <Plus size={20} aria-hidden /> Nueva cita
        </Button>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          title="Tu agenda está vacía"
          description="Agrega tu próxima audiencia, cita o plazo para que no se te pase."
          action={<Button variant="secondary" onClick={() => openCreate()}>Agregar la primera</Button>}
        />
      ) : view === "lista" ? (
        <ListView appointments={appointments} {...rowProps} />
      ) : (
        <MonthView appointments={appointments} onNew={openCreate} {...rowProps} />
      )}

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        cases={cases}
        presetCaseId={presetCaseId}
        defaultDate={newDate}
      />
    </div>
  );
}

interface RowHandlers {
  now: Date;
  caseTitle: Map<string, string>;
  onEdit: (a: Appointment) => void;
  onDone: (a: Appointment) => void;
  onDelete: (a: Appointment) => void;
}

function ListView({ appointments, ...h }: { appointments: Appointment[] } & RowHandlers) {
  const g = groupAppointments(appointments, h.now);
  const sections: { title: string; days: DayGroup<Appointment>[] }[] = [
    { title: "Hoy", days: g.hoy },
    { title: "Mañana", days: g.manana },
    { title: "Esta semana", days: g.semana },
    { title: "Más adelante", days: g.despues },
  ];
  const upcomingCount = sections.reduce((n, s) => n + s.days.length, 0);
  return (
    <div className="grid gap-8">
      {upcomingCount === 0 && (
        <p className="text-ink-2">No tienes nada programado desde hoy. Lo que ya pasó está abajo.</p>
      )}
      {sections.map(
        (s) =>
          s.days.length > 0 && (
            <section key={s.title} aria-label={s.title} className="grid gap-3">
              <h2 className="text-[length:var(--text-heading-sm)]">{s.title}</h2>
              {s.days.map((d) => (
                <DaySection key={d.key} day={d} showDayTitle={s.title !== "Hoy" && s.title !== "Mañana"} {...h} />
              ))}
            </section>
          )
      )}
      {g.pasadas.length > 0 && (
        <details className="group">
          <summary className="press flex min-h-11 cursor-pointer items-center text-[length:var(--text-heading-sm)] font-semibold">
            Pasadas ({g.pasadas.reduce((n, d) => n + d.items.length, 0)})
          </summary>
          <div className="mt-3 grid gap-3">
            {g.pasadas.map((d) => (
              <DaySection key={d.key} day={d} showDayTitle {...h} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function DaySection({ day, showDayTitle, ...h }: { day: DayGroup<Appointment>; showDayTitle: boolean } & RowHandlers) {
  return (
    <div className="grid gap-2">
      {showDayTitle && <h3 className="text-ink-2 font-medium">{fmtDayRelative(day.key, h.now)}</h3>}
      {day.items.map((a) => (
        <AppointmentRow key={a.id} a={a} {...h} />
      ))}
    </div>
  );
}

function AppointmentRow({ a, now, caseTitle, onEdit, onDone, onDelete }: { a: Appointment } & RowHandlers) {
  const soon = isDeadlineSoon(a, now);
  const done = a.status === "realizada";
  return (
    <Card className={cn("grid gap-3 p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center", done && "opacity-75")}>
      <p className="text-[length:var(--text-subheading)] font-semibold tabular-nums">{fmtTimeRange(a.starts_at, a.ends_at)}</p>
      <div className="grid gap-1">
        <p className="text-[length:var(--text-subheading)] font-medium">{a.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={KIND_TONE[a.kind]}>{KIND_LABEL[a.kind].split(" (")[0]}</Pill>
          {soon && <Pill tone="warn">Plazo próximo</Pill>}
          {done && <Pill tone="ok">Realizada</Pill>}
          {a.visible_to_client && <Pill>Visible al cliente</Pill>}
        </div>
        {(a.case_id || a.location) && (
          <p className="text-ink-2">
            {a.case_id && caseTitle.get(a.case_id)}
            {a.case_id && a.location && " · "}
            {a.location}
          </p>
        )}
        {a.notes && <p className="text-ink-3 line-clamp-2">{a.notes}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!done && (
          <Button size="sm" variant="secondary" onClick={() => onDone(a)}>Marcar realizada</Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(a)}>Editar</Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(a)}>Eliminar</Button>
      </div>
    </Card>
  );
}

function MonthView({ appointments, onNew, ...h }: { appointments: Appointment[]; onNew: (date?: string) => void } & RowHandlers) {
  const today = todayKey(h.now);
  const t = parseKey(today);
  const [ym, setYm] = React.useState({ year: t.y, month: t.m });
  const [selected, setSelected] = React.useState(today);
  const byDay = React.useMemo(() => indexByDay(appointments), [appointments]);
  const grid = monthGrid(ym.year, ym.month);
  const go = (delta: number) => setYm((c) => shiftMonth(c.year, c.month, delta));
  const dayItems = byDay.get(selected) ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={() => go(-1)}>Mes anterior</Button>
        <h2 className="text-[length:var(--text-heading-sm)]">{fmtMonthTitle(ym.year, ym.month)}</h2>
        <Button variant="outline" onClick={() => go(1)}>Mes siguiente</Button>
      </div>
      <Card className="p-2 sm:p-4">
        <div role="grid" aria-label={fmtMonthTitle(ym.year, ym.month)} className="grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT.map((w) => (
            <div key={w} role="columnheader" className="py-1 text-center text-[length:var(--text-body-sm)] font-medium text-ink-2">{w}</div>
          ))}
          {grid.flat().map((c) => {
            const items = byDay.get(c.key) ?? [];
            const isSel = c.key === selected;
            return (
              <button
                key={c.key}
                type="button"
                role="gridcell"
                aria-selected={isSel}
                aria-label={`${fmtDayLong(c.key, h.now)}${items.length ? `, ${items.length} ${items.length === 1 ? "cita" : "citas"}` : ""}`}
                onClick={() => setSelected(c.key)}
                className={cn(
                  "press flex min-h-[4.25rem] flex-col items-start gap-1 rounded-lg border p-1.5 text-left sm:min-h-[5.5rem] sm:p-2",
                  c.inMonth ? "border-line bg-surface" : "border-transparent bg-surface-2 text-ink-3",
                  c.key === today && "border-accent",
                  isSel && "bg-accent-soft ring-2 ring-accent"
                )}
              >
                <span className={cn("font-semibold", c.key === today && "text-accent")}>{c.day}</span>
                {items.length > 0 && (
                  <span className="rounded-full bg-sand px-2 text-[length:var(--text-caption)] font-medium text-ink">
                    {items.length} {items.length === 1 ? "cita" : "citas"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
      <section aria-live="polite" className="grid gap-3">
        <h3 className="text-[length:var(--text-subheading)] font-semibold">{fmtDayLong(selected, h.now)}</h3>
        {dayItems.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-ink-2">Nada programado este día.</p>
            <Button size="sm" variant="outline" onClick={() => onNew(selected)}>Agregar en este día</Button>
          </div>
        ) : (
          dayItems.map((a) => <AppointmentRow key={a.id} a={a} {...h} />)
        )}
      </section>
    </div>
  );
}
