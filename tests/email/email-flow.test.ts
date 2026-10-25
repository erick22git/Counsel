// Flujo completo de correo con PGlite + proveedor mock.
// PRUEBA A MANO: ver comentarios en src/lib/email/reminders.ts (curl al cron con CRON_SECRET, con y sin RESEND_API_KEY).
import { describe, it, expect, beforeEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createDb, createUser, asUser } from "../db/harness";
import { ConsoleMailProvider, NoMailProvider, NO_PROVIDER_ERROR, providerFromEnv, ResendMailProvider } from "@/lib/email/provider";
import { attemptsFromError, backoffMs, confirmationEmail, runReminderCycle } from "@/lib/email/reminders";
import { pgStore } from "./pg-store";

let db: PGlite;
let ana: string, firm: string;
// NOW va un poco adelante del reloj real porque `notifications.send_at` usa now() de la base.
const NOW = new Date(Date.now() + 60_000);
const at = (h: number) => new Date(NOW.getTime() + h * 3600_000).toISOString();

beforeEach(async () => {
  db = await createDb();
  ana = await createUser(db, "ana@demo.bo");
  firm = await asUser(db, ana, async () => (await db.query<{ register_firm: string }>(`select register_firm('Despacho Alfa Demo','Ana Demo')`)).rows[0].register_firm);
});

const notifs = async () =>
  (await db.query<{ kind: string; to_email: string; sent_at: string | null; error: string | null; send_at: string }>(
    `select kind,to_email,sent_at,error,send_at from notifications order by created_at, kind`)).rows;

describe("recordatorios de citas", () => {
  it("(a) una cita en las próximas 24 h genera el recordatorio una sola vez", async () => {
    await db.query(`insert into appointments (firm_id,title,starts_at) values ($1,'Audiencia ficticia',$2),($1,'Cita lejana',$3)`, [firm, at(5), at(72)]);
    const mail = new ConsoleMailProvider();
    const store = pgStore(db);
    const r1 = await runReminderCycle({ store, provider: mail, now: NOW });
    expect(r1).toMatchObject({ status: "ok", queued: 1, sent: 1 });
    const r2 = await runReminderCycle({ store, provider: mail, now: NOW });
    expect(r2).toMatchObject({ queued: 0, sent: 0 });
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({ to: "ana@demo.bo" });
    expect(mail.sent[0].subject).toContain("Audiencia ficticia");
  });

  it("ejecuciones simultáneas no duplican (claim atómico)", async () => {
    await db.query(`insert into appointments (firm_id,title,starts_at) values ($1,'Cita',$2)`, [firm, at(2)]);
    const mail = new ConsoleMailProvider();
    await Promise.all([
      runReminderCycle({ store: pgStore(db), provider: mail, now: NOW }),
      runReminderCycle({ store: pgStore(db), provider: mail, now: NOW }),
    ]);
    expect(await notifs()).toHaveLength(1);
    expect(mail.sent).toHaveLength(1);
  });

  it("respeta el límite por ejecución", async () => {
    for (let i = 0; i < 5; i++) await db.query(`insert into notifications (firm_id,to_email,kind,subject,body) values ($1,'x@demo.bo','k','s','b')`, [firm]);
    const mail = new ConsoleMailProvider();
    const r = await runReminderCycle({ store: pgStore(db), provider: mail, now: NOW, limit: 2 });
    expect(r.sent).toBe(2);
    expect((await notifs()).filter((n) => !n.sent_at)).toHaveLength(3);
  });

  it("reintentos con espera creciente y tope", async () => {
    await db.query(`insert into notifications (firm_id,to_email,kind,subject,body,send_at) values ($1,'x@demo.bo','k','s','b',$2)`, [firm, NOW.toISOString()]);
    const mail = new ConsoleMailProvider();
    mail.failNext = 99;
    const store = pgStore(db);
    let t = NOW;
    for (let attempt = 1; attempt <= 4; attempt++) {
      const r = await runReminderCycle({ store, provider: mail, now: t, maxAttempts: 5 });
      expect(r.retrying).toBe(1);
      const [n] = await notifs();
      expect(n.error).toBe(`Intento ${attempt} de 5: fallo simulado`);
      expect(new Date(n.send_at).getTime()).toBe(t.getTime() + backoffMs(attempt));
      // antes de vencer la espera no se reintenta
      expect((await runReminderCycle({ store, provider: mail, now: new Date(t.getTime() + 1000), maxAttempts: 5 })).retrying).toBe(0);
      t = new Date(t.getTime() + backoffMs(attempt));
    }
    const last = await runReminderCycle({ store, provider: mail, now: t, maxAttempts: 5 });
    expect(last.exhausted).toBe(1);
    const [n] = await notifs();
    expect(n.error).toMatch(/^Agotado tras 5 intentos/);
    expect(n.sent_at).toBeNull();
    // ya no se vuelve a intentar
    expect(await runReminderCycle({ store, provider: mail, now: new Date(t.getTime() + 99 * 3600_000) })).toMatchObject({ sent: 0, retrying: 0, exhausted: 0, pending: 0 });
  });

  it("attemptsFromError", () => {
    expect(attemptsFromError(null)).toBe(0);
    expect(attemptsFromError(NO_PROVIDER_ERROR)).toBe(0);
    expect(attemptsFromError("Intento 3 de 5: x")).toBe(3);
  });
});

