"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mailNotice } from "@/lib/email/send";
import { confirmationEmail } from "@/lib/email/reminders";

type R = { ok: true; caseId?: string; notice?: string } | { ok: false; error: string };
const id = z.string().uuid();

/** Convierte una consulta en cliente + caso nuevo. */
export async function convertIntake(input: string): Promise<R> {
  const intakeId = id.parse(input);
  const supabase = await createClient();
  const { data: i } = await supabase.from("intake_submissions").select("*").eq("id", intakeId).maybeSingle();
  if (!i || i.status !== "nueva") return { ok: false, error: "Esta consulta ya fue atendida." };
  const { data: client, error: e1 } = await supabase
    .from("clients").insert({ full_name: i.full_name, email: i.email, phone: i.phone, notes: "Llegó desde el formulario de consultas." }).select("id").single();
  if (e1) return { ok: false, error: "No se pudo crear el cliente." };
  const matter = ["civil","penal","familia","laboral","comercial","administrativo","constitucional","otro"].includes(i.matter ?? "") ? i.matter : "otro";
  const { data: c, error: e2 } = await supabase
    .from("cases").insert({ client_id: client.id, title: `Consulta de ${i.full_name}`, matter, description: i.message, stage: "nuevo" }).select("id").single();
  if (e2) return { ok: false, error: "Se creó el cliente pero no el caso." };
  await supabase.from("intake_submissions").update({ status: "convertida", client_id: client.id }).eq("id", intakeId);
  revalidatePath("/consultas");
  return { ok: true, caseId: c.id };
}

export async function dismissIntake(input: string, undo = false): Promise<R> {
  const supabase = await createClient();
  await supabase.from("intake_submissions").update({ status: undo ? "nueva" : "descartada" }).eq("id", id.parse(input));
  revalidatePath("/consultas");
  return { ok: true };
}

/** Confirma la solicitud: crea la cita en la agenda y avisa por email si dejó correo. */
export async function confirmRequest(input: string): Promise<R> {
  const supabase = await createClient();
  const { data: r } = await supabase.from("appointment_requests").select("*").eq("id", id.parse(input)).maybeSingle();
  if (!r || r.status !== "pendiente") return { ok: false, error: "Esta solicitud ya fue respondida." };
  const end = new Date(new Date(r.preferred_at).getTime() + 60 * 60 * 1000).toISOString();
  const { data: a, error } = await supabase
    .from("appointments").insert({ kind: "cita", title: `Cita con ${r.full_name}`, notes: r.reason, starts_at: r.preferred_at, ends_at: end }).select("id").single();
  if (error) return { ok: false, error: "No se pudo crear la cita." };
  await supabase.from("appointment_requests").update({ status: "confirmada", appointment_id: a.id }).eq("id", r.id);
  if (r.email) {
    await supabase.from("notifications").insert(confirmationEmail({ full_name: r.full_name, email: r.email, preferred_at: r.preferred_at }));
  }
  revalidatePath("/consultas");
  revalidatePath("/agenda");
  // Sin RESEND_API_KEY el aviso queda en cola: se lo decimos a la persona en vez de fallar en silencio.
  return { ok: true, notice: r.email ? mailNotice() ?? undefined : undefined };
}

export async function rejectRequest(input: string): Promise<R> {
  const supabase = await createClient();
  const { data: r } = await supabase.from("appointment_requests").select("*").eq("id", id.parse(input)).maybeSingle();
  if (!r) return { ok: false, error: "No encontrada." };
  await supabase.from("appointment_requests").update({ status: "rechazada" }).eq("id", r.id);
  if (r.email) {
    await supabase.from("notifications").insert({
      to_email: r.email, kind: "cita_rechazada", subject: "Sobre tu solicitud de cita",
      body: `Hola ${r.full_name}, no podemos atender en el horario que pediste. Por favor propón otro horario desde el mismo enlace.`,
    });
  }
  revalidatePath("/consultas");
  return { ok: true };
}
