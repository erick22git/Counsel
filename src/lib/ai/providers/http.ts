import { ProviderConfigError } from "./types";

/** fetch con tiempo máximo y mensajes de error legibles (sin filtrar claves ni cuerpos de petición). */
export async function postJson(url: string, body: unknown, headers: Record<string, string>, timeoutMs = 120_000): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const host = safeHost(url);
    if (e instanceof Error && e.name === "TimeoutError") throw new Error(`El proveedor de IA (${host}) tardó demasiado en responder.`);
    throw new ProviderConfigError(`No pude conectar con el proveedor de IA (${host}). ¿Está encendido y bien configurado?`);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200).replace(/key=[^&\s"]+/gi, "key=***");
    if (res.status === 401 || res.status === 403) throw new ProviderConfigError(`El proveedor de IA rechazó la clave (${res.status}). Revisa la configuración.`);
    if (res.status === 429) throw new Error("El proveedor de IA alcanzó su límite de uso. Intenta de nuevo en un momento.");
    throw new Error(`El proveedor de IA respondió con error ${res.status}. ${detail}`);
  }
  return res;
}

export function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "desconocido";
  }
}

/** Lee un cuerpo en streaming como líneas de texto (SSE / NDJSON). */
export async function* readLines(res: Response): AsyncIterable<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? "";
    for (const l of lines) yield l;
  }
  if (buf.trim()) yield buf;
}

export function isLocalUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local") || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  } catch {
    return false;
  }
}
