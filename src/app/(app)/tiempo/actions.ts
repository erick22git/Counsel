"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { firstError, timeEntrySchema, type ActionResult } from "@/lib/cobros/schemas";
import { round2 } from "@/lib/cobros/money";

const uuid = z.string().uuid();
const MSG = "No se pudo guardar. Intenta de nuevo.";

function refresh() {
  revalidatePath("/tiempo");
  revalidatePath("/cobros");
}

const clean = (v: z.infer<typeof timeEntrySchema>) => ({
  case_id: v.case_id ?? null,
  description: v.description?.trim() || null,
  minutes: v.minutes,
  worked_on: v.worked_on,
  billable: v.billable,
  rate: round2(v.rate),
});

export async function createTimeEntry(input: unknown): Promise<ActionResult<{ id: string }>> {
  const p = timeEntrySchema.safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.from("time_entries").insert(clean(p.data)).select("id").single();
  if (error) return { ok: false, error: MSG };
  refresh();
  return { ok: true, id: data.id };
}

export async function updateTimeEntry(id: unknown, input: unknown): Promise<ActionResult> {
  const i = uuid.safeParse(id);
  const p = timeEntrySchema.safeParse(input);
  if (!i.success) return { ok: false, error: "Entrada no válida" };
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { supabase } = await requireStaff();
  const { data: cur } = await supabase.from("time_entries").select("invoice_id").eq("id", i.data).maybeSingle();
  if (!cur) return { ok: false, error: "No se encontró la entrada." };
  if (cur.invoice_id) return { ok: false, error: "Estas horas ya están en un cobro. Anula el cobro para editarlas." };
  const { error } = await supabase.from("time_entries").update(clean(p.data)).eq("id", i.data);
  if (error) return { ok: false, error: MSG };
  refresh();
  return { ok: true };
}

const rowSchema = timeEntrySchema.extend({ id: uuid });

/** Elimina (definitivo) y devuelve la fila para poder recrearla con Deshacer. */
export async function deleteTimeEntry(id: unknown): Promise<ActionResult<{ row: z.infer<typeof rowSchema> }>> {
  const i = uuid.safeParse(id);
  if (!i.success) return { ok: false, error: "Entrada no válida" };
  const { supabase } = await requireStaff();
  const { data: row } = await supabase
    .from("time_entries")
    .select("id, case_id, description, minutes, worked_on, billable, rate, invoice_id")
    .eq("id", i.data)
    .maybeSingle();
  if (!row) return { ok: false, error: "No se encontró la entrada." };
  if (row.invoice_id) return { ok: false, error: "Estas horas ya están en un cobro. Anula el cobro para borrarlas." };
  const { error } = await supabase.from("time_entries").delete().eq("id", i.data);
  if (error) return { ok: false, error: MSG };
  refresh();
  return {
    ok: true,
    row: { id: row.id, case_id: row.case_id, description: row.description, minutes: row.minutes, worked_on: row.worked_on, billable: row.billable, rate: Number(row.rate) },
  };
}

export async function restoreTimeEntry(input: unknown): Promise<ActionResult> {
  const p = rowSchema.safeParse(input);
  if (!p.success) return { ok: false, error: firstError(p.error) };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("time_entries").insert({ id: p.data.id, ...clean(p.data) });
  if (error) return { ok: false, error: MSG };
  refresh();
  return { ok: true };
}