describe("solicitud de cita confirmada", () => {
  it("(b) confirmar encola un email al solicitante y el cron lo envía", async () => {
    const when = new Date(Date.now() + 48 * 3600_000).toISOString();
    const req = await asUser(db, null, async () =>
      (await db.query<{ request_appointment: string }>(`select request_appointment('despacho-alfa-demo','Persona Ficticia','p@demo.bo','','Consulta',$1)`, [when])).rows[0].request_appointment);
    // el titular confirma (lo que hace confirmRequest en la bandeja) usando el generador de correo compartido
    await asUser(db, ana, async () => {
      const r = (await db.query<{ full_name: string; email: string; preferred_at: string }>(`select full_name,email,preferred_at::text from appointment_requests where id=$1`, [req])).rows[0];
      const m = confirmationEmail({ ...r, preferred_at: new Date(r.preferred_at).toISOString() });
      await db.query(`insert into notifications (to_email,kind,subject,body) values ($1,$2,$3,$4)`, [m.to_email, m.kind, m.subject, m.body]);
    });
    const mail = new ConsoleMailProvider();
    await runReminderCycle({ store: pgStore(db), provider: mail, now: NOW });
    const toRequester = mail.sent.filter((m) => m.to === "p@demo.bo");
    expect(toRequester).toHaveLength(1);
    expect(toRequester[0].subject).toBe("Tu cita fue confirmada");
    expect(toRequester[0].text).toContain("Persona Ficticia");
  });
});

describe("sin proveedor", () => {
  it("(d) no se pierde nada: queda en cola marcado, con mensaje BLOQUEADO; luego se envía", async () => {
    await db.query(`insert into appointments (firm_id,title,starts_at) values ($1,'Cita',$2)`, [firm, at(3)]);
    const store = pgStore(db);
    const r = await runReminderCycle({ store, provider: new NoMailProvider(), now: NOW });
    expect(r).toMatchObject({ status: "blocked", blocked: true, queued: 1, sent: 0, pending: 1 });
    expect(r.message).toContain("BLOQUEADO: requiere RESEND_API_KEY");
    let rows = await notifs();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sent_at: null, error: NO_PROVIDER_ERROR });
    // repetir no duplica ni consume intentos
    await runReminderCycle({ store, provider: new NoMailProvider(), now: NOW });
    expect(await notifs()).toHaveLength(1);
    // al configurar el proveedor, se envía lo acumulado
    const mail = new ConsoleMailProvider();
    const r2 = await runReminderCycle({ store, provider: mail, now: NOW });
    expect(r2).toMatchObject({ status: "ok", sent: 1 });
    rows = await notifs();
    expect(rows[0].sent_at).not.toBeNull();
    expect(rows[0].error).toBeNull();
  });

  it("providerFromEnv elige según RESEND_API_KEY", () => {
    expect(providerFromEnv({}).configured).toBe(false);
    expect(providerFromEnv({ RESEND_API_KEY: "re_test" })).toBeInstanceOf(ResendMailProvider);
  });
});
