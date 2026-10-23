"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  theme: z.enum(["claro", "oscuro", "sistema"]),
  fontSize: z.enum(["normal", "grande", "muy-grande"]),
  density: z.enum(["comoda", "compacta"]),
});

export async function savePreferences(input: unknown) {
  const prefs = schema.parse(input);
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };
  const { error } = await supabase.from("profiles").update({ preferences: prefs }).eq("id", auth.user.id);
  return { ok: !error };
}
