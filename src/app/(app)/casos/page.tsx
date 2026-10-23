import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { CasosView } from "@/components/casos/casos-view";
import type { CaseView } from "@/components/casos/caso-card";
import { nextAppointmentByCase } from "@/lib/casos/filters";
import type { Appointment, Case } from "@/lib/db/types";

export const metadata = { title: "Casos · Counsel" };

export default async function CasosPage({ searchParams }: { searchParams: Promise<{ nuevo?: string; cliente?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const [{ data: cases }, { data: clients }, { data: appts }] = await Promise.all([
    supabase.from("cases").select("*").is("deleted_at", null).order("position"),
    supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
    supabase
      .from("appointments").select("case_id, kind, title, starts_at, status")
      .not("case_id", "is", null).eq("status", "programada").gte("starts_at", new Date().toISOString())
      .order("starts_at").limit(500),
  ]);
  const names = new Map((clients ?? []).map((c) => [c.id as string, c.full_name as string]));
  const next = nextAppointmentByCase((appts ?? []) as Pick<Appointment, "case_id" | "kind" | "title" | "starts_at" | "status">[]);
  const views: CaseView[] = ((cases ?? []) as Case[]).map((c) => ({
    ...c,
    client_name: names.get(c.client_id) ?? "Cliente archivado",
    next: next.get(c.id) ? { kind: next.get(c.id)!.kind, title: next.get(c.id)!.title, starts_at: next.get(c.id)!.starts_at } : null,
  }));
  const preset = z.string().uuid().safeParse(sp.cliente).success ? sp.cliente! : null;
  return (
    <CasosView
      cases={views}
      clients={(clients ?? []).map((c) => ({ id: c.id as string, full_name: c.full_name as string }))}
      initialOpen={sp.nuevo === "1" || !!preset}
      presetClientId={preset}
    />
  );
}
