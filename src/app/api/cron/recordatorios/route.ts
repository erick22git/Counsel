import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { fmtDateTime } from "@/lib/format";

export const maxDuration = 60;

/**
 * Cron (cada 15–60 min). Auth: Authorization: Bearer $CRON_SECRET.
 * 1) Crea recordatorios por email de citas/audiencias/plazos de las próximas 24 h (una sola vez).
 * 2) Envía los emails pendientes de la cola `notifications`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("No autorizado", { status: 401 });
  const sb = createAdminClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);

  const { data: appts } = await sb
    .from("appointments")
    .select("id, firm_id, kind, title, location, starts_at, created_by, reminded_at")
    .eq("status", "programada")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", in24h.toISOString())
    .is("reminded_at", null);

  let queued = 0;
  for (const a of appts ?? []) {
    const { data: staff } = await sb.from("profiles").select("email").eq("firm_id", a.firm_id).neq("role", "client").not("email", "is", null);
    const label = a.kind === "audiencia" ? "Audiencia" : a.kind === "plazo" ? "Plazo" : "Cita";
    for (const p of staff ?? []) {
      await sb.from("notifications").insert({
        firm_id: a.firm_id, to_email: p.email, kind: "recordatorio",
        subject: `${label} en las próximas 24 horas: ${a.title}`,
        body: `${label}: ${a.title}\nCuándo: ${fmtDateTime(a.starts_at)}${a.location ? `\nDónde: ${a.location}` : ""}`,
      });
      queued++;
    }
    await sb.from("appointments").update({ reminded_at: now.toISOString() }).eq("id", a.id);
  }

  const { data: pending } = await sb.from("notifications").select("*").is("sent_at", null).lte("send_at", now.toISOString()).not("to_email", "is", null).limit(50);
  let sent = 0;
  for (const n of pending ?? []) {
    const r = await sendMail({ to: n.to_email, subject: n.subject, text: n.body });
    if (r.ok) {
      await sb.from("notifications").update({ sent_at: new Date().toISOString(), error: null }).eq("id", n.id);
      sent++;
    } else if (!r.skipped) {
      await sb.from("notifications").update({ error: r.error ?? "error" }).eq("id", n.id);
    }
  }
  return Response.json({ queued, sent, pending: (pending?.length ?? 0) - sent });
}
