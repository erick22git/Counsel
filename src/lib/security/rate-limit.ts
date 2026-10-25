import "server-only";
import { headers } from "next/headers";
import { MemoryRateLimitStore, createLimiter, createStoreFromEnv } from "./rate-limit-core";

export type { RateLimitResult, RateLimitStore } from "./rate-limit-core";
export { tooManyMessage, waitText } from "./rate-limit-core";

/**
 * LÍMITE DE INTENTOS (reutilizable)
 * - Por defecto: memoria por instancia. Con UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN: Redis distribuido.
 * - Todos devuelven { ok, remaining, retryAfterSeconds, message }; `message` ya viene en español amable
 *   ("Demasiados intentos, espera 3 minutos e intenta de nuevo.") para mostrarlo tal cual.
 *
 * Uso en /api/ia/* (coordinador):
 *   const u = await rateLimitByKey("ia-usuario", user.id, 20, 60_000);       // por usuario
 *   const f = await rateLimitByKey("ia-despacho", profile.firm_id, 120, 60_000); // por despacho
 *   if (!u.ok || !f.ok) return Response.json({ error: (u.ok ? f : u).message }, { status: 429, headers: { "Retry-After": String((u.ok ? f : u).retryAfterSeconds) } });
 */

const memory = new MemoryRateLimitStore();
let limiter: ReturnType<typeof createLimiter> | undefined;
const get = () => (limiter ??= createLimiter(createStoreFromEnv()));

/** Compatibilidad: ventana deslizante SÍNCRONA en memoria. Prefiere rateLimit/rateLimitByKey. */
export function allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  return memory.hitSync(key, max, windowMs, now).ok;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "desconocida").trim();
}

/** Límite por clave arbitraria (usuario, despacho, IP+correo…). */
export function rateLimitByKey(scope: string, key: string, max: number, windowMs: number) {
  return get().byKey(scope, key, max, windowMs);
}

/** Límite por IP del visitante. */
export async function rateLimit(scope: string, max = 5, windowMs = 10 * 60_000) {
  return rateLimitByKey(scope, await clientIp(), max, windowMs);
}

/** Borra el contador (p. ej. tras un inicio de sesión correcto). */
export function rateLimitReset(scope: string, key: string) {
  return get().reset(scope, key);
}

