import { createAdminClient } from "@/lib/supabase/admin";
import { getMailProvider } from "@/lib/email/send";
import { EXHAUSTED_PREFIX, runReminderCycle, type ReminderStore } from "@/lib/email/reminders";

export const maxDuration = 60;

type Admin = ReturnType<typeof createAdminClient>;

/** Almacén real sobre Supabase (service-role, solo servidor). */
function supabaseStore(sb: Admin): ReminderStore {
  return {
    async dueAppointments(from, to, limit) {
      const { data } = await sb.from("appointments")
        .select("id, firm_id, kind, title, location, starts_at")
        .eq("status", "programada").gte("starts_at", from.toISOString()).lte("starts_at", to.toISOString())
        .is("reminded_at", null).limit(limit);
      return data ?? [];
    },
    async staffEmails(firmId) {
      const { data } = await sb.from("profiles").select("email").eq("firm_id", firmId).neq("role", "client").not("email", "is", null);
      return (data ?? []).map((p) => p.email as string);
    },
    async claimAppointment(id, at) {
      const { data } = await sb.from("appointments").update({ reminded_at: at.toISOString() }).eq("id", id).is("reminded_at", null).select("id");
      return (data?.length ?? 0) > 0;
    },
    async releaseAppointment(id) {
      await sb.from("appointments").update({ reminded_at: null }).eq("id", id);
    },
    async insertNotification(n) {
      const { error } = await sb.from("notifications").insert(n);
      if (error) throw new Error(error.message);
    },
    async pending(now, limit) {
      const { data } = await sb.from("notifications")
        .select("id, to_email, subject, body, error")
        .is("sent_at", null).lte("send_at", now.toISOString()).not("to_email", "is", null)
        .or(`error.is.null,error.not.like.${EXHAUSTED_PREFIX}*`)
        .order("send_at", { ascending: true }).limit(limit);
      return (data ?? []) as { id: string; to_email: string; subject: string; body: string; error: string | null }[];
    },
    async markSent(id, at) {
      await sb.from("notifications").update({ sent_at: at.toISOString(), error: null }).eq("id", id);
    },
    async markFailed(id, error, sendAt) {
      await sb.from("notifications").update(sendAt ? { error, send_at: sendAt.toISOString() } : { error }).eq("id", id);
    },
  };
}

/**
 * Cron (cada 15–60 min). Auth: Authorization: Bearer $CRON_SECRET.
 * 1) Crea recordatorios por email de citas/audiencias/plazos de las próximas 24 h (una sola vez por cita).
 * 2) Envía los pendientes de `notifications` (máx. 50 por ejecución; reintentos con espera creciente, tope 5).
 * Sin RESEND_API_KEY: responde `blocked:true` con el mensaje "BLOQUEADO: requiere RESEND_API_KEY" y deja los
 * correos en cola con error = 'Sin proveedor de email configurado'.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("No autorizado", { status: 401 });
  const report = await runReminderCycle({ store: supabaseStore(createAdminClient()), provider: getMailProvider(), limit: 50 });
  return Response.json(report);
}
