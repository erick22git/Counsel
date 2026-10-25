import type { PGlite } from "@electric-sql/pglite";
import { EXHAUSTED_PREFIX, type ReminderStore } from "@/lib/email/reminders";

/** Almacén de recordatorios sobre PGlite (equivale al de Supabase en la ruta del cron; corre como superusuario = service-role). */
export function pgStore(db: PGlite): ReminderStore {
  return {
    async dueAppointments(from, to, limit) {
      const r = await db.query<{ id: string; firm_id: string; kind: string; title: string; location: string | null; starts_at: string }>(
        `select id, firm_id, kind, title, location, starts_at::text from appointments
         where status='programada' and starts_at between $1 and $2 and reminded_at is null limit $3`, [from.toISOString(), to.toISOString(), limit]);
      return r.rows.map((x) => ({ ...x, starts_at: new Date(x.starts_at).toISOString() }));
    },
    async staffEmails(firmId) {
      return (await db.query<{ email: string }>(`select email from profiles where firm_id=$1 and role<>'client' and email is not null`, [firmId])).rows.map((r) => r.email);
    },
    async claimAppointment(id, at) {
      const r = await db.query(`update appointments set reminded_at=$2 where id=$1 and reminded_at is null`, [id, at.toISOString()]);
      return (r.affectedRows ?? 0) > 0;
    },
    async releaseAppointment(id) { await db.query(`update appointments set reminded_at=null where id=$1`, [id]); },
    async insertNotification(n) {
      await db.query(`insert into notifications (firm_id,to_email,kind,subject,body) values ($1,$2,$3,$4,$5)`, [n.firm_id, n.to_email, n.kind, n.subject, n.body]);
    },
    async pending(now, limit) {
      return (await db.query<{ id: string; to_email: string; subject: string; body: string; error: string | null }>(
        `select id,to_email,subject,body,error from notifications
         where sent_at is null and send_at <= $1 and to_email is not null and (error is null or error not like $3)
         order by send_at limit $2`, [now.toISOString(), limit, `${EXHAUSTED_PREFIX}%`])).rows;
    },
    async markSent(id, at) { await db.query(`update notifications set sent_at=$2, error=null where id=$1`, [id, at.toISOString()]); },
    async markFailed(id, error, sendAt) {
      if (sendAt) await db.query(`update notifications set error=$2, send_at=$3 where id=$1`, [id, error, sendAt.toISOString()]);
      else await db.query(`update notifications set error=$2 where id=$1`, [id, error]);
    },
  };
}
