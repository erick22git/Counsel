import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Retorno de enlaces de invitación / confirmación de Supabase. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("siguiente") ?? "/panel";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/panel";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safe}`);
  }
  return NextResponse.redirect(`${origin}/login?error=enlace`);
}
