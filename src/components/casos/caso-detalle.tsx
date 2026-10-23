"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Switch from "@radix-ui/react-switch";
import {
  Archive, CalendarDays, ChevronLeft, CheckSquare, CreditCard, FileText, Flag, Gavel, MessageSquare, Pencil, Plus, Settings2, StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { fail, ok, toastWithUndo } from "@/components/ui/undo-toast";
import {
  addNoteAction, archiveCaseAction, changeStageAction, restoreCaseAction, setEventVisibilityAction,
  undoMoveAction, updateCaseAction,
} from "@/app/(app)/casos/actions";
import { fmtDate, fmtDateTime, MATTERS, STAGES } from "@/lib/format";
import type { Appointment, Case, CaseEvent, Doc, Task } from "@/lib/db/types";

const KIND: Record<CaseEvent["kind"], { label: string; Icon: typeof StickyNote }> = {
  nota: { label: "Nota", Icon: StickyNote },
  etapa: { label: "Cambio de etapa", Icon: Flag },
  documento: { label: "Documento", Icon: FileText },
  audiencia: { label: "Audiencia", Icon: Gavel },
  tarea: { label: "Tarea", Icon: CheckSquare },
  pago: { label: "Pago", Icon: CreditCard },
  mensaje: { label: "Mensaje", Icon: MessageSquare },
  sistema: { label: "Registro", Icon: Settings2 },
};

export function CasoDetalle({
  caso, clientName, events, appointments, tasks, documents,
}: {
  caso: Case;
  clientName: string;
  events: CaseEvent[];
  appointments: Appointment[];
  tasks: Task[];
  documents: Doc[];
}) {
  const router = useRouter();
  const [stage, setStage] = React.useState(caso.stage);

  async function onStage(next: string) {
    const prev = stage;
    setStage(next as Case["stage"]);
    const r = await changeStageAction(caso.id, next);
    if (!r.ok) { setStage(prev); return fail(r.error); }
    router.refresh();
    toastWithUndo(`Etapa: ${STAGES.find((s) => s.id === next)?.label}`, async () => {
      setStage(prev);
      const u = await undoMoveAction({ id: caso.id, stage: r.prev.stage, position: r.prev.position, fromStage: next }, r.eventId);
      if (!u.ok) fail(u.error);
      router.refresh();
    });
  }

  async function archive() {
    const r = await archiveCaseAction(caso.id);
    if (!r.ok) return fail(r.error);
    router.push("/casos");
    toastWithUndo(`“${caso.title}” se archivó`, async () => {
      const u = await restoreCaseAction(caso.id);
      if (!u.ok) { fail(u.error); return; }
      router.push(`/casos/${caso.id}`);
    });
  }

  return (
    <>
      <Link href="/casos" className="mb-3 inline-flex min-h-11 items-center gap-1 text-accent hover:underline">
        <ChevronLeft size={20} aria-hidden /> Todos los casos
      </Link>
      <PageHeader
        title={caso.title}
        subtitle={`Cliente: ${clientName}`}
        action={
          <div className="w-full min-w-56 sm:w-64">
            <Field label="Etapa del caso" htmlFor="etapa">
              <Select id="etapa" value={stage} onChange={(e) => void onStage(e.target.value)}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label} — {s.hint}</option>)}
              </Select>
            </Field>
          </div>
        }
      />
      {/*
        SLOT FUTURO (IA): aquí se agregará el botón "Preguntar a la IA sobre este caso".
        Colocar dentro de este contenedor; no implementado en el Sprint 1.
      */}
      <div id="slot-ia-caso" className="mb-4">
        <Button variant="secondary" onClick={() => window.dispatchEvent(new CustomEvent("counsel:open-ai", { detail: { mode: "caso" } }))}>
          Preguntar a la IA sobre este caso
        </Button>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList aria-label="Secciones del caso">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="linea">Línea de tiempo</TabsTrigger>
          <TabsTrigger value="agenda">Citas y tareas</TabsTrigger>
          <TabsTrigger value="docs">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen"><Resumen caso={caso} clientName={clientName} onArchive={archive} /></TabsContent>
        <TabsContent value="linea"><Linea caseId={caso.id} events={events} /></TabsContent>
        <TabsContent value="agenda"><Agenda caseId={caso.id} appointments={appointments} tasks={tasks} /></TabsContent>
        <TabsContent value="docs"><Docs caseId={caso.id} documents={documents} /></TabsContent>
      </Tabs>
    </>
  );
}

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-body-sm)] text-ink-3">{label}</dt>
      <dd className="break-words text-ink">{value || "—"}</dd>
    </div>
  );
}

