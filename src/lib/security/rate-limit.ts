import "server-only";
import { headers } from "next/headers";

// Límite en memoria por instancia (mejor esfuerzo contra abuso de formularios públicos).
// En despliegues con varias instancias, complementar con el WAF/Edge de la plataforma.
const hits = new Map<string, number[]>();

export function allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return true;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "desconocida").trim();
}

export async function rateLimit(scope: string, max = 5, windowMs = 10 * 60_000) {
  return allow(`${scope}:${await clientIp()}`, max, windowMs);
}
