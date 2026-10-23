import { PageHeader, Card, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime, MATTERS } from "@/lib/format";
import { InboxActions, RequestActions, ShareLinks } from "./inbox-actions";

export const metadata = { title: "Consultas · Counsel" };

export default async function Consultas() {
  const { supabase, firm } = await requireStaff();
  const [intake, reqs] = await Promise.all([
    supabase.from("intake_submissions").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("appointment_requests").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const nuevas = (intake.data ?? []).filter((i) => i.status === "nueva");
  const pend = (reqs.data ?? []).filter((r) => r.status === "pendiente");

  return (
    <>
      <PageHeader title="Consultas" subtitle="Personas que te escribieron o pidieron una cita desde tus enlaces." />
      <ShareLinks consulta={`${base}/consulta/${firm.slug}`} reservar={`${base}/reservar/${firm.slug}`} />

      <h2 className="mb-3 mt-8 text-[length:var(--text-heading-sm)]">Solicitudes de cita {pend.length > 0 && <Pill tone="warn">{pend.length} por responder</Pill>}</h2>
      {!reqs.data?.length ? (
        <p className="text-ink-2">Aún no hay solicitudes de cita.</p>
      ) : (
        <ul className="grid gap-3">
          {reqs.data.map((r) => (
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
      )}

      <h2 className="mb-3 mt-8 text-[length:var(--text-heading-sm)]">Consultas recibidas {nuevas.length > 0 && <Pill tone="warn">{nuevas.length} nuevas</Pill>}</h2>
      {!intake.data?.length ? (
        <EmptyState title="Aún no hay consultas" description="Comparte tu enlace de consultas en WhatsApp o tu página y llegarán aquí." />
      ) : (
        <ul className="grid gap-3">
          {intake.data.map((i) => (
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
      )}
    </>
  );
}
