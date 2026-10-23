import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL, aiConfigured } from "./client";

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
          send({ type: "error", message: "No pude completar la consulta. Intenta de nuevo en un momento." });
        }
        c.close();
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

export const DAILY_LIMIT = 150;

/** Autenticación + límite diario por usuario. Devuelve Response de error o el contexto. */
export async function guard(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: Response.json({ error: "No autenticado" }, { status: 401 }) };
  if (!aiConfigured()) {
    return { error: Response.json({ error: "La IA no está activada todavía. Falta configurar ANTHROPIC_API_KEY." }, { status: 503 }) };
  }
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from("ai_audit_log").select("id", { count: "exact", head: true }).eq("user_id", data.user.id).gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return { error: Response.json({ error: "Llegaste al límite diario de consultas a la IA. Vuelve mañana." }, { status: 429 }) };
  }
  return { user: data.user };
}

export async function audit(supabase: SupabaseClient, feature: string, summary: string, charsSent: number) {
  await supabase.from("ai_audit_log").insert({ feature, summary, chars_sent: charsSent, model: MODEL });
}

/** Transmite el texto del modelo y devuelve el texto completo. */
export async function streamClaude(opts: {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  send: Send;
  maxTokens?: number;
  effort?: "low" | "medium" | "high";
}): Promise<string> {
  const stream = getAnthropic().messages.stream({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    system: opts.system,
    messages: opts.messages,
    output_config: { effort: opts.effort ?? "medium" },
  } as Parameters<ReturnType<typeof getAnthropic>["messages"]["stream"]>[0]);
  let full = "";
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
      full += ev.delta.text;
      opts.send({ type: "text", delta: ev.delta.text });
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    opts.send({ type: "notice", message: "La IA no pudo responder a esta consulta." });
  }
  return full;
}

/** Llamada sin streaming (corrección, extracción). */
export async function completeClaude(system: string, user: string, maxTokens = 4000): Promise<string> {
  const res = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { effort: "low" },
  } as Parameters<ReturnType<typeof getAnthropic>["messages"]["create"]>[0] & { stream?: false });
  return (res as { content: { type: string; text?: string }[] }).content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}
