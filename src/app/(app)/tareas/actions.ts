"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";

type Result = { ok: true } | { ok: false; error: string };

const taskSchema = z.object({
  title: z.string().trim().min(1, "Escribe la tarea").max(300),
  due_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).nullish(),
  case_id: z.string().uuid().or(z.literal("")).nullish(),
  assigned_to: z.string().uuid().or(z.literal("")).nullish(),
});
export type TaskInput = z.infer<typeof taskSchema>;

const FAIL = "No se pudo guardar. Intenta de nuevo.";
const msg = (e: unknown) => (e instanceof z.ZodError ? (e.issues[0]?.message ?? "Revisa los datos") : FAIL);

export async function createTask(input: TaskInput): Promise<Result> {
  try {
    const { supabase, profile } = await requireStaff();
    const v = taskSchema.parse(input);
    const { error } = await supabase.from("tasks").insert({
      title: v.title,
      due_at: v.due_at || null,
      case_id: v.case_id || null,
      assigned_to: v.assigned_to === undefined || v.assigned_to === null ? profile.id : v.assigned_to || null,
    });
    if (error) return { ok: false, error: FAIL };
    revalidatePath("/tareas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

export async function updateTask(id: string, input: TaskInput): Promise<Result> {
  try {
    const { supabase } = await requireStaff();
    z.string().uuid().parse(id);
    const v = taskSchema.parse(input);
    const { error } = await supabase
      .from("tasks")
      .update({ title: v.title, due_at: v.due_at || null, case_id: v.case_id || null, assigned_to: v.assigned_to || null })
      .eq("id", id);
    if (error) return { ok: false, error: FAIL };
    revalidatePath("/tareas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}

/** Marcar hecha o volver a pendiente (Deshacer). */
export async function setTaskDone(id: string, done: boolean): Promise<Result> {
  try {
    const { supabase } = await requireStaff();
    z.string().uuid().parse(id);
    const { error } = await supabase.from("tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
    if (error) return { ok: false, error: "No se pudo actualizar. Intenta de nuevo." };
    revalidatePath("/tareas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: msg(e) };
  }
}
