"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { clientSchema } from "@/lib/casos/schemas";

type Res<T extends object = Record<never, never>> = ({ ok: true } & T) | { ok: false; error: string };

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Revisa los datos.";
}

function refresh(id?: string) {
  revalidatePath("/clientes");
  revalidatePath("/casos");
  if (id) revalidatePath(`/clientes/${id}`);
}

export async function createClientAction(input: unknown): Promise<Res<{ id: string }>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.from("clients").insert(parsed.data).select("id").single();
  if (error || !data) return { ok: false, error: "No se pudo guardar el cliente. Intenta de nuevo." };
  refresh();
  return { ok: true, id: data.id as string };
}

export async function updateClientAction(id: string, input: unknown): Promise<Res> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Cliente no válido." };
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("clients").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar los cambios." };
  refresh(id);
  return { ok: true };
}

export async function archiveClientAction(id: string): Promise<Res> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Cliente no válido." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("clients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo archivar el cliente." };
  refresh(id);
  return { ok: true };
}

export async function restoreClientAction(id: string): Promise<Res> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Cliente no válido." };
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("clients").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo deshacer." };
  refresh(id);
  return { ok: true };
}
