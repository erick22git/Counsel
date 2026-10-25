"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  name: z.string().trim().min(2, "Escribe tu nombre").max(200),
  contact: z.string().trim().min(5, "Déjanos un correo o teléfono").max(200),
  reason: z.string().trim().min(3, "Cuéntanos brevemente el motivo").max(1000),
  preferred: z.string().min(10, "Elige fecha y hora"),
});

export async function requestAppointment(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const when = new Date(d.preferred);
  if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) return { ok: false, error: "Elige una fecha futura." };
  const lim = await rateLimit("cita", 4);
  if (!lim.ok) return { ok: false, error: lim.message };
  const isEmail = d.contact.includes("@");
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_appointment", {
    p_slug: d.slug, p_name: d.name, p_email: isEmail ? d.contact : "", p_phone: isEmail ? "" : d.contact, p_reason: d.reason, p_preferred: when.toISOString(),
  });
  if (error) return { ok: false, error: "No pudimos enviar tu solicitud. Intenta de nuevo." };
  return { ok: true };
}
