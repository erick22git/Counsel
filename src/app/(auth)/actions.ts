"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { acceptTerms } from "@/lib/legal/actions";
import { createClient } from "@/lib/supabase/server";
import { clientIp, rateLimitByKey, rateLimitReset } from "@/lib/security/rate-limit";
import { needsMfaChallenge, safeNextPath } from "@/lib/security/mfa";

export interface FormState { error?: string }

const loginSchema = z.object({
  email: z.string().email("Escribe un correo válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

const safeNext = (v: FormDataEntryValue | null) => safeNextPath(v);

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // Límite de intentos: por IP+correo (8 en 15 min) y por IP (40 en 15 min).
  const ip = await clientIp();
  const key = `${ip}:${parsed.data.email.toLowerCase()}`;
  const [a, b] = await Promise.all([
    rateLimitByKey("login", key, 8, 15 * 60_000),
    rateLimitByKey("login-ip", ip, 40, 15 * 60_000),
  ]);
  const blocked = !a.ok ? a : !b.ok ? b : null;
  if (blocked) return { error: blocked.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo." };
  await rateLimitReset("login", key);
  // MFA opcional: si tiene factor verificado, falta el segundo paso.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const next = safeNext(form.get("siguiente"));
  if (needsMfaChallenge(aal)) redirect(`/login/verificar?siguiente=${encodeURIComponent(next)}`);
  redirect(next);
}

const registerSchema = z.object({
  full_name: z.string().min(2, "Escribe tu nombre completo"),
  firm_name: z.string().min(2, "Escribe el nombre de tu despacho"),
  email: z.string().email("Escribe un correo válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  accept: z.literal("on", { error: "Debes aceptar los términos y la política de privacidad" }),
});

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password, full_name, firm_name } = parsed.data;
  const lim = await rateLimitByKey("registro", `${await clientIp()}:${email.toLowerCase()}`, 5, 30 * 60_000);
  if (!lim.ok) return { error: lim.message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } });
  if (error) return { error: error.message.includes("registered") ? "Ya existe una cuenta con ese correo." : "No pudimos crear la cuenta. Intenta de nuevo." };
  if (!data.session) return { error: "Revisa tu correo para confirmar la cuenta y luego inicia sesión." };
  const { error: rpcError } = await supabase.rpc("register_firm", { p_firm_name: firm_name, p_full_name: full_name });
  if (rpcError) return { error: "La cuenta se creó pero no pudimos crear el despacho. Inicia sesión para reintentar." };
  await acceptTerms();
  redirect("/panel");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Usuario autenticado pero sin despacho (p. ej. confirmó el correo después). */
export async function completeFirm(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z.object({ full_name: z.string().min(2, "Escribe tu nombre"), firm_name: z.string().min(2, "Escribe el nombre del despacho") }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_firm", { p_firm_name: parsed.data.firm_name, p_full_name: parsed.data.full_name });
  if (error) return { error: "No pudimos crear el despacho. Intenta de nuevo." };
  await acceptTerms();
  redirect("/panel");
}
