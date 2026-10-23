"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";

const schema = z.object({ id: z.string().uuid(), done: z.boolean() });

/** Marca una tarea como hecha (o la deshace). RLS decide si el usuario puede. */
export async function setTaskDone(input: { id: string; done: boolean }): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "No pude identificar la tarea." };
  const { supabase } = await requireStaff();
  const { error } = await supabase
    .from("tasks")
    .update({ done_at: parsed.data.done ? new Date().toISOString() : null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "No se pudo guardar el cambio. Intenta de nuevo." };
  revalidatePath("/panel");
  revalidatePath("/tareas");
  return { ok: true };
}
