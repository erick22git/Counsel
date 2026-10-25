// Proveedores de email inyectables. Sin "server-only" para poder probarlos con vitest.

export interface Mail { to: string; subject: string; text: string }
export interface MailResult { ok: boolean; skipped?: boolean; error?: string }

export interface MailProvider {
  readonly name: string;
  /** false = no hay credenciales: los correos se quedan en la cola `notifications`. */
  readonly configured: boolean;
  send(m: Mail): Promise<MailResult>;
}

/** Texto que se guarda en `notifications.error` cuando no hay proveedor (el correo NO se pierde). */
export const NO_PROVIDER_ERROR = "Sin proveedor de email configurado";
/** Mensaje explícito para la bandeja y el cron. */
export const BLOCKED_MESSAGE = "BLOQUEADO: requiere RESEND_API_KEY. Los correos quedan en cola y se enviarán cuando se configure.";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Cuerpo HTML sencillo y legible (texto grande, sin imágenes remotas). */
export function renderEmail(subject: string, text: string): string {
  const body = esc(text).replace(/\n/g, "<br>");
  return `<div style="font-family:Arial,sans-serif;font-size:17px;line-height:1.6;color:#111;max-width:560px;margin:auto;padding:24px"><h2 style="font-size:20px">${esc(subject)}</h2><p>${body}</p><hr style="border:none;border-top:1px solid #ddd;margin:24px 0"><p style="font-size:14px;color:#555">Mensaje enviado por Counsel. Si no esperabas este correo, ignóralo.</p></div>`;
}

/** Resend por HTTP (sin dependencias). */
export class ResendMailProvider implements MailProvider {
  readonly name = "resend";
  readonly configured = true;
  constructor(
    private apiKey: string,
    private from = "Counsel <no-responder@example.com>",
    private fetchImpl: typeof fetch = fetch,
  ) {}

  async send(m: Mail): Promise<MailResult> {
    try {
      const r = await this.fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ from: this.from, to: [m.to], subject: m.subject, text: m.text, html: renderEmail(m.subject, m.text) }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) return { ok: false, error: `Resend ${r.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "error" };
    }
  }
}

/** Sin credenciales: no envía; el llamador deja el correo en cola marcado. */
export class NoMailProvider implements MailProvider {
  readonly name = "ninguno";
  readonly configured = false;
  async send(): Promise<MailResult> {
    return { ok: false, skipped: true, error: NO_PROVIDER_ERROR };
  }
}

/** Mock/consola: registra en memoria (para pruebas y desarrollo). `failNext` simula fallos del proveedor. */
export class ConsoleMailProvider implements MailProvider {
  readonly name = "consola";
  readonly configured = true;
  readonly sent: Mail[] = [];
  /** Cuántos envíos siguientes fallarán (para probar reintentos). */
  failNext = 0;
  constructor(private log: (line: string) => void = () => {}) {}

  async send(m: Mail): Promise<MailResult> {
    if (this.failNext > 0) {
      this.failNext--;
      return { ok: false, error: "fallo simulado" };
    }
    this.sent.push(m);
    this.log(`[mail] a ${m.to}: ${m.subject}`);
    return { ok: true };
  }
}

/** Resend si hay RESEND_API_KEY; si no, NoMailProvider (degradación clara). */
export function providerFromEnv(env: Record<string, string | undefined> = process.env): MailProvider {
  return env.RESEND_API_KEY ? new ResendMailProvider(env.RESEND_API_KEY, env.EMAIL_FROM) : new NoMailProvider();
}
