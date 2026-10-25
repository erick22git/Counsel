import { describe, it, expect } from "vitest";
import { MemoryRateLimitStore, UpstashRateLimitStore, createLimiter, createStoreFromEnv, tooManyMessage, waitText } from "@/lib/security/rate-limit-core";

describe("rate limit en memoria con reloj inyectado", () => {
  it("bloquea al pasar el máximo y devuelve retryAfterSeconds", async () => {
    let t = 1_000_000;
    const lim = createLimiter(new MemoryRateLimitStore(), () => t);
    for (let i = 0; i < 3; i++) expect((await lim.byKey("login", "ip:ana", 3, 60_000)).ok).toBe(true);
    t += 20_000;
    const r = await lim.byKey("login", "ip:ana", 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBe(40);
    expect(r.message).toBe("Demasiados intentos, espera 40 segundos e intenta de nuevo.");
  });

  it("se libera al terminar la ventana y las claves son independientes", async () => {
    let t = 0;
    const lim = createLimiter(new MemoryRateLimitStore(), () => t);
    await lim.byKey("a", "x", 1, 1000);
    expect((await lim.byKey("a", "x", 1, 1000)).ok).toBe(false);
    expect((await lim.byKey("a", "y", 1, 1000)).ok).toBe(true);
    expect((await lim.byKey("b", "x", 1, 1000)).ok).toBe(true);
    t += 1001;
    expect((await lim.byKey("a", "x", 1, 1000)).ok).toBe(true);
  });

  it("reset borra el contador", async () => {
    const lim = createLimiter(new MemoryRateLimitStore(), () => 5);
    await lim.byKey("login", "k", 1, 60_000);
    expect((await lim.byKey("login", "k", 1, 60_000)).ok).toBe(false);
    await lim.reset("login", "k");
    expect((await lim.byKey("login", "k", 1, 60_000)).ok).toBe(true);
  });

  it("mensajes amables con minutos", () => {
    expect(waitText(5)).toBe("unos segundos");
    expect(waitText(60)).toBe("1 minuto");
    expect(waitText(61)).toBe("2 minutos");
    expect(tooManyMessage(180)).toBe("Demasiados intentos, espera 3 minutos e intenta de nuevo.");
  });
});

describe("Upstash REST", () => {
  const mk = (replies: { result?: unknown; error?: string }[][] | "fail") => {
    const calls: { url: string; body: unknown; auth: string }[] = [];
    let i = 0;
    const f = async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
      calls.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
      if (replies === "fail") throw new Error("red caída");
      return { ok: true, json: async () => replies[i++] };
    };
    return { f, calls };
  };

  it("permite hasta max y bloquea con el TTL de Redis", async () => {
    const { f, calls } = mk([[{ result: 2 }, { result: 0 }, { result: 60000 }], [{ result: 4 }, { result: 0 }, { result: 90500 }]]);
    const s = new UpstashRateLimitStore("https://x.upstash.io/", "tok", f);
    expect(await s.hit("login:a", 3, 60_000)).toEqual({ ok: true, remaining: 1, retryAfterSeconds: 0 });
    const r = await s.hit("login:a", 3, 60_000);
    expect(r).toEqual({ ok: false, remaining: 0, retryAfterSeconds: 91 });
    expect(calls[0].url).toBe("https://x.upstash.io/pipeline");
    expect(calls[0].auth).toBe("Bearer tok");
    expect(calls[0].body).toEqual([["INCR", "rl:login:a"], ["PEXPIRE", "rl:login:a", 60000, "NX"], ["PTTL", "rl:login:a"]]);
  });

  it("si Upstash falla, cae a memoria (sigue limitando)", async () => {
    const { f } = mk("fail");
    const s = new UpstashRateLimitStore("https://x", "t", f);
    expect((await s.hit("k", 1, 1000, 0)).ok).toBe(true);
    expect((await s.hit("k", 1, 1000, 1)).ok).toBe(false);
  });

  it("createStoreFromEnv elige según variables", () => {
    expect(createStoreFromEnv({})).toBeInstanceOf(MemoryRateLimitStore);
    expect(createStoreFromEnv({ UPSTASH_REDIS_REST_URL: "https://x" })).toBeInstanceOf(MemoryRateLimitStore);
    expect(createStoreFromEnv({ UPSTASH_REDIS_REST_URL: "https://x", UPSTASH_REDIS_REST_TOKEN: "t" })).toBeInstanceOf(UpstashRateLimitStore);
  });
});
