// MFA con TOTP (Supabase Auth). Funciones puras: se usan en proxy, acciones y pruebas.
// Sin "server-only" ni imports de Next para poder usarse en el proxy y en vitest.

export type Aal = string | null | undefined;
export interface AalInfo { currentLevel: Aal; nextLevel: Aal }

/** Verdadero si el usuario tiene un factor verificado y su sesión aún no pasó el segundo paso. */
export function needsMfaChallenge(a: AalInfo | null | undefined): boolean {
  return !!a && a.nextLevel === "aal2" && a.currentLevel !== "aal2";
}

/** Normaliza lo que escribe la persona: quita espacios y guiones ("123 456" -> "123456"). */
export function normalizeTotp(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export type CodeCheck = { ok: true; code: string } | { ok: false; error: string };

export function validateTotpCode(raw: unknown): CodeCheck {
  if (typeof raw !== "string") return { ok: false, error: "Escribe el código de 6 números de tu aplicación." };
  const code = normalizeTotp(raw);
  if (!code) return { ok: false, error: "Escribe el código de 6 números de tu aplicación." };
  if (!/^\d+$/.test(code)) return { ok: false, error: "El código solo tiene números." };
  if (code.length !== 6) return { ok: false, error: "El código tiene 6 números. Revisa que estén todos." };
  return { ok: true, code };
}

/** Misma regla que `safeNext` de las acciones de auth: solo rutas internas. */
export function safeNextPath(v: unknown, fallback = "/panel"): string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

export type AuthDecision =
  | { action: "next" }
  | { action: "redirect"; to: string }
  | { action: "unauthorized" };

/**
 * Decide qué hace el proxy. `aal` solo hace falta cuando hay usuario.
 * - Públicas: pasan siempre (/login/verificar necesita usuario aal1, pero es pública para el proxy).
 * - Sin usuario en ruta protegida: a /login.
 * - Usuario con factor verificado y sesión aal1 en ruta protegida: a /login/verificar (o 401 en /api).
 * - Usuario en /login o /registro: a /panel, salvo que deba verificar (entonces a /login/verificar).
 */
export function decideAuth(input: {
  pathname: string;
  isPublic: boolean;
  hasUser: boolean;
  aal?: AalInfo | null;
}): AuthDecision {
  const { pathname, isPublic, hasUser, aal } = input;
  const verify = pathname === "/login/verificar" || pathname.startsWith("/login/verificar/");
  if (!hasUser) return isPublic ? { action: "next" } : { action: "redirect", to: "/login" };
  const pending = needsMfaChallenge(aal);
  if (verify) return pending ? { action: "next" } : { action: "redirect", to: "/panel" };
  if (pathname.startsWith("/login") || pathname.startsWith("/registro")) {
    return { action: "redirect", to: pending ? "/login/verificar" : "/panel" };
  }
  if (!isPublic && pending) return pathname.startsWith("/api/") ? { action: "unauthorized" } : { action: "redirect", to: "/login/verificar" };
  return { action: "next" };
}

// ---- Cliente Supabase mínimo (para poder simularlo en pruebas) ----
export interface MfaClient {
  auth: {
    mfa: {
      listFactors(): Promise<{ data: { totp: { id: string; status: string }[] } | null; error: { message: string } | null }>;
      challenge(p: { factorId: string }): Promise<{ data: { id: string } | null; error: { message: string } | null }>;
      verify(p: { factorId: string; challengeId: string; code: string }): Promise<{ error: { message: string } | null }>;
    };
  };
}

/** Completa challenge + verify con el primer factor TOTP verificado. */
export async function verifyTotp(client: MfaClient, rawCode: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = validateTotpCode(rawCode);
  if (!v.ok) return v;
  const { data: f, error: fe } = await client.auth.mfa.listFactors();
  const factor = f?.totp.find((x) => x.status === "verified");
  if (fe || !factor) return { ok: false, error: "No encontramos tu verificación en dos pasos. Vuelve a entrar." };
  const { data: ch, error: ce } = await client.auth.mfa.challenge({ factorId: factor.id });
  if (ce || !ch) return { ok: false, error: "No pudimos pedir el código. Intenta de nuevo en un momento." };
  const { error } = await client.auth.mfa.verify({ factorId: factor.id, challengeId: ch.id, code: v.code });
  if (error) return { ok: false, error: "Ese código no es correcto o ya venció. Espera el siguiente código en tu aplicación e inténtalo otra vez." };
  return { ok: true };
}
