import { describe, it, expect } from "vitest";
import { decideAuth, needsMfaChallenge, safeNextPath, validateTotpCode, verifyTotp, type MfaClient } from "@/lib/security/mfa";

describe("validación del código", () => {
  it("acepta 6 dígitos, con espacios o guion", () => {
    expect(validateTotpCode("123456")).toEqual({ ok: true, code: "123456" });
    expect(validateTotpCode(" 123 456 ")).toEqual({ ok: true, code: "123456" });
    expect(validateTotpCode("123-456")).toEqual({ ok: true, code: "123456" });
  });
  it("rechaza vacío, letras y largo incorrecto con mensajes claros", () => {
    expect(validateTotpCode("")).toMatchObject({ ok: false });
    expect(validateTotpCode(undefined)).toMatchObject({ ok: false });
    expect(validateTotpCode("12a456")).toEqual({ ok: false, error: "El código solo tiene números." });
    expect(validateTotpCode("12345")).toMatchObject({ ok: false, error: expect.stringContaining("6 números") });
    expect(validateTotpCode("1234567")).toMatchObject({ ok: false });
  });
});

describe("decisión de redirección según AAL", () => {
  const pend = { currentLevel: "aal1", nextLevel: "aal2" } as const;
  const done = { currentLevel: "aal2", nextLevel: "aal2" } as const;
  const none = { currentLevel: "aal1", nextLevel: "aal1" } as const;

  it("needsMfaChallenge", () => {
    expect(needsMfaChallenge(pend)).toBe(true);
    expect(needsMfaChallenge(done)).toBe(false);
    expect(needsMfaChallenge(none)).toBe(false);
    expect(needsMfaChallenge(null)).toBe(false);
  });
  it("sin sesión: protegida va a /login, pública pasa", () => {
    expect(decideAuth({ pathname: "/panel", isPublic: false, hasUser: false })).toEqual({ action: "redirect", to: "/login" });
    expect(decideAuth({ pathname: "/consulta/x", isPublic: true, hasUser: false })).toEqual({ action: "next" });
  });
  it("aal1 con factor verificado: ruta protegida va a /login/verificar; API da 401", () => {
    expect(decideAuth({ pathname: "/casos", isPublic: false, hasUser: true, aal: pend })).toEqual({ action: "redirect", to: "/login/verificar" });
    expect(decideAuth({ pathname: "/api/ia/chat", isPublic: false, hasUser: true, aal: pend })).toEqual({ action: "unauthorized" });
  });
  it("rutas públicas no se rompen aunque falte el segundo paso", () => {
    expect(decideAuth({ pathname: "/consulta/x", isPublic: true, hasUser: true, aal: pend })).toEqual({ action: "next" });
    expect(decideAuth({ pathname: "/api/cron/recordatorios", isPublic: true, hasUser: true, aal: pend })).toEqual({ action: "next" });
  });
  it("/login/verificar: solo para quien debe verificar", () => {
    expect(decideAuth({ pathname: "/login/verificar", isPublic: true, hasUser: true, aal: pend })).toEqual({ action: "next" });
    expect(decideAuth({ pathname: "/login/verificar", isPublic: true, hasUser: true, aal: done })).toEqual({ action: "redirect", to: "/panel" });
    expect(decideAuth({ pathname: "/login/verificar", isPublic: true, hasUser: false })).toEqual({ action: "next" });
  });
  it("con sesión completa pasa; /login lleva a /panel (o a verificar si falta)", () => {
    expect(decideAuth({ pathname: "/casos", isPublic: false, hasUser: true, aal: done })).toEqual({ action: "next" });
    expect(decideAuth({ pathname: "/casos", isPublic: false, hasUser: true, aal: none })).toEqual({ action: "next" });
    expect(decideAuth({ pathname: "/login", isPublic: true, hasUser: true, aal: none })).toEqual({ action: "redirect", to: "/panel" });
    expect(decideAuth({ pathname: "/login", isPublic: true, hasUser: true, aal: pend })).toEqual({ action: "redirect", to: "/login/verificar" });
  });
  it("safeNextPath evita open-redirect", () => {
    expect(safeNextPath("/casos")).toBe("/casos");
    expect(safeNextPath("//evil.com")).toBe("/panel");
    expect(safeNextPath("https://evil.com")).toBe("/panel");
    expect(safeNextPath(null)).toBe("/panel");
  });
});

function fakeClient(opts: { factors?: { id: string; status: string }[]; verifyOk?: boolean } = {}) {
  const calls: string[] = [];
  const client: MfaClient = {
    auth: {
      mfa: {
        listFactors: async () => ({ data: { totp: opts.factors ?? [{ id: "f1", status: "verified" }] }, error: null }),
        challenge: async ({ factorId }) => { calls.push(`challenge:${factorId}`); return { data: { id: "c1" }, error: null }; },
        verify: async ({ factorId, challengeId, code }) => { calls.push(`verify:${factorId}:${challengeId}:${code}`); return { error: opts.verifyOk === false ? { message: "bad" } : null }; },
      },
    },
  };
  return { client, calls };
}

describe("verifyTotp con cliente Supabase simulado", () => {
  it("hace challenge + verify con el factor verificado", async () => {
    const { client, calls } = fakeClient();
    expect(await verifyTotp(client, "123 456")).toEqual({ ok: true });
    expect(calls).toEqual(["challenge:f1", "verify:f1:c1:123456"]);
  });
  it("código inválido no llama a Supabase", async () => {
    const { client, calls } = fakeClient();
    expect(await verifyTotp(client, "12")).toMatchObject({ ok: false });
    expect(calls).toEqual([]);
  });
  it("código incorrecto devuelve mensaje amable", async () => {
    const { client } = fakeClient({ verifyOk: false });
    expect(await verifyTotp(client, "000000")).toMatchObject({ ok: false, error: expect.stringContaining("no es correcto") });
  });
  it("sin factor verificado", async () => {
    const { client } = fakeClient({ factors: [{ id: "f2", status: "unverified" }] });
    expect(await verifyTotp(client, "123456")).toMatchObject({ ok: false });
  });
});
