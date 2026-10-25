"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByKey, rateLimitReset } from "@/lib/security/rate-limit";
import { safeNextPath, verifyTotp } from "@/lib/security/mfa";

export interface VerifyState { error?: string }

/** Segundo paso del inicio de sesión: challenge + verify con el factor TOTP verificado. */
export async function verifyLogin(_: VerifyState, form: FormData): Promise<VerifyState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const lim = await rateLimitByKey("mfa", auth.user.id, 8, 10 * 60_000);
  if (!lim.ok) return { error: lim.message };
  const r = await verifyTotp(supabase, form.get("code"));
  if (!r.ok) return { error: r.error };
  await rateLimitReset("mfa", auth.user.id);
  redirect(safeNextPath(form.get("siguiente")));
}

export async function cancelVerify() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
