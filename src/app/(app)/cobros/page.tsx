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
import { Paginacion } from "@/components/paginacion/paginacion";
import {
  enumParam, fetchAllRows, fetchPage, paginateArray, parseListParams, resumenCobros, uuidParam, type PageMeta, type RawParams,
} from "@/lib/paginacion";
import { STATUS_LABEL, STATUS_TONE, todayLaPaz } from "@/lib/cobros/status";
import { filterViews, toView, type ByCurrency, type InvoiceRow, type InvoiceView } from "@/lib/cobros/summary";

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

const ESTADOS = ["borrador", "enviada", "vencida", "pagada", "anulada"] as const;
const SELECT =
  "id, number, status, currency, issue_date, due_date, client_id, case_id, client:clients(full_name), case:cases(title), invoice_items(quantity, unit_price), payments(amount, paid_on)";

const toRow = (r: Raw): InvoiceRow => ({
  id: r.id, number: r.number, status: r.status, currency: r.currency, issue_date: r.issue_date, due_date: r.due_date,
  client_id: r.client_id, case_id: r.case_id, client_name: r.client?.full_name ?? "—", case_title: r.case?.title ?? null,
  items: r.invoice_items ?? [], payments: r.payments ?? [],
});

function nextMonthStart(today: string): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export default async function CobrosPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  if (sp.nuevo) redirect("/cobros/nuevo");
  const { page, filters } = parseListParams(sp, { filters: { estado: enumParam(ESTADOS), cliente: uuidParam } });
  const { estado, cliente } = filters;
  const { supabase } = await requireStaff();
  const today = todayLaPaz();
  const monthStart = `${today.slice(0, 7)}-01`;

  // "Enviada" y "Vencida" se derivan del saldo: se calculan sobre las cuentas enviadas (conjunto acotado).
  const inMemory = estado === "enviada" || estado === "vencida";

  const [{ data: enviadasRaw }, pagosMes, hasAny, { data: clients }, list] = await Promise.all([
    // Agregados para las tarjetas: SIEMPRE sobre todo el despacho, nunca sobre la página.
    supabase.from("invoices").select(SELECT).eq("status", "enviada").order("created_at", { ascending: false }).limit(1000).returns<Raw[]>(),
    fetchAllRows((from, to) =>
      supabase
        .from("payments")
        .select("amount, invoices!inner(status, currency)")
        .gte("paid_on", monthStart).lt("paid_on", nextMonthStart(today))
        .neq("invoices.status", "anulada")
        .range(from, to)
        .returns<{ amount: number | string; invoices: { currency: "BOB" | "USD" } | { currency: "BOB" | "USD" }[] }[]>()
    ),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
    supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
    inMemory
      ? Promise.resolve(null)
      : fetchPage<Raw>((from, to) => {
          let query = supabase.from("invoices").select(SELECT, { count: "exact" });
          if (estado) query = query.eq("status", estado);
          if (cliente) query = query.eq("client_id", cliente);
          return query.order("created_at", { ascending: false }).order("id").range(from, to).returns<Raw[]>();
        }, page),
  ]);

  const enviadas = (enviadasRaw ?? []).map((r) => toView(toRow(r), today));
  const sum = resumenCobros(
    enviadas.map((v) => ({ currency: v.currency, due_date: v.due_date, items: v.items, payments: v.payments })),
    pagosMes.map((p) => ({ amount: p.amount, currency: (Array.isArray(p.invoices) ? p.invoices[0] : p.invoices).currency })),
    today
  );

  let rows: InvoiceView[];
  let meta: PageMeta;
  if (list) {
    rows = list.rows.map((r) => toView(toRow(r), today));
    meta = list.meta;
  } else {
    const p = paginateArray(filterViews(enviadas, { estado, cliente }), page);
    rows = p.rows;
    meta = p.meta;
  }
  const filtering = Boolean(estado || cliente);
  const listParams = { estado, cliente };

  const newBtn = (
    <Button asChild variant="primary">
      <Link href="/cobros/nuevo"><Plus size={20} aria-hidden /> Nuevo cobro</Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Cobros" subtitle="Tus cuentas de cobro y lo que te deben tus clientes." action={hasAny.count ? newBtn : undefined} />

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

      {!hasAny.count ? (
        <div className="mt-8">
          <EmptyState title="Aún no tienes cobros" description="Crea tu primera cuenta de cobro y registra los pagos de tus clientes." action={newBtn} />
        </div>
      ) : (
        <>
          <InvoiceFilters clients={clients ?? []} estado={estado} cliente={cliente} />
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
          <Paginacion total={meta.total} page={meta.page} pageSize={meta.pageSize} basePath="/cobros" params={listParams} noun="cobros" />
        </>
      )}
    </>
  );
}
