"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitByKey } from "@/lib/security/rate-limit";
import { validateTotpCode } from "@/lib/security/mfa";

type Err = { ok: false; error: string };
const GENERIC: Err = { ok: false, error: "No pudimos completar la acción. Intenta de nuevo." };
const BAD_CODE = "Ese código no es correcto o ya venció. Espera el siguiente código e inténtalo otra vez.";

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

/** Empieza la activación: borra intentos a medias y pide un factor TOTP nuevo (QR + código secreto). */
export async function startEnroll(): Promise<{ ok: true; factorId: string; qr: string; secret: string } | Err> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Vuelve a iniciar sesión." };
  const { data: f } = await supabase.auth.mfa.listFactors();
  for (const x of f?.all ?? []) if (x.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: x.id });
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Counsel ${Date.now()}` });
  if (error || !data) return { ok: false, error: "No pudimos preparar la verificación. Intenta de nuevo." };
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Confirma la activación con el primer código. */
export async function confirmEnroll(factorId: string, rawCode: string): Promise<{ ok: true } | Err> {
  const id = z.string().uuid().safeParse(factorId);
  const code = validateTotpCode(rawCode);
  if (!id.success) return GENERIC;
  if (!code.ok) return code;
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Vuelve a iniciar sesión." };
  const lim = await rateLimitByKey("mfa", user.id, 8, 10 * 60_000);
  if (!lim.ok) return { ok: false, error: lim.message };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id.data, code: code.code });
  if (error) return { ok: false, error: BAD_CODE };
  revalidatePath("/ajustes/seguridad");
  return { ok: true };
}

/** Cancela una activación a medias. */
export async function cancelEnroll(factorId: string): Promise<{ ok: true } | Err> {
  const id = z.string().uuid().safeParse(factorId);
  if (!id.success) return GENERIC;
  const { supabase } = await me();
  await supabase.auth.mfa.unenroll({ factorId: id.data });
  return { ok: true };
}

/** Desactiva: exige un código vigente (challenge+verify) y luego quita el factor. */
export async function disableMfa(rawCode: string): Promise<{ ok: true } | Err> {
  const code = validateTotpCode(rawCode);
  if (!code.ok) return code;
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Vuelve a iniciar sesión." };
  const lim = await rateLimitByKey("mfa", user.id, 8, 10 * 60_000);
  if (!lim.ok) return { ok: false, error: lim.message };
  const { data: f } = await supabase.auth.mfa.listFactors();
  const factors = f?.totp ?? [];
  if (!factors.length) return { ok: true };
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factors[0].id, code: code.code });
  if (error) return { ok: false, error: BAD_CODE };
  for (const x of factors) {
    const r = await supabase.auth.mfa.unenroll({ factorId: x.id });
    if (r.error) return GENERIC;
  }
  revalidatePath("/ajustes/seguridad");
  return { ok: true };
}

/**
 * Solo el titular: quita la verificación de un integrante que perdió su teléfono.
 * Requiere SUPABASE_SERVICE_ROLE_KEY (admin API). Sin ella: BLOQUEADO.
 */
export async function resetMemberMfa(memberId: string): Promise<{ ok: true } | Err> {
  const id = z.string().uuid().safeParse(memberId);
  if (!id.success) return GENERIC;
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Vuelve a iniciar sesión." };
  if (user.id === id.data) return { ok: false, error: "Para tu propia cuenta usa «Desactivar» con un código vigente." };
  const { data: mine } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (mine?.role !== "owner") return { ok: false, error: "Solo el titular del despacho puede hacerlo." };
  // RLS: solo veo perfiles de mi despacho
  const { data: target } = await supabase.from("profiles").select("id").eq("id", id.data).maybeSingle();
  if (!target) return { ok: false, error: "No encontramos a esa persona en tu despacho." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, error: "BLOQUEADO: requiere SUPABASE_SERVICE_ROLE_KEY en el servidor." };
  const admin = createAdminClient();
  const { data: list, error } = await admin.auth.admin.mfa.listFactors({ userId: id.data });
  if (error) return GENERIC;
  for (const f of list?.factors ?? []) {
    const r = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: id.data });
    if (r.error) return GENERIC;
  }
  revalidatePath("/ajustes/seguridad");
  return { ok: true };
}
