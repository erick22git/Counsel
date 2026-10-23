import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/card";
import { TimeWorkspace } from "@/components/tiempo/time-workspace";
import { todayLaPaz } from "@/lib/cobros/status";

export const metadata = { title: "Tiempo · Counsel" };

export default async function TiempoPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff();
  const today = todayLaPaz();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [{ data: entries }, { data: cases }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id, case_id, description, minutes, worked_on, billable, rate, invoice_id")
      .gte("worked_on", monthStart)
      .order("worked_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase.from("cases").select("id, title").is("deleted_at", null).order("title"),
  ]);

  return (
    <>
      <PageHeader title="Tiempo" subtitle="Mide tus horas de trabajo y cóbralas después." />
      <TimeWorkspace
        today={today}
        defaultRate={Number(profile.hourly_rate ?? 0)}
        cases={cases ?? []}
        openManual={Boolean(sp.nuevo)}
        entries={(entries ?? []).map((e) => ({ ...e, rate: Number(e.rate) }))}
      />
    </>
  );
}