function Resumen({ caso, clientName, onArchive }: { caso: Case; clientName: string; onArchive: () => void }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [desc, setDesc] = React.useState(caso.description ?? "");
  const [saved, setSaved] = React.useState(caso.description ?? "");
  const [visible, setVisible] = React.useState(caso.portal_visible);
  const [busy, setBusy] = React.useState(false);

  async function saveDesc() {
    setBusy(true);
    const r = await updateCaseAction(caso.id, { description: desc });
    setBusy(false);
    if (!r.ok) return fail(r.error);
    setSaved(desc.trim());
    setEditing(false);
    ok("Descripción guardada");
    router.refresh();
  }

  async function toggle(v: boolean) {
    setVisible(v);
    const r = await updateCaseAction(caso.id, { portal_visible: v });
    if (!r.ok) { setVisible(!v); return fail(r.error); }
    ok(v ? "El cliente ya puede ver este caso en su portal" : "El cliente ya no ve este caso en su portal");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="grid content-start gap-6">
        <Card>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato label="Cliente" value={<Link className="text-accent hover:underline" href={`/clientes/${caso.client_id}`}>{clientName}</Link>} />
            <Dato label="Materia" value={<Pill tone="neutral">{MATTERS[caso.matter] ?? caso.matter}</Pill>} />
            <Dato label="Número de expediente" value={caso.case_number} />
            <Dato label="Juzgado" value={caso.court} />
            <Dato label="Parte contraria" value={caso.opponent} />
            <Dato label="Abierto el" value={fmtDate(caso.opened_at)} />
          </dl>
        </Card>
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[length:var(--text-subheading)] font-semibold">Descripción</h2>
            {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden /> Editar descripción</Button>}
          </div>
          {editing ? (
            <div className="grid gap-3">
              <label htmlFor="desc" className="sr-only">Descripción del caso</label>
              <TextWithDictation id="desc" value={desc} onChange={setDesc} className="min-h-40" />
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={saveDesc} disabled={busy}>{busy ? "Guardando…" : "Guardar descripción"}</Button>
                <Button variant="ghost" onClick={() => { setDesc(saved); setEditing(false); }}>Cancelar</Button>
              </div>
            </div>
          ) : saved ? (
            <p className="whitespace-pre-wrap text-ink-2">{saved}</p>
          ) : (
            <p className="text-ink-3">Todavía no hay descripción. Escribe o dicta de qué trata el caso.</p>
          )}
        </Card>
      </div>

      <div className="grid content-start gap-6">
        <Card>
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="portal" className="font-medium">Visible para el cliente en su portal</label>
            <Switch.Root
              id="portal" checked={visible} onCheckedChange={toggle}
              className="press relative h-8 w-14 shrink-0 cursor-pointer rounded-full bg-line-strong transition-colors duration-150 data-[state=checked]:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Switch.Thumb className="block size-6 translate-x-1 rounded-full bg-surface transition-transform duration-150 data-[state=checked]:translate-x-7" />
            </Switch.Root>
          </div>
          <p className="mt-2 text-[length:var(--text-body-sm)] text-ink-2" aria-live="polite">
            {visible ? "Activado: tu cliente ve el estado del caso y las notas que marques para él." : "Desactivado: tu cliente no ve este caso."}
          </p>
        </Card>
        <Button variant="outline" onClick={onArchive}><Archive size={18} aria-hidden /> Archivar caso</Button>
      </div>
    </div>
  );
}

