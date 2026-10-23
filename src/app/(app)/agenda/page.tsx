import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { AgendaView } from "@/components/agenda/agenda-view";
import { addDays, laPazToIso, todayKey } from "@/lib/agenda/dates";
import type { Appointment } from "@/lib/db/types";

export const metadata = { title: "Agenda · Counsel" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ nuevo?: string; caso?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();

  const since = laPazToIso(addDays(todayKey(), -400), "00:00");
  const [{ data: appts }, { data: cases }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .neq("status", "cancelada")
      .gte("starts_at", since)
      .order("starts_at", { ascending: true })
      .returns<Appointment[]>(),
    supabase.from("cases").select("id,title,case_number").is("deleted_at", null).order("title").returns<{ id: string; title: string; case_number: string | null }[]>(),
  ]);

  return (
    <>
      <PageHeader title="Agenda" subtitle="Audiencias, citas y plazos de tu despacho." />
      <AgendaView
        appointments={appts ?? []}
        cases={cases ?? []}
        openNew={sp.nuevo === "1"}
        presetCaseId={sp.caso && /^[0-9a-f-]{36}$/i.test(sp.caso) ? sp.caso : ""}
      />
    </>
  );
}
