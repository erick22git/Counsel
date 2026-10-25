"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";

export interface PublicState { error?: string; done?: boolean }

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  name: z.string().trim().min(2, "Escribe tu nombre").max(200),
  email: z.string().trim().email("Revisa tu correo").max(200).or(z.literal("")),
  phone: z.string().trim().max(30),
  matter: z.string().trim().max(40),
  message: z.string().trim().min(10, "Cuéntanos un poco más (mínimo 10 letras)").max(4000),
  website: z.string().max(0).optional(), // honeypot: los humanos no lo ven
  accept: z.literal("on", { error: "Debes aceptar el tratamiento de tus datos" }),
});

export async function submitIntake(_: PublicState, form: FormData): Promise<PublicState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.email && !d.phone) return { error: "Déjanos un correo o un teléfono para responderte." };
  const lim = await rateLimit("intake", 5);
  if (!lim.ok) return { error: lim.message };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_intake", {
    p_slug: d.slug, p_name: d.name, p_email: d.email, p_phone: d.phone, p_matter: d.matter, p_message: d.message,
  });
  if (error) return { error: "No pudimos enviar tu consulta. Intenta de nuevo." };
  return { done: true };
}
