// Lógica del ciclo de recordatorios, independiente de Supabase (se prueba con PGlite + proveedor mock).
// El almacén real (Supabase admin) está en src/app/api/cron/recordatorios/route.ts.
//
// PRUEBA A MANO:
//   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recordatorios
//   - Sin RESEND_API_KEY: responde { blocked:true, message:"BLOQUEADO: requiere RESEND_API_KEY…" } y las filas de
//     `notifications` quedan con error = 'Sin proveedor de email configurado' (no se pierden).
//   - Con RESEND_API_KEY: envía; repetir la llamada no reenvía nada (idempotente).
//   - Para probar reintentos: pon una clave inválida; verás "Intento 1 de 5: Resend 401" y send_at con espera creciente.
import { BLOCKED_MESSAGE, NO_PROVIDER_ERROR, type MailProvider } from "./provider";
import { fmtDateTime } from "@/lib/format";

export const MAX_ATTEMPTS = 5;
export const BACKOFF_BASE_MS = 5 * 60_000;
export const EXHAUSTED_PREFIX = "Agotado";

export interface DueAppointment { id: string; firm_id: string; kind: string; title: string; location: string | null; starts_at: string }
export interface NewNotification { firm_id: string; to_email: string; kind: string; subject: string; body: string }
export interface PendingNotification { id: string; to_email: string; subject: string; body: string; error: string | null }

export interface ReminderStore {
  /** Citas programadas que empiezan en [from, to] y aún sin `reminded_at`. */
  dueAppointments(from: Date, to: Date, limit: number): Promise<DueAppointment[]>;
  staffEmails(firmId: string): Promise<string[]>;
  /** Marca `reminded_at` solo si seguía vacío; true si esta ejecución "ganó". */
  claimAppointment(id: string, at: Date): Promise<boolean>;
  releaseAppointment(id: string): Promise<void>;
  insertNotification(n: NewNotification): Promise<void>;
  /** Pendientes (sent_at null, send_at <= now, con correo) que no estén agotadas. */
  pending(now: Date, limit: number): Promise<PendingNotification[]>;
  markSent(id: string, at: Date): Promise<void>;
  markFailed(id: string, error: string, sendAt: Date | null): Promise<void>;
}

export function appointmentReminder(a: DueAppointment, to: string): NewNotification {
  const label = a.kind === "audiencia" ? "Audiencia" : a.kind === "plazo" ? "Plazo" : "Cita";
  return {
    firm_id: a.firm_id, to_email: to, kind: "recordatorio",
    subject: `${label} en las próximas 24 horas: ${a.title}`,
    body: `${label}: ${a.title}\nCuándo: ${fmtDateTime(a.starts_at)}${a.location ? `\nDónde: ${a.location}` : ""}`,
  };
}

/** Correo al solicitante cuando el abogado confirma su cita (lo usa la bandeja /consultas). */
export function confirmationEmail(r: { full_name: string; email: string; preferred_at: string }) {
  return {
    to_email: r.email, kind: "cita_confirmada", subject: "Tu cita fue confirmada",
    body: `Hola ${r.full_name}, tu cita quedó confirmada para ${fmtDateTime(r.preferred_at)} (hora de La Paz).`,
  };
}

/** Intentos ya hechos, leídos de `error` ("Intento 2 de 5: …"). Sin proveedor no cuenta como intento. */
export function attemptsFromError(error: string | null): number {
  const m = /^Intento (\d+) de \d+/.exec(error ?? "");
  return m ? Number(m[1]) : 0;
}

export function backoffMs(attempt: number): number {
  return BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1); // 5, 10, 20, 40 min…
}

export interface ReminderReport {
  status: "ok" | "blocked";
  blocked: boolean;
  message: string;
  provider: { name: string; configured: boolean };
  queued: number;
  sent: number;
  /** fallaron y se reintentarán */
  retrying: number;
  /** superaron el tope de intentos */
  exhausted: number;
  /** pendientes que siguen en cola */
  pending: number;
}

export async function runReminderCycle(opts: {
  store: ReminderStore;
  provider: MailProvider;
  now?: Date;
  /** Máximo de correos por ejecución. */
  limit?: number;
  maxAttempts?: number;
}): Promise<ReminderReport> {
  const { store, provider, limit = 50, maxAttempts = MAX_ATTEMPTS } = opts;
  const now = opts.now ?? new Date();
  const in24h = new Date(now.getTime() + 24 * 3600_000);
  let queued = 0, sent = 0, retrying = 0, exhausted = 0;

  // 1) Crear recordatorios una sola vez por cita.
  for (const a of await store.dueAppointments(now, in24h, 100)) {
    if (!(await store.claimAppointment(a.id, now))) continue; // otra ejecución ya la tomó
    try {
      for (const email of await store.staffEmails(a.firm_id)) {
        await store.insertNotification(appointmentReminder(a, email));
        queued++;
      }
    } catch {
      await store.releaseAppointment(a.id); // se reintenta en la próxima ejecución
    }
  }

  // 2) Enviar pendientes (o dejarlos marcados si no hay proveedor).
  const pending = await store.pending(now, limit);
  if (!provider.configured) {
    for (const n of pending) if (n.error !== NO_PROVIDER_ERROR) await store.markFailed(n.id, NO_PROVIDER_ERROR, null);
    return {
      status: "blocked", blocked: true, message: BLOCKED_MESSAGE, provider: { name: provider.name, configured: false },
      queued, sent: 0, retrying: 0, exhausted: 0, pending: pending.length,
    };
  }
  for (const n of pending) {
    const r = await provider.send({ to: n.to_email, subject: n.subject, text: n.body });
    if (r.ok) {
      await store.markSent(n.id, new Date());
      sent++;
      continue;
    }
    const attempt = attemptsFromError(n.error) + 1;
    const reason = r.error ?? "error";
    if (attempt >= maxAttempts) {
      await store.markFailed(n.id, `${EXHAUSTED_PREFIX} tras ${attempt} intentos: ${reason}`, null);
      exhausted++;
    } else {
      await store.markFailed(n.id, `Intento ${attempt} de ${maxAttempts}: ${reason}`, new Date(now.getTime() + backoffMs(attempt)));
      retrying++;
    }
  }
  return {
    status: "ok", blocked: false, message: "Listo.", provider: { name: provider.name, configured: true },
    queued, sent, retrying, exhausted, pending: pending.length - sent - exhausted,
  };
}
