import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Firm, Profile } from "@/lib/db/types";

/** Devuelve usuario + perfil + despacho, o redirige a /login. Para páginas del personal del despacho. */
export async function requireStaff() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle<Profile>();
  if (!profile) redirect("/bienvenida"); // usuario sin despacho: completar registro
  if (profile.role === "client") redirect("/portal");
  if (profile.active === false) redirect("/acceso-desactivado"); // el titular quitó este acceso
  const { data: firm } = await supabase.from("firms").select("*").eq("id", profile.firm_id).single<Firm>();
  return { supabase, user: auth.user, profile, firm: firm! };
}

/** Para el portal del cliente. */
export async function requireClient() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?siguiente=/portal");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle<Profile>();
  if (!profile || profile.role !== "client" || !profile.client_id) redirect("/panel");
  return { supabase, user: auth.user, profile };
}
