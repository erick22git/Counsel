import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getLLM, providerBlocker, ProviderConfigError, type GenerateParams, type LLMProvider } from "./providers";
import { allow } from "@/lib/security/rate-limit";

export type Send = (o: Record<string, unknown>) => void;

/** Respuesta NDJSON en streaming: una línea JSON por evento ({type:'meta'|'text'|'done'|'error'}). */
export function ndjson(run: (send: Send) => Promise<void>): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(c) {
        const send: Send = (o) => c.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        try {
          await run(send);
        } catch (e) {
          console.error("[ia]", e instanceof Error ? e.message : e);
          // Errores de configuración/conexión del proveedor son seguros de mostrar (no contienen claves).
          const msg = e instanceof ProviderConfigError ? e.message : "No pude completar la consulta. Intenta de nuevo en un momento.";
          send({ type: "error", message: msg });
        }
        c.close();
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
/** Límites de uso (configurables): por usuario/día, por despacho/día y ráfaga por usuario/minuto. */
export const limits = () => ({
  userDaily: num(process.env.AI_DAILY_LIMIT_PER_USER, 150),
  firmDaily: num(process.env.AI_DAILY_LIMIT_PER_FIRM, 500),
  burstPerMinute: num(process.env.AI_BURST_PER_MINUTE, 20),
});

/** Autenticación + proveedor listo + límites por ráfaga, usuario y despacho. Devuelve Response de error o el proveedor. */
export async function guard(supabase: SupabaseClient): Promise<{ error: Response } | { user: { id: string }; provider: LLMProvider }> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: Response.json({ error: "No autenticado" }, { status: 401 }) };
  const blocker = providerBlocker();
  if (blocker) return { error: Response.json({ error: `La IA no está activada todavía. ${blocker}.` }, { status: 503 }) };
  const L = limits();
  if (!allow(`ia:${data.user.id}`, L.burstPerMinute, 60_000)) {
    return { error: Response.json({ error: "Estás consultando muy rápido. Espera un minuto e intenta de nuevo." }, { status: 429 }) };
  }
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [mine, firm] = await Promise.all([
    supabase.from("ai_audit_log").select("id", { count: "exact", head: true }).eq("user_id", data.user.id).gte("created_at", since),
    supabase.from("ai_audit_log").select("id", { count: "exact", head: true }).gte("created_at", since), // RLS limita al despacho
  ]);
  if ((mine.count ?? 0) >= L.userDaily) return { error: Response.json({ error: "Llegaste a tu límite diario de consultas a la IA. Vuelve mañana." }, { status: 429 }) };
  if ((firm.count ?? 0) >= L.firmDaily) return { error: Response.json({ error: "Tu despacho alcanzó el límite diario de consultas a la IA. Vuelve mañana." }, { status: 429 }) };
  return { user: data.user, provider: getLLM() };
}

export async function audit(supabase: SupabaseClient, provider: LLMProvider, feature: string, summary: string, charsSent: number) {
  await supabase.from("ai_audit_log").insert({ feature, summary, chars_sent: charsSent, model: `${provider.id}:${provider.model}` });
}

/** Transmite el texto del proveedor activo y devuelve el texto completo. */
export async function streamLLM(provider: LLMProvider, p: GenerateParams, send: Send): Promise<string> {
  let full = "";
  for await (const d of provider.stream(p)) {
    full += d;
    send({ type: "text", delta: d });
  }
  return full;
}
