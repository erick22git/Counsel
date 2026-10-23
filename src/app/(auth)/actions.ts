"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface FormState { error?: string }

const loginSchema = z.object({
  email: z.string().email("Escribe un correo válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/panel";
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo." };
  redirect(safeNext(form.get("siguiente")));
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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } });
  if (error) return { error: error.message.includes("registered") ? "Ya existe una cuenta con ese correo." : "No pudimos crear la cuenta. Intenta de nuevo." };
  if (!data.session) return { error: "Revisa tu correo para confirmar la cuenta y luego inicia sesión." };
  const { error: rpcError } = await supabase.rpc("register_firm", { p_firm_name: firm_name, p_full_name: full_name });
  if (rpcError) return { error: "La cuenta se creó pero no pudimos crear el despacho. Inicia sesión para reintentar." };
  // Registro de la aceptación de términos (versión vigente)
  await supabase.from("terms_acceptances").insert([
    { document: "terminos", version: "2026-10" },
    { document: "privacidad", version: "2026-10" },
  ]);
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
  await supabase.from("terms_acceptances").insert([
    { document: "terminos", version: "2026-10" },
    { document: "privacidad", version: "2026-10" },
  ]);
  redirect("/panel");
}
