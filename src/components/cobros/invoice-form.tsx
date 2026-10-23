"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { TextWithDictation } from "@/components/ui/text-with-dictation";
import { fail, ok } from "@/components/ui/undo-toast";
import { createInvoice, getPendingHours } from "@/app/(app)/cobros/actions";
import { fmtMoney } from "@/lib/format";
import { fromCents, lineCents } from "@/lib/cobros/money";
import { hoursToItems } from "@/lib/cobros/time";
import { invoiceSchema } from "@/lib/cobros/schemas";

interface Row { key: number; description: string; quantity: string; unit_price: string; entryId?: string }
const num = (s: string) => Number(s.replace(",", ".")) || 0;

export function InvoiceForm({
  clients, cases, today, defaultCurrency, initialClientId, initialCaseId,
}: {
  clients: { id: string; full_name: string }[];
  cases: { id: string; title: string; client_id: string }[];
  today: string;
  defaultCurrency: "BOB" | "USD";
  initialClientId?: string;
  initialCaseId?: string;
}) {
  const router = useRouter();
  const seq = React.useRef(1);
  const initialCase = cases.find((c) => c.id === initialCaseId);
  const [clientId, setClientId] = React.useState(initialCase?.client_id ?? (clients.some((c) => c.id === initialClientId) ? initialClientId! : ""));
  const [caseId, setCaseId] = React.useState(initialCase?.id ?? "");
  const [currency, setCurrency] = React.useState<"BOB" | "USD">(defaultCurrency);
  const [issue, setIssue] = React.useState(today);
  const [due, setDue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([{ key: 0, description: "", quantity: "1", unit_price: "" }]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loadingHours, setLoadingHours] = React.useState(false);

  const clientCases = cases.filter((c) => !clientId || c.client_id === clientId);
  const totalCents = rows.reduce((s, r) => s + lineCents(num(r.quantity), num(r.unit_price)), 0);

  const setRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /** Al cambiar de caso se quitan las horas traídas del caso anterior. */
  function changeCase(id: string) {
    setCaseId(id);
    setRows((rs) => {
      const kept = rs.filter((r) => !r.entryId);
      return kept.length ? kept : [{ key: seq.current++, description: "", quantity: "1", unit_price: "" }];
    });
  }

  async function addHours() {
    setLoadingHours(true);
    const res = await getPendingHours(caseId);
    setLoadingHours(false);
    if (!res.ok) return fail(res.error);
    const used = new Set(rows.map((r) => r.entryId));
    const fresh = hoursToItems(res.entries.filter((e) => !used.has(e.id)));
    if (!fresh.length) return ok(res.entries.length ? "Esas horas ya están en la lista." : "Este caso no tiene horas pendientes de cobro.");
    setRows((rs) => {
      const base = rs.filter((r) => r.description.trim() || num(r.unit_price));
      return [
        ...base,
        ...fresh.map((f) => ({ key: seq.current++, description: f.description, quantity: String(f.quantity), unit_price: String(f.unit_price), entryId: f.time_entry_id })),
      ];
    });
    ok(`Se agregaron ${fresh.length} ${fresh.length === 1 ? "entrada de horas" : "entradas de horas"}.`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      client_id: clientId,
      case_id: caseId || null,
      currency,
      issue_date: issue,
      due_date: due || null,
      notes: notes.trim() || null,
      items: rows.map((r) => ({ description: r.description, quantity: num(r.quantity), unit_price: num(r.unit_price) })),
      time_entry_ids: rows.flatMap((r) => (r.entryId ? [r.entryId] : [])),
    };
    if (!clientId) return setError("Elige un cliente.");
    const v = invoiceSchema.safeParse(payload);
    if (!v.success) return setError(v.error.issues[0]?.message ?? "Revisa los datos.");
    setBusy(true);
    const res = await createInvoice(payload);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    ok(`Cobro ${res.number} creado como borrador.`);
    router.push(`/cobros/${res.id}`);
  }

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6">
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" htmlFor="c-cliente">
          <Select id="c-cliente" value={clientId} onChange={(e) => { setClientId(e.target.value); changeCase(""); }} required>
            <option value="">Elige un cliente…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Caso (opcional)" htmlFor="c-caso">
          <Select id="c-caso" value={caseId} onChange={(e) => changeCase(e.target.value)}>
            <option value="">Sin caso</option>
            {clientCases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </Field>
        <Field label="Moneda" htmlFor="c-moneda">
          <Select id="c-moneda" value={currency} onChange={(e) => setCurrency(e.target.value as "BOB" | "USD")}>
            <option value="BOB">Bolivianos (Bs)</option>
            <option value="USD">Dólares ($us)</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha" htmlFor="c-fecha"><Input id="c-fecha" type="date" value={issue} onChange={(e) => setIssue(e.target.value)} required /></Field>
          <Field label="Vence (opcional)" htmlFor="c-vence"><Input id="c-vence" type="date" value={due} min={issue} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[length:var(--text-subheading)] font-semibold">Ítems</h2>
          <Button variant="outline" size="sm" disabled={!caseId || loadingHours} onClick={addHours}>
            <Clock size={18} aria-hidden /> {loadingHours ? "Buscando…" : "Agregar horas pendientes del caso"}
          </Button>
        </div>
        {!caseId && <p className="-mt-2 text-ink-3 text-[length:var(--text-body-sm)]">Elige un caso para poder traer sus horas pendientes.</p>}

        <ul className="grid gap-4">
          {rows.map((r, idx) => (
            <li key={r.key} className="grid gap-3 rounded-[var(--radius-btn)] border border-line p-3 sm:grid-cols-[1fr_6rem_8rem_auto] sm:items-end">
              <Field label={`Descripción ${idx + 1}`} htmlFor={`d-${r.key}`}>
                <Input id={`d-${r.key}`} value={r.description} onChange={(e) => setRow(r.key, { description: e.target.value })} placeholder="Ej.: Honorarios por redacción de demanda" />
              </Field>
              <Field label="Cantidad" htmlFor={`q-${r.key}`}>
                <Input id={`q-${r.key}`} inputMode="decimal" value={r.quantity} onChange={(e) => setRow(r.key, { quantity: e.target.value })} />
              </Field>
              <Field label="Precio" htmlFor={`p-${r.key}`}>
                <Input id={`p-${r.key}`} inputMode="decimal" value={r.unit_price} onChange={(e) => setRow(r.key, { unit_price: e.target.value })} placeholder="0.00" />
              </Field>
              <Button
                variant="ghost"
                aria-label={`Quitar ítem ${idx + 1}`}
                disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              >
                <Trash2 size={18} aria-hidden /> Quitar
              </Button>
              <p className="text-ink-2 text-[length:var(--text-body-sm)] sm:col-span-4">
                Subtotal: <span className="tabular-nums">{fmtMoney(fromCents(lineCents(num(r.quantity), num(r.unit_price))), currency)}</span>
                {r.entryId && " · viene de tus horas"}
              </p>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, { key: seq.current++, description: "", quantity: "1", unit_price: "" }])}>
            <Plus size={18} aria-hidden /> Agregar otro ítem
          </Button>
        </div>
        <p className="border-t border-line pt-4 text-right text-[length:var(--text-heading-sm)] font-semibold" aria-live="polite">
          Total: <span className="tabular-nums">{fmtMoney(fromCents(totalCents), currency)}</span>
        </p>
      </Card>

      <Card>
        <Field label="Notas (opcional)" htmlFor="c-notas" hint="Datos de pago, condiciones u otra aclaración. Saldrá en la hoja impresa.">
          <TextWithDictation id="c-notas" value={notes} onChange={setNotes} rows={3} />
        </Field>
      </Card>

      <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar cobro"}</Button>
        <Button asChild variant="ghost"><Link href="/cobros">Cancelar</Link></Button>
      </div>
    </form>
  );
}
