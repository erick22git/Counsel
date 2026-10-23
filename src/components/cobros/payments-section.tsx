"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { fail, ok, toastWithUndo } from "@/components/ui/undo-toast";
import { addPayment, removePayment } from "@/app/(app)/cobros/actions";
import { fmtDate, fmtMoney } from "@/lib/format";
import { fromCents, toCents } from "@/lib/cobros/money";
import { PAYMENT_METHODS, methodLabel, type StoredStatus } from "@/lib/cobros/status";
import { paymentSchema } from "@/lib/cobros/schemas";

interface Pay { id: string; amount: number; method: string; paid_on: string; note: string | null }

export function PaymentsSection({
  invoiceId, currency, today, status, balanceCents, payments,
}: {
  invoiceId: string; currency: "BOB" | "USD"; today: string; status: StoredStatus; balanceCents: number; payments: Pay[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("efectivo");
  const [date, setDate] = React.useState(today);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const canPay = status !== "anulada" && balanceCents > 0;

  function onOpen(o: boolean) {
    setOpen(o);
    if (o) {
      setAmount(String(fromCents(balanceCents)));
      setMethod("efectivo");
      setDate(today);
      setNote("");
      setError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { invoice_id: invoiceId, amount: Number(amount.replace(",", ".")), method, paid_on: date, note: note.trim() || null };
    const v = paymentSchema.safeParse(payload);
    if (!v.success) return setError(v.error.issues[0]?.message ?? "Revisa los datos.");
    if (toCents(v.data.amount) > balanceCents) return setError(`El pago no puede ser mayor al saldo (${fmtMoney(fromCents(balanceCents), currency)}).`);
    setBusy(true);
    const r = await addPayment(payload);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setOpen(false);
    ok(r.nowPaid ? "Pago registrado. El cobro quedó pagado." : "Pago registrado.");
    router.refresh();
  }

  async function remove(p: Pay) {
    const r = await removePayment(p.id);
    if (!r.ok) return fail(r.error);
    router.refresh();
    toastWithUndo("Pago quitado.", async () => {
      const u = await addPayment(r.payment, { restore: true });
      if (!u.ok) { fail(u.error); return; }
      ok("Pago restaurado.");
      router.refresh();
    });
  }

  return (
    <section className="no-print mt-8 max-w-3xl" aria-labelledby="pagos-t">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="pagos-t" className="text-[length:var(--text-heading-sm)] font-semibold">Pagos</h2>
        {canPay && (
          <Dialog open={open} onOpenChange={onOpen}>
            <DialogTrigger asChild>
              <Button variant="primary"><Wallet size={20} aria-hidden /> Registrar pago</Button>
            </DialogTrigger>
            <DialogContent title="Registrar pago" description={`Saldo pendiente: ${fmtMoney(fromCents(balanceCents), currency)}`}>
              <form onSubmit={submit} className="grid gap-4">
                <Field label="Monto" htmlFor="p-monto"><Input id="p-monto" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
                <Field label="Método" htmlFor="p-metodo">
                  <Select id="p-metodo" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </Select>
                </Field>
                <Field label="Fecha del pago" htmlFor="p-fecha"><Input id="p-fecha" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} required /></Field>
                <Field label="Nota (opcional)" htmlFor="p-nota"><Input id="p-nota" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Comprobante 4521" /></Field>
                <p role="alert" aria-live="polite" className="text-danger empty:hidden">{error}</p>
                <div className="flex flex-wrap justify-end gap-3">
                  <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                  <Button type="submit" variant="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar pago"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {payments.length === 0 ? (
        <Card className="text-ink-2">Todavía no hay pagos registrados.</Card>
      ) : (
        <Card className="p-0">
          <ul>
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-0">
                <div>
                  <p className="font-medium tabular-nums">{fmtMoney(p.amount, currency)} · {methodLabel(p.method)}</p>
                  <p className="text-ink-2 text-[length:var(--text-body-sm)]">{fmtDate(p.paid_on)}{p.note ? ` · ${p.note}` : ""}</p>
                </div>
                {status !== "anulada" && (
                  <Button variant="ghost" size="sm" onClick={() => remove(p)} aria-label={`Quitar pago de ${fmtMoney(p.amount, currency)}`}>
                    <Trash2 size={18} aria-hidden /> Quitar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
