import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Card, Pill } from "@/components/ui/card";
import { InvoiceActions } from "@/components/cobros/invoice-actions";
import { PaymentsSection } from "@/components/cobros/payments-section";
import { fmtDate, fmtMoney } from "@/lib/format";
import { fromCents, lineCents, paymentsTotalCents } from "@/lib/cobros/money";
import { STATUS_LABEL, STATUS_TONE, todayLaPaz, type StoredStatus } from "@/lib/cobros/status";
import { toView } from "@/lib/cobros/summary";
import type { Client, Invoice, InvoiceItem, Payment } from "@/lib/db/types";

export const metadata = { title: "Cobro · Counsel" };

type Row = Invoice & { client: Client | null; case: { title: string; case_number: string | null } | null; invoice_items: InvoiceItem[]; payments: Payment[] };

export default async function CobroDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, firm } = await requireStaff();
  const { data: inv } = await supabase
    .from("invoices")
    .select("*, client:clients(*), case:cases(title, case_number), invoice_items(*), payments(*)")
    .eq("id", id)
    .maybeSingle<Row>();
  if (!inv) notFound();

  const items = [...(inv.invoice_items ?? [])];
  const payments = [...(inv.payments ?? [])].sort((a, b) => (a.paid_on < b.paid_on ? -1 : 1));
  const v = toView({
    id: inv.id, number: inv.number, status: inv.status as StoredStatus, currency: inv.currency, issue_date: inv.issue_date, due_date: inv.due_date,
    client_id: inv.client_id, case_id: inv.case_id, client_name: inv.client?.full_name ?? "—", case_title: inv.case?.title ?? null,
    items, payments,
  });
  const money = (c: number) => fmtMoney(fromCents(c), inv.currency);
  const c = inv.client;

  return (
    <>
      {/* En papel solo sale la hoja; el resto del shell ya lleva .no-print */}
      <style>{`@media print { main { max-width: none !important; padding: 0 !important; } .print-sheet { border: 0 !important; padding: 0 !important; background: #fff !important; color: #000 !important; } .print-sheet * { color: #000 !important; } }`}</style>

      <div className="no-print mb-4">
        <Link href="/cobros" className="inline-flex min-h-11 items-center gap-2 text-accent underline-offset-4 hover:underline">
          <ArrowLeft size={18} aria-hidden /> Volver a cobros
        </Link>
      </div>

      <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-[length:var(--text-heading)]">
            {inv.number} <Pill tone={STATUS_TONE[v.display]}>{STATUS_LABEL[v.display]}</Pill>
          </h1>
          <p className="mt-1 text-ink-2">{v.client_name}{v.case_title ? ` · ${v.case_title}` : ""}</p>
        </div>
        <InvoiceActions invoiceId={inv.id} status={inv.status as StoredStatus} />
      </div>

      <Card className="print-sheet max-w-3xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-[length:var(--text-heading-sm)] font-semibold">{firm.name}</p>
            <p className="text-ink-2">Cuenta de cobro</p>
          </div>
          <div className="text-right">
            <p className="text-[length:var(--text-heading-sm)] font-semibold">{inv.number}</p>
            <p className="text-ink-2">Fecha: {fmtDate(inv.issue_date)}</p>
            {inv.due_date && <p className="text-ink-2">Vence: {fmtDate(inv.due_date)}</p>}
          </div>
        </header>

        <section className="mb-6">
          <h2 className="text-ink-2 text-[length:var(--text-body-sm)] font-medium">Cliente</h2>
          <p className="font-medium">{c?.full_name ?? "—"}</p>
          {c?.ci_nit && <p>{c.kind === "empresa" ? "NIT" : "CI"}: {c.ci_nit}</p>}
          {c?.address && <p>{c.address}</p>}
          {(c?.email || c?.phone) && <p>{[c.email, c.phone].filter(Boolean).join(" · ")}</p>}
          {inv.case && <p className="mt-1 text-ink-2">Caso: {inv.case.title}{inv.case.case_number ? ` (${inv.case.case_number})` : ""}</p>}
        </section>

        <table className="w-full text-left">
          <caption className="sr-only">Ítems del cobro</caption>
          <thead className="border-b border-line text-ink-2 text-[length:var(--text-body-sm)]">
            <tr>
              <th scope="col" className="py-2 pr-2 font-medium">Descripción</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Cant.</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Precio</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-line align-top">
                <td className="py-2 pr-2">{i.description}</td>
                <td className="px-2 py-2 text-right tabular-nums">{Number(i.quantity)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtMoney(i.unit_price, inv.currency)}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{money(lineCents(i.quantity, i.unit_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-right">
          <dt className="text-[length:var(--text-subheading)] font-semibold">Total</dt>
          <dd className="text-[length:var(--text-subheading)] font-semibold tabular-nums">{money(v.total_cents)}</dd>
          <dt className="text-ink-2">Pagado</dt>
          <dd className="tabular-nums">{money(paymentsTotalCents(payments))}</dd>
          <dt className="font-medium">Saldo</dt>
          <dd className="font-medium tabular-nums">{money(v.balance_cents)}</dd>
        </dl>

        {inv.notes && (
          <section className="mt-6 border-t border-line pt-4">
            <h2 className="text-ink-2 text-[length:var(--text-body-sm)] font-medium">Notas</h2>
            <p className="whitespace-pre-wrap">{inv.notes}</p>
          </section>
        )}
        <p className="mt-6 text-ink-3 text-[length:var(--text-caption)]">Cuenta de cobro interna. No es una factura fiscal.</p>
      </Card>

      <PaymentsSection
        invoiceId={inv.id}
        currency={inv.currency}
        today={todayLaPaz()}
        status={inv.status as StoredStatus}
        balanceCents={v.balance_cents}
        payments={payments.map((p) => ({ id: p.id, amount: Number(p.amount), method: p.method, paid_on: p.paid_on, note: p.note }))}
      />
    </>
  );
}
