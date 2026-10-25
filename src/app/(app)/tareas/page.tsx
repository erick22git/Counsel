import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { TareasView } from "@/components/tareas/tareas-view";
import { addDays, laPazToIso, todayKey } from "@/lib/agenda/dates";
import { buildHref, PAGE_SIZE, parsePage, type RawParams } from "@/lib/paginacion";
import type { Task } from "@/lib/db/types";

export const metadata = { title: "Tareas · Counsel" };

/** Tope de tareas pendientes cargadas (las más próximas primero). */
const MAX_PENDIENTES = 500;

export default async function TareasPage({ searchParams }: { searchParams: Promise<RawParams & { nuevo?: string; caso?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff();
  // Las hechas se muestran de a PAGE_SIZE; `hechas=N` carga N bloques ("Ver más hechas").
  const bloques = parsePage(sp.hechas);

  const doneSince = laPazToIso(addDays(todayKey(), -30), "00:00");
  const [pend, done, { data: cases }, { data: people }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .is("done_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("id")
      .limit(MAX_PENDIENTES)
      .returns<Task[]>(),
    supabase
      .from("tasks")
      .select("*", { count: "exact" })
      .not("done_at", "is", null)
      .gte("done_at", doneSince)
      .order("done_at", { ascending: false })
      .order("id")
      .limit(PAGE_SIZE * bloques)
      .returns<Task[]>(),
    supabase.from("cases").select("id,title,case_number").is("deleted_at", null).order("title").returns<{ id: string; title: string; case_number: string | null }[]>(),
    supabase.rpc("team_directory"),
  ]);
  const tasks = [...(pend.data ?? []), ...(done.data ?? [])];
  const hechasTotal = done.count ?? (done.data ?? []).length;
  const hechasMoreHref = hechasTotal > (done.data ?? []).length ? buildHref("/tareas", { hechas: String(bloques + 1) }, 1) + "#hechas" : null;
  const pendientesTruncadas = (pend.count ?? 0) > MAX_PENDIENTES;

  return (
    <>
      <PageHeader title="Tareas" subtitle="Lo que tienes pendiente en el despacho." />
      <TareasView
        tasks={tasks}
        hechasTotal={hechasTotal}
        hechasMoreHref={hechasMoreHref}
        pendientesTruncadas={pendientesTruncadas}
        hechasAbierto={bloques > 1}
        cases={cases ?? []}
        people={(people ?? []) as { id: string; full_name: string }[]}
        meId={profile.id}
        openNew={sp.nuevo === "1"}
        presetCaseId={sp.caso && /^[0-9a-f-]{36}$/i.test(sp.caso) ? sp.caso : ""}
      />
    </>
  );
}
