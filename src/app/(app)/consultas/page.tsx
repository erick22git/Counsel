import { PageHeader, Card, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime, MATTERS } from "@/lib/format";
import { BuscadorLista } from "@/components/paginacion/buscador-lista";
import { Paginacion } from "@/components/paginacion/paginacion";
import { fetchPage, orIlike, parseListParams, type RawParams } from "@/lib/paginacion";
import { InboxActions, RequestActions, ShareLinks } from "./inbox-actions";

export const metadata = { title: "Consultas · Counsel" };

type Req = { id: string; full_name: string; email: string | null; phone: string | null; reason: string | null; preferred_at: string; status: string };
type Intake = { id: string; full_name: string; email: string | null; phone: string | null; matter: string | null; message: string; status: string; created_at: string };

export default async function Consultas({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const { q, page: pageCitas } = parseListParams(sp, { pageParam: "pagina_citas" });
  const { page: pageConsultas } = parseListParams(sp, { pageParam: "pagina_consultas" });
  const { supabase, firm } = await requireStaff();

  const [reqs, intake, { count: nPend }, { count: nNuevas }] = await Promise.all([
    fetchPage<Req>((from, to) => {
      let query = supabase.from("appointment_requests").select("*", { count: "exact" });
      if (q) query = query.or(orIlike(["full_name", "phone", "email", "reason"], q));
      return query.order("created_at", { ascending: false }).order("id").range(from, to).returns<Req[]>();
    }, pageCitas),
    fetchPage<Intake>((from, to) => {
      let query = supabase.from("intake_submissions").select("*", { count: "exact" });
      if (q) query = query.or(orIlike(["full_name", "phone", "email", "message"], q));
      return query.order("created_at", { ascending: false }).order("id").range(from, to).returns<Intake[]>();
    }, pageConsultas),
    // Contadores de pendientes sobre todo el despacho (no solo la página).
    supabase.from("appointment_requests").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
    supabase.from("intake_submissions").select("id", { count: "exact", head: true }).eq("status", "nueva"),
  ]);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pend = { length: nPend ?? 0 };
  const nuevas = { length: nNuevas ?? 0 };
  const reqPage = reqs.meta.page;
  const intakePage = intake.meta.page;
  const sinFiltro = !q;

  return (
    <>
      <PageHeader title="Consultas" subtitle="Personas que te escribieron o pidieron una cita desde tus enlaces." />
      <ShareLinks consulta={`${base}/consulta/${firm.slug}`} reservar={`${base}/reservar/${firm.slug}`} />

      <div className="mt-6">
        <BuscadorLista basePath="/consultas" q={q} id="buscar-consulta" label="Buscar en consultas y citas" placeholder="Nombre, teléfono, correo o texto del mensaje" clearHref="/consultas" />
      </div>

      <h2 className="mb-3 mt-8 text-[length:var(--text-heading-sm)]">Solicitudes de cita {pend.length > 0 && <Pill tone="warn">{pend.length} por responder</Pill>}</h2>
      {reqs.meta.total === 0 ? (
        <p className="text-ink-2">{sinFiltro ? "Aún no hay solicitudes de cita." : "Ninguna solicitud de cita coincide con tu búsqueda."}</p>
      ) : (
        <>
        <ul className="grid gap-3">
          {reqs.rows.map((r) => (
            <li key={r.id}>
              <Card className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{r.full_name}</p>
                  <Pill tone={r.status === "pendiente" ? "warn" : r.status === "confirmada" ? "ok" : "neutral"}>{r.status}</Pill>
                </div>
                <p>Quiere: {fmtDateTime(r.preferred_at)}</p>
                {r.reason && <p className="text-ink-2">{r.reason}</p>}
                <p className="text-[length:var(--text-body-sm)] text-ink-2">{[r.phone, r.email].filter(Boolean).join(" · ")}</p>
                {r.status === "pendiente" && <RequestActions id={r.id} />}
              </Card>
            </li>
          ))}
        </ul>
        <Paginacion total={reqs.meta.total} page={reqPage} pageSize={reqs.meta.pageSize} basePath="/consultas" pageParam="pagina_citas"
          params={{ q, pagina_consultas: intakePage > 1 ? String(intakePage) : "" }} noun="solicitudes" />
        </>
      )}

      <h2 className="mb-3 mt-8 text-[length:var(--text-heading-sm)]">Consultas recibidas {nuevas.length > 0 && <Pill tone="warn">{nuevas.length} nuevas</Pill>}</h2>
      {intake.meta.total === 0 ? (
        sinFiltro ? (
          <EmptyState title="Aún no hay consultas" description="Comparte tu enlace de consultas en WhatsApp o tu página y llegarán aquí." />
        ) : (
          <p className="text-ink-2">Ninguna consulta coincide con tu búsqueda.</p>
        )
      ) : (
        <>
        <ul className="grid gap-3">
          {intake.rows.map((i) => (
            <li key={i.id}>
              <Card className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{i.full_name} {i.matter && <span className="text-ink-3">· {MATTERS[i.matter] ?? i.matter}</span>}</p>
                  <Pill tone={i.status === "nueva" ? "warn" : i.status === "convertida" ? "ok" : "neutral"}>{i.status}</Pill>
                </div>
                <p className="whitespace-pre-wrap">{i.message}</p>
                <p className="text-[length:var(--text-body-sm)] text-ink-2">{[i.phone, i.email].filter(Boolean).join(" · ")} · {fmtDateTime(i.created_at)}</p>
                {i.status === "nueva" && <InboxActions id={i.id} />}
              </Card>
            </li>
          ))}
        </ul>
        <Paginacion total={intake.meta.total} page={intakePage} pageSize={intake.meta.pageSize} basePath="/consultas" pageParam="pagina_consultas"
          params={{ q, pagina_citas: reqPage > 1 ? String(reqPage) : "" }} noun="consultas" />
        </>
      )}
    </>
  );
}
