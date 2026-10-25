import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/card";
import { TimeWorkspace } from "@/components/tiempo/time-workspace";
import { todayLaPaz } from "@/lib/cobros/status";
import { fetchAllRows, fetchPage, parseListParams, resumenTiempo, type RawParams, type TimeAgg } from "@/lib/paginacion";

export const metadata = { title: "Tiempo · Counsel" };

type EntryRow = {
  id: string; case_id: string | null; description: string | null; minutes: number; worked_on: string; billable: boolean; rate: number | string; invoice_id: string | null;
};

export default async function TiempoPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const { page } = parseListParams(sp);
  const { supabase, profile } = await requireStaff();
  const today = todayLaPaz();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [{ rows, meta }, agg, { data: cases }] = await Promise.all([
    // Entradas del mes, paginadas.
    fetchPage<EntryRow>(
      (from, to) =>
        supabase
          .from("time_entries")
          .select("id, case_id, description, minutes, worked_on, billable, rate, invoice_id", { count: "exact" })
          .gte("worked_on", monthStart)
          .order("worked_on", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to)
          .returns<EntryRow[]>(),
      page
    ),
    // Totales del mes completo (columnas mínimas, en trozos): no dependen de la página.
    fetchAllRows((from, to) =>
      supabase
        .from("time_entries")
        .select("case_id, worked_on, minutes, billable, rate")
        .gte("worked_on", monthStart)
        .order("worked_on")
        .order("id")
        .range(from, to)
        .returns<TimeAgg[]>()
    ),
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
        entries={rows.map((e) => ({ ...e, rate: Number(e.rate) }))}
        summary={resumenTiempo(agg)}
        total={meta.total}
        page={meta.page}
        pageSize={meta.pageSize}
      />
    </>
  );
}
