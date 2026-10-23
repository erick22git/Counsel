import "server-only";

export interface Mail { to: string; subject: string; text: string }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Cuerpo HTML sencillo y legible (texto grande, sin imágenes remotas). */
export function renderEmail(subject: string, text: string): string {
  const body = esc(text).replace(/\n/g, "<br>");
  return `<div style="font-family:Arial,sans-serif;font-size:17px;line-height:1.6;color:#111;max-width:560px;margin:auto;padding:24px"><h2 style="font-size:20px">${esc(subject)}</h2><p>${body}</p><hr style="border:none;border-top:1px solid #ddd;margin:24px 0"><p style="font-size:14px;color:#555">Mensaje enviado por Counsel. Si no esperabas este correo, ignóralo.</p></div>`;
}

/** Envía con Resend. Devuelve { ok:false, skipped:true } si no hay RESEND_API_KEY (queda en cola). */
export async function sendMail(m: Mail): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Counsel <no-responder@example.com>",
        to: [m.to],
        subject: m.subject,
        text: m.text,
        html: renderEmail(m.subject, m.text),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return { ok: false, error: `Resend ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "error" };
  }
}
