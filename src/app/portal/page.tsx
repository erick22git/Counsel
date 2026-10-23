import { requireClient } from "@/lib/auth";
import { Card, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDate, fmtDateTime, fmtMoney, STAGES } from "@/lib/format";
import { DownloadButton } from "./download-button";

export const dynamic = "force-dynamic";

/** Portal del cliente: solo lectura. RLS limita todo a lo suyo y a lo marcado "visible para el cliente". */
export default async function Portal() {
  const { supabase, profile } = await requireClient();
  const [cases, events, appts, docs, invoices] = await Promise.all([
    supabase.from("cases").select("id,title,stage,matter,case_number,court").order("updated_at", { ascending: false }),
    supabase.from("case_events").select("id,case_id,title,body,happened_at").order("happened_at", { ascending: false }).limit(100),
    supabase.from("appointments").select("id,case_id,kind,title,location,starts_at").gte("starts_at", new Date().toISOString()).order("starts_at").limit(20),
    supabase.from("documents").select("id,case_id,title,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("invoices").select("id,number,status,currency,issue_date,due_date,invoice_items(quantity,unit_price),payments(amount)").order("issue_date", { ascending: false }).limit(20),
  ]);
  const stageLabel = (s: string) => STAGES.find((x) => x.id === s)?.label ?? s;

  return (
    <>
      <h1 className="text-[length:var(--text-heading)] font-medium tracking-[-0.02em]">Hola, {profile.full_name.split(" ")[0]}</h1>
      <p className="mt-1 text-ink-2">Aquí puedes ver cómo va tu caso. Si tienes dudas, contacta a tu abogado.</p>

      {!cases.data?.length ? (
        <div className="mt-8"><EmptyState title="Todavía no hay casos para mostrar" description="Cuando tu abogado comparta información, la verás aquí." /></div>
      ) : (
        <div className="mt-6 grid gap-6">
          {cases.data.map((c) => (
            <Card key={c.id} className="grid gap-4 rounded-[24px]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[length:var(--text-heading-sm)]">{c.title}</h2>
                  <p className="text-ink-2">{[c.case_number && `Expediente ${c.case_number}`, c.court].filter(Boolean).join(" · ")}</p>
                </div>
                <Pill tone="accent">Etapa: {stageLabel(c.stage)}</Pill>
              </div>

              <section>
                <h3 className="mb-1 font-medium">Novedades</h3>
                {(events.data ?? []).filter((e) => e.case_id === c.id).length === 0 ? (
                  <p className="text-ink-2">Aún no hay novedades.</p>
                ) : (
                  <ol className="grid gap-3 border-l border-line-strong pl-4">
                    {(events.data ?? []).filter((e) => e.case_id === c.id).slice(0, 10).map((e) => (
                      <li key={e.id}>
                        <p className="text-[length:var(--text-body-sm)] text-ink-3">{fmtDate(e.happened_at)}</p>
                        <p className="font-medium">{e.title}</p>
                        {e.body && <p className="text-ink-2">{e.body}</p>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              {(appts.data ?? []).some((a) => a.case_id === c.id) && (
                <section>
                  <h3 className="mb-1 font-medium">Próximas fechas</h3>
                  <ul className="grid gap-1">
                    {(appts.data ?? []).filter((a) => a.case_id === c.id).map((a) => (
                      <li key={a.id}>{fmtDateTime(a.starts_at)} — {a.title}{a.location ? ` (${a.location})` : ""}</li>
                    ))}
                  </ul>
                </section>
              )}

              {(docs.data ?? []).some((d) => d.case_id === c.id) && (
                <section>
                  <h3 className="mb-1 font-medium">Documentos compartidos</h3>
                  <ul className="grid gap-2">
                    {(docs.data ?? []).filter((d) => d.case_id === c.id).map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>{d.title}</span>
                        <DownloadButton id={d.id} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </Card>
          ))}
        </div>
      )}

      {(invoices.data?.length ?? 0) > 0 && (
        <Card className="mt-6 rounded-[24px]">
          <h2 className="mb-3 text-[length:var(--text-heading-sm)]">Mis cobros</h2>
          <ul className="grid gap-3">
            {invoices.data!.map((i) => {
              const items = (i.invoice_items as { quantity: number; unit_price: number }[]) ?? [];
              const total = items.reduce((s, x) => s + Number(x.quantity) * Number(x.unit_price), 0);
              const paid = ((i.payments as { amount: number }[]) ?? []).reduce((s, p) => s + Number(p.amount), 0);
              const cur = i.currency as "BOB" | "USD";
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{i.number} · {fmtDate(i.issue_date)}</span>
                  <span className="flex items-center gap-2">
                    {fmtMoney(total, cur)}
                    <Pill tone={i.status === "pagada" ? "ok" : "warn"}>{i.status === "pagada" ? "Pagado" : `Saldo ${fmtMoney(Math.max(total - paid, 0), cur)}`}</Pill>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
