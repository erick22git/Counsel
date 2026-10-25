// Núcleo del límite de intentos: SIN dependencias de Next ni "server-only" (se prueba con vitest).
// Las funciones que leen cabeceras (IP) viven en rate-limit.ts.

export interface RateLimitResult {
  ok: boolean;
  /** Intentos que quedan en la ventana actual. */
  remaining: number;
  /** Segundos que debe esperar la persona si fue bloqueada (0 si ok). */
  retryAfterSeconds: number;
}

/** Almacén conectable. Implementaciones: memoria (por defecto) y Upstash Redis REST. */
export interface RateLimitStore {
  hit(key: string, max: number, windowMs: number, now?: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

/** Ventana deslizante en memoria (por instancia). */
export class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, number[]>();

  hitSync(key: string, max: number, windowMs: number, now = Date.now()): RateLimitResult {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length >= max) {
      this.hits.set(key, list);
      const retryMs = list[0] + windowMs - now;
      return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(retryMs / 1000)) };
    }
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 5000) for (const [k, v] of this.hits) if (!v.some((t) => now - t < windowMs)) this.hits.delete(k);
    return { ok: true, remaining: max - list.length, retryAfterSeconds: 0 };
  }

  async hit(key: string, max: number, windowMs: number, now = Date.now()) {
    return this.hitSync(key, max, windowMs, now);
  }

  async reset(key: string) {
    this.hits.delete(key);
  }
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

/**
 * Upstash Redis vía REST (sin dependencias). Ventana fija con INCR + PEXPIRE NX.
 * Si Upstash falla, cae a la memoria local (mejor limitar por instancia que dejar sin límite).
 */
export class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private url: string,
    private token: string,
    private fetchImpl: FetchLike = fetch as unknown as FetchLike,
    private fallback: RateLimitStore = new MemoryRateLimitStore(),
  ) {}

  private async pipeline(commands: (string | number)[][]): Promise<{ result?: unknown; error?: string }[]> {
    const r = await this.fetchImpl(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) throw new Error("Upstash no respondió");
    return (await r.json()) as { result?: unknown; error?: string }[];
  }

  async hit(key: string, max: number, windowMs: number, now = Date.now()): Promise<RateLimitResult> {
    try {
      const k = `rl:${key}`;
      const out = await this.pipeline([["INCR", k], ["PEXPIRE", k, windowMs, "NX"], ["PTTL", k]]);
      if (out.some((o) => o.error)) throw new Error("Upstash error");
      const count = Number(out[0].result);
      const ttl = Math.max(0, Number(out[2].result));
      if (count > max) return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)) };
      return { ok: true, remaining: max - count, retryAfterSeconds: 0 };
    } catch {
      return this.fallback.hit(key, max, windowMs, now);
    }
  }

  async reset(key: string) {
    try {
      await this.pipeline([["DEL", `rl:${key}`]]);
    } catch {
      /* mejor esfuerzo */
    }
    await this.fallback.reset(key);
  }
}

/** Elige el almacén según variables de entorno (Upstash si están ambas; si no, memoria). */
export function createStoreFromEnv(env: Record<string, string | undefined> = process.env): RateLimitStore {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? new UpstashRateLimitStore(url, token) : new MemoryRateLimitStore();
}

/** Texto amable con el tiempo de espera: "1 minuto", "3 minutos", "unos segundos". */
export function waitText(seconds: number): string {
  if (seconds < 60) return seconds <= 10 ? "unos segundos" : `${Math.ceil(seconds / 5) * 5} segundos`;
  const m = Math.ceil(seconds / 60);
  return m === 1 ? "1 minuto" : `${m} minutos`;
}

/** Mensaje en español para mostrar al usuario cuando se alcanzó el límite. */
export function tooManyMessage(retryAfterSeconds: number): string {
  return `Demasiados intentos, espera ${waitText(retryAfterSeconds)} e intenta de nuevo.`;
}

/** Limitador con almacén y reloj inyectables. */
export function createLimiter(store: RateLimitStore, clock: () => number = Date.now) {
  return {
    store,
    /** key libre: "login:1.2.3.4:ana@x.bo", "ia:user:<uuid>", "ia:firm:<uuid>"… */
    async byKey(scope: string, key: string, max: number, windowMs: number): Promise<RateLimitResult & { message: string }> {
      const r = await store.hit(`${scope}:${key}`, max, windowMs, clock());
      return { ...r, message: r.ok ? "" : tooManyMessage(r.retryAfterSeconds) };
    },
    reset: (scope: string, key: string) => store.reset(`${scope}:${key}`),
  };
}
