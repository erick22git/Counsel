"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "./versions";

/** Registra aceptación de términos y privacidad con fecha, IP y navegador. */
export async function acceptTerms() {
  const supabase = await createClient();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = h.get("user-agent")?.slice(0, 300) ?? null;
  await supabase
    .from("terms_acceptances")
    .upsert(
      ["terminos", "privacidad"].map((document) => ({ document, version: TERMS_VERSION, ip, user_agent: ua })),
      { onConflict: "user_id,document,version", ignoreDuplicates: true }
    );
}
