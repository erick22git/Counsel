"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { ok } from "@/components/ui/undo-toast";
import { createClientAction, updateClientAction } from "@/app/(app)/clientes/actions";
import type { Client } from "@/lib/db/types";

type Form = { kind: "persona" | "empresa"; full_name: string; ci_nit: string; email: string; phone: string; address: string; notes: string };

const empty: Form = { kind: "persona", full_name: "", ci_nit: "", email: "", phone: "", address: "", notes: "" };

function fromClient(c: Client | null | undefined): Form {
  if (!c) return empty;
  return {
    kind: c.kind, full_name: c.full_name, ci_nit: c.ci_nit ?? "", email: c.email ?? "",
    phone: c.phone ?? "", address: c.address ?? "", notes: c.notes ?? "",
  };
}

/** Crear o editar un cliente. Si recibe `cliente` edita; si no, crea. */
export function ClienteDialog({
  open, onOpenChange, cliente, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cliente?: Client | null;
  onSaved?: (id: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent
          title={cliente ? "Editar cliente" : "Nuevo cliente"}
          description="Solo el nombre es obligatorio. Lo demás lo puedes completar después."
        >
          <ClienteForm cliente={cliente} onDone={(id) => { onOpenChange(false); onSaved?.(id); }} />
        </DialogContent>
      )}
    </Dialog>
  );
}

function ClienteForm({ cliente, onDone }: { cliente?: Client | null; onDone: (id: string) => void }) {
  const router = useRouter();
  const [f, setF] = React.useState<Form>(() => fromClient(cliente));
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = cliente ? await updateClientAction(cliente.id, f) : await createClientAction(f);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    ok(cliente ? "Cambios guardados" : "Cliente guardado");
    router.refresh();
    onDone(cliente ? cliente.id : (r as unknown as { id: string }).id);
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <Field label="Tipo de cliente" htmlFor="c-kind">
        <Select id="c-kind" value={f.kind} onChange={(e) => set("kind", e.target.value as Form["kind"])}>
          <option value="persona">Persona</option>
          <option value="empresa">Empresa</option>
        </Select>
      </Field>
      <Field label={f.kind === "empresa" ? "Razón social" : "Nombre completo"} htmlFor="c-name">
        <Input id="c-name" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} required autoFocus autoComplete="off" />
      </Field>
      <Field label={f.kind === "empresa" ? "NIT" : "Cédula de identidad (CI)"} htmlFor="c-ci">
        <Input id="c-ci" value={f.ci_nit} onChange={(e) => set("ci_nit", e.target.value)} autoComplete="off" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="c-phone">
          <Input id="c-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Correo electrónico" htmlFor="c-email">
          <Input id="c-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
      </div>
      <Field label="Dirección" htmlFor="c-addr">
        <Input id="c-addr" value={f.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <Field label="Notas" htmlFor="c-notes" hint="Puedes dictarlas con el micrófono.">
        <TextWithDictation id="c-notes" value={f.notes} onChange={(v) => set("notes", v)} />
      </Field>
      <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar cliente"}</Button>
      </div>
    </form>
  );
}
