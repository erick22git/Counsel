import "server-only";
import { providerFromEnv, type Mail, type MailProvider, type MailResult } from "./provider";

export type { Mail, MailProvider, MailResult } from "./provider";
export { renderEmail, BLOCKED_MESSAGE, NO_PROVIDER_ERROR } from "./provider";

/** Proveedor activo según el entorno (Resend si hay RESEND_API_KEY). */
export const getMailProvider = (): MailProvider => providerFromEnv();

/**
 * Envía con el proveedor indicado (por defecto, el del entorno).
 * Sin RESEND_API_KEY devuelve { ok:false, skipped:true }: el correo queda en la cola `notifications`.
 */
export async function sendMail(m: Mail, provider: MailProvider = getMailProvider()): Promise<MailResult> {
  return provider.send(m);
}

/** Aviso para la interfaz (p. ej. bandeja /consultas): null si hay proveedor. */
export function mailNotice(provider: MailProvider = getMailProvider()): string | null {
  return provider.configured ? null : "BLOQUEADO: requiere RESEND_API_KEY. El aviso por correo quedó en cola y se enviará cuando se configure.";
}