function Linea({ caseId, events }: { caseId: string; events: CaseEvent[] }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [local, setLocal] = React.useState<Record<string, boolean>>({});

  async function add() {
    setBusy(true);
    const r = await addNoteAction(caseId, body, visible);
    setBusy(false);
    if (!r.ok) return fail(r.error);
    setBody("");
    setVisible(false);
    ok("Nota agregada");
    router.refresh();
  }

  async function setVis(id: string, v: boolean) {
    setLocal((p) => ({ ...p, [id]: v }));
    const r = await setEventVisibilityAction(id, caseId, v);
    if (!r.ok) { setLocal((p) => ({ ...p, [id]: !v })); fail(r.error); }
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <Field label="Agregar una nota" htmlFor="nota" hint="Puedes dictarla con el micrófono.">
          <TextWithDictation id="nota" value={body} onChange={setBody} placeholder="Escribe lo que pasó en el caso…" />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          Mostrar al cliente
        </label>
        <div><Button variant="secondary" onClick={add} disabled={busy || !body.trim()}><Plus size={18} aria-hidden /> {busy ? "Guardando…" : "Guardar nota"}</Button></div>
      </Card>

      {events.length === 0 ? (
        <p className="text-ink-2">Todavía no hay movimientos en este caso.</p>
      ) : (
        <ol className="grid gap-3">
          {events.map((e) => {
            const { label, Icon } = KIND[e.kind] ?? KIND.sistema;
            const vis = local[e.id] ?? e.visible_to_client;
            return (
              <li key={e.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--text-body-sm)] text-ink-2">
                    <span className="inline-flex items-center gap-1.5 font-medium text-ink"><Icon size={18} aria-hidden /> {label}</span>
                    <time dateTime={e.happened_at}>{fmtDateTime(e.happened_at)}</time>
                    {vis && <Pill tone="ok">Lo ve el cliente</Pill>}
                  </div>
                  {e.kind !== "nota" && <p className="mt-1 font-medium">{e.title}</p>}
                  {e.body && <p className="mt-1 whitespace-pre-wrap text-ink-2">{e.body}</p>}
                  <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-[length:var(--text-body-sm)]">
                    <input type="checkbox" checked={vis} onChange={(ev) => void setVis(e.id, ev.target.checked)} className="size-5 accent-[var(--accent)]" />
                    Mostrar al cliente
                  </label>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function Agenda({ caseId, appointments, tasks }: { caseId: string; appointments: Appointment[]; tasks: Task[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="h-citas">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-citas" className="text-[length:var(--text-subheading)] font-semibold">Citas y audiencias</h2>
          <Button asChild variant="secondary" size="sm"><Link href={`/agenda?nuevo=1&caso=${caseId}`}><CalendarDays size={18} aria-hidden /> Agregar cita</Link></Button>
        </div>
        {appointments.length === 0 ? <p className="text-ink-2">No hay citas para este caso.</p> : (
          <ul className="grid gap-3">
            {appointments.map((a) => (
              <li key={a.id}>
                <Card className="p-4">
                  <Link href="/agenda" className="font-medium hover:text-accent">{a.title}</Link>
                  <p className="text-[length:var(--text-body-sm)] text-ink-2">{fmtDateTime(a.starts_at)}{a.location ? ` · ${a.location}` : ""}</p>
                  <div className="mt-2 flex gap-2">
                    <Pill tone="neutral">{a.kind === "audiencia" ? "Audiencia" : a.kind === "plazo" ? "Plazo" : "Cita"}</Pill>
                    {a.status !== "programada" && <Pill tone={a.status === "realizada" ? "ok" : "danger"}>{a.status === "realizada" ? "Realizada" : "Cancelada"}</Pill>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="h-tareas">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="h-tareas" className="text-[length:var(--text-subheading)] font-semibold">Tareas</h2>
          <Button asChild variant="secondary" size="sm"><Link href={`/tareas?nuevo=1&caso=${caseId}`}><CheckSquare size={18} aria-hidden /> Agregar tarea</Link></Button>
        </div>
        {tasks.length === 0 ? <p className="text-ink-2">No hay tareas para este caso.</p> : (
          <ul className="grid gap-3">
            {tasks.map((t) => (
              <li key={t.id}>
                <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <Link href="/tareas" className={t.done_at ? "text-ink-3 line-through" : "font-medium hover:text-accent"}>{t.title}</Link>
                  <span className="text-[length:var(--text-body-sm)] text-ink-2">{t.done_at ? "Hecha" : t.due_at ? `Vence ${fmtDate(t.due_at)}` : "Sin fecha"}</span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Docs({ caseId, documents }: { caseId: string; documents: Doc[] }) {
  return (
    <section aria-labelledby="h-docs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="h-docs" className="text-[length:var(--text-subheading)] font-semibold">Documentos del caso</h2>
        <Button asChild variant="secondary" size="sm"><Link href={`/documentos?caso=${caseId}`}><FileText size={18} aria-hidden /> Ver en Documentos</Link></Button>
      </div>
      {documents.length === 0 ? <p className="text-ink-2">Este caso aún no tiene documentos.</p> : (
        <ul className="grid gap-3">
          {documents.map((d) => (
            <li key={d.id}>
              <Card className="flex flex-wrap items-center justify-between gap-2 p-4">
                <Link href={`/documentos?caso=${caseId}`} className="font-medium hover:text-accent">{d.title}</Link>
                <span className="text-[length:var(--text-body-sm)] text-ink-2">
                  {d.kind === "escrito" ? "Escrito" : "Archivo"} · {fmtDate(d.updated_at)}
                </span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
