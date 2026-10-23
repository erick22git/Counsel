import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceFilters } from "@/components/cobros/invoice-filters";
import { fmtDate, fmtMoney } from "@/lib/format";
import { fromCents } from "@/lib/cobros/money";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/cobros/status";
import { filterViews, summarize, toView, type ByCurrency, type InvoiceRow } from "@/lib/cobros/summary";

export const metadata = { title: "Cobros · Counsel" };

type Raw = {
  id: string; number: string; status: InvoiceRow["status"]; currency: "BOB" | "USD"; issue_date: string; due_date: string | null;
  client_id: string; case_id: string | null;
  client: { full_name: string } | null; case: { title: string } | null;
  invoice_items: { quantity: number; unit_price: number }[]; payments: { amount: number; paid_on: string }[];
};

function Money({ v }: { v: ByCurrency }) {
  const lines = [];
  if (v.BOB || !v.USD) lines.push(fmtMoney(fromCents(v.BOB), "BOB"));
  if (v.USD) lines.push(fmtMoney(fromCents(v.USD), "USD"));
  return (
    <>
      {lines.map((l) => (
        <p key={l} className="text-[length:var(--text-heading-sm)] font-semibold">{l}</p>
      ))}
    </>
  );
}

export default async function CobrosPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
  const sp = await searchParams;
  if (sp.nuevo) redirect("/cobros/nuevo");
  const { supabase } = await requireStaff();

  const [{ data: raw }, { data: clients }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, status, currency, issue_date, due_date, client_id, case_id, client:clients(full_name), case:cases(title), invoice_items(quantity, unit_price), payments(amount, paid_on)")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<Raw[]>(),
    supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
  ]);

  const all = (raw ?? []).map((r) =>
    toView({
      id: r.id, number: r.number, status: r.status, currency: r.currency, issue_date: r.issue_date, due_date: r.due_date,
      client_id: r.client_id, case_id: r.case_id, client_name: r.client?.full_name ?? "—", case_title: r.case?.title ?? null,
      items: r.invoice_items ?? [], payments: r.payments ?? [],
    })
  );
  const sum = summarize(all);
  const rows = filterViews(all, { estado: sp.estado, cliente: sp.cliente });
  const filtering = Boolean(sp.estado || sp.cliente);

  const newBtn = (
    <Button asChild variant="primary">
      <Link href="/cobros/nuevo"><Plus size={20} aria-hidden /> Nuevo cobro</Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Cobros" subtitle="Tus cuentas de cobro y lo que te deben tus clientes." action={all.length ? newBtn : undefined} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="text-ink-2 text-[length:var(--text-body)] font-medium">Por cobrar</h2>
          <Money v={sum.porCobrar} />
        </Card>
        <Card>
          <h2 className="text-ink-2 text-[length:var(--text-body)] font-medium">Cobrado este mes</h2>
          <Money v={sum.cobradoMes} />
        </Card>
        <Card>
          <h2 className="text-ink-2 text-[length:var(--text-body)] font-medium">Vencido</h2>
          <div className={sum.vencido.BOB || sum.vencido.USD ? "text-danger" : ""}><Money v={sum.vencido} /></div>
        </Card>
      </div>
      <p className="mt-3 text-[length:var(--text-body-sm)] text-ink-3">
        Son cuentas de cobro internas de tu despacho, no facturas fiscales (SIAT).
      </p>

      {all.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Aún no tienes cobros" description="Crea tu primera cuenta de cobro y registra los pagos de tus clientes." action={newBtn} />
        </div>
      ) : (
        <>
          <InvoiceFilters clients={clients ?? []} estado={sp.estado ?? ""} cliente={sp.cliente ?? ""} />
          {rows.length === 0 ? (
            <Card className="mt-4 text-center text-ink-2">{filtering ? "No hay cobros con esos filtros." : "Sin cobros."}</Card>
          ) : (
            <Card className="mt-4 overflow-x-auto p-0">
              <table className="w-full min-w-[44rem] text-left">
                <caption className="sr-only">Lista de cobros</caption>
                <thead className="border-b border-line text-ink-2 text-[length:var(--text-body-sm)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Número</th>
                    <th scope="col" className="px-4 py-3 font-medium">Cliente y caso</th>
                    <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-4 py-3 align-top">
                        <Link href={`/cobros/${v.id}`} className="font-semibold text-accent underline-offset-4 hover:underline">{v.number}</Link>
                        <p className="text-ink-3 text-[length:var(--text-caption)]">{fmtDate(v.issue_date)}</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p>{v.client_name}</p>
                        {v.case_title && <p className="text-ink-2 text-[length:var(--text-body-sm)]">{v.case_title}</p>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <Pill tone={STATUS_TONE[v.display]}>{STATUS_LABEL[v.display]}</Pill>
                        {v.due_date && v.status === "enviada" && <p className="mt-1 text-ink-3 text-[length:var(--text-caption)]">Vence {fmtDate(v.due_date)}</p>}
                      </td>
                      <td className="px-4 py-3 text-right align-top tabular-nums">{fmtMoney(fromCents(v.total_cents), v.currency)}</td>
                      <td className="px-4 py-3 text-right align-top tabular-nums">{fmtMoney(fromCents(v.balance_cents), v.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </>
  );
}
