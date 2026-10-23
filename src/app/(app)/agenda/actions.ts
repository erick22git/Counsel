"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { laPazToIso } from "@/lib/agenda/dates";

type Result = { ok: true } | { ok: false; error: string };

const uuidOrEmpty = z.string().uuid().or(z.literal("")).optional();
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const appointmentSchema = z.object({
  kind: z.enum(["audiencia", "cita", "plazo"]),
  title: z.string().trim().min(1, "Escribe un título").max(200),
  case_id: uuidOrEmpty,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha"),
  start: z.string().regex(timeRe, "Elige la hora de inicio"),
  end: z.string().regex(timeRe).or(z.literal("")).optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(5000).optional(),
  visible_to_client: z.boolean(),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

async function buildRow(input: AppointmentInput, supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"]) {
  const v = appointmentSchema.parse(input);
  const starts_at = laPazToIso(v.date, v.start);
  const ends_at = v.end ? laPazToIso(v.date, v.end) : null;
  if (ends_at && ends_at < starts_at) throw new Error("La hora de fin debe ser después del inicio");
  let client_id: string | null = null;
  if (v.case_id) {
    const { data } = await supabase.from("cases").select("client_id").eq("id", v.case_id).maybeSingle();
    client_id = (data?.client_id as string | undefined) ?? null;
  }
  return {
    kind: v.kind,
    title: v.title,
    case_id: v.case_id || null,
    client_id,
    starts_at,
    ends_at,
    location: v.location || null,
    notes: v.notes || null,
    // Sin caso no hay portal que lo muestre.
    visible_to_client: v.visible_to_client && !!v.case_id,
  };
}

function message(e: unknown) {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Revisa los datos";
  return e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo.";
}

export async function createAppointment(input: AppointmentInput): Promise<Result> {
  try {
    const { supabase, profile } = await requireStaff();
    const row = await buildRow(input, supabase);
    const { error } = await supabase.from("appointments").insert({ ...row, created_by: profile.id });
    if (error) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
    revalidatePath("/agenda");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function updateAppointment(id: string, input: AppointmentInput): Promise<Result> {
  try {
    const { supabase } = await requireStaff();
    z.string().uuid().parse(id);
    const row = await buildRow(input, supabase);
    const { error } = await supabase.from("appointments").update(row).eq("id", id);
    if (error) return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
    revalidatePath("/agenda");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/** Marcar realizada, cancelada o volver a programada (sirve para Deshacer). */
export async function setAppointmentStatus(id: string, status: "programada" | "realizada" | "cancelada"): Promise<Result> {
  try {
    const { supabase } = await requireStaff();
    z.string().uuid().parse(id);
    z.enum(["programada", "realizada", "cancelada"]).parse(status);
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) return { ok: false, error: "No se pudo actualizar. Intenta de nuevo." };
    revalidatePath("/agenda");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}
