"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { ok } from "@/components/ui/undo-toast";
import { createCaseAction } from "@/app/(app)/casos/actions";
import { createClientAction } from "@/app/(app)/clientes/actions";
import { MATTERS } from "@/lib/format";

export interface ClientOption { id: string; full_name: string }

export function NuevoCasoDialog({
  open, onOpenChange, clients, presetClientId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clients: ClientOption[];
  presetClientId?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent title="Nuevo caso" description="Empieza con lo básico; el resto lo puedes completar después.">
          <CasoForm clients={clients} presetClientId={presetClientId} onDone={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function CasoForm({ clients, presetClientId, onDone }: { clients: ClientOption[]; presetClientId?: string | null; onDone: () => void }) {
  const router = useRouter();
  const valid = presetClientId && clients.some((c) => c.id === presetClientId) ? presetClientId : "";
  const [f, setF] = React.useState({ title: "", client_id: valid, matter: "civil", court: "", opponent: "", case_number: "", description: "" });
  const [quick, setQuick] = React.useState(clients.length === 0);
  const [qName, setQName] = React.useState("");
  const [qPhone, setQPhone] = React.useState("");
  const [extra, setExtra] = React.useState<ClientOption[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const options = [...clients, ...extra].sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));

  async function saveQuickClient() {
    setBusy(true);
    setError(null);
    const r = await createClientAction({ kind: "persona", full_name: qName, phone: qPhone });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setExtra((p) => [...p, { id: r.id, full_name: qName.trim() }]);
    set("client_id", r.id);
    setQuick(false);
    setQName("");
    setQPhone("");
    ok("Cliente creado");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await createCaseAction(f);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    ok("Caso creado");
    router.refresh();
    onDone();
    router.push(`/casos/${r.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Título del caso" htmlFor="n-title" hint="Por ejemplo: Divorcio de Pérez o Cobro de deuda a Textil Andina.">
        <Input id="n-title" value={f.title} onChange={(e) => set("title", e.target.value)} required autoFocus autoComplete="off" />
      </Field>

      {quick ? (
        <fieldset className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2 p-4">
          <legend className="px-1 font-medium">Cliente nuevo</legend>
          <Field label="Nombre del cliente" htmlFor="q-name">
            <Input id="q-name" value={qName} onChange={(e) => setQName(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Teléfono (opcional)" htmlFor="q-phone">
            <Input id="q-phone" type="tel" inputMode="tel" value={qPhone} onChange={(e) => setQPhone(e.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={saveQuickClient} disabled={busy || qName.trim().length < 2}>Guardar cliente</Button>
            {options.length > 0 && <Button variant="ghost" onClick={() => setQuick(false)}>Elegir uno que ya existe</Button>}
          </div>
        </fieldset>
      ) : (
        <Field label="Cliente" htmlFor="n-client">
          <Select id="n-client" value={f.client_id} onChange={(e) => set("client_id", e.target.value)} required>
            <option value="">Elige un cliente…</option>
            {options.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
          <div><Button variant="ghost" size="sm" onClick={() => setQuick(true)}>El cliente no está en la lista: crear uno nuevo</Button></div>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Materia" htmlFor="n-matter">
          <Select id="n-matter" value={f.matter} onChange={(e) => set("matter", e.target.value)}>
            {Object.entries(MATTERS).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Número de expediente" htmlFor="n-num">
          <Input id="n-num" value={f.case_number} onChange={(e) => set("case_number", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Juzgado" htmlFor="n-court">
          <Input id="n-court" value={f.court} onChange={(e) => set("court", e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Parte contraria" htmlFor="n-opp">
          <Input id="n-opp" value={f.opponent} onChange={(e) => set("opponent", e.target.value)} autoComplete="off" />
        </Field>
      </div>
      <Field label="Descripción" htmlFor="n-desc" hint="Puedes dictarla con el micrófono.">
        <TextWithDictation id="n-desc" value={f.description} onChange={(v) => set("description", v)} />
      </Field>
      <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={busy || quick}>{busy ? "Guardando…" : "Crear caso"}</Button>
      </div>
    </form>
  );
}
