import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { TareasView } from "@/components/tareas/tareas-view";
import { addDays, laPazToIso, todayKey } from "@/lib/agenda/dates";
import type { Task } from "@/lib/db/types";

export const metadata = { title: "Tareas · Counsel" };

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ nuevo?: string; caso?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaff();

  const doneSince = laPazToIso(addDays(todayKey(), -30), "00:00");
  const [{ data: tasks }, { data: cases }, { data: people }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .or(`done_at.is.null,done_at.gte.${doneSince}`)
      .order("due_at", { ascending: true, nullsFirst: false })
      .returns<Task[]>(),
    supabase.from("cases").select("id,title,case_number").is("deleted_at", null).order("title").returns<{ id: string; title: string; case_number: string | null }[]>(),
    supabase.from("profiles").select("id,full_name").neq("role", "client").order("full_name").returns<{ id: string; full_name: string }[]>(),
  ]);

  return (
    <>
      <PageHeader title="Tareas" subtitle="Lo que tienes pendiente en el despacho." />
      <TareasView
        tasks={tasks ?? []}
        cases={cases ?? []}
        people={people ?? []}
        meId={profile.id}
        openNew={sp.nuevo === "1"}
        presetCaseId={sp.caso && /^[0-9a-f-]{36}$/i.test(sp.caso) ? sp.caso : ""}
      />
    </>
  );
}
