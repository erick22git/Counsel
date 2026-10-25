import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { LogView } from "@/components/auditoria/log-view";
import { CasoDetalle } from "@/components/casos/caso-detalle";
import type { Appointment, Case, CaseEvent, Doc, Task } from "@/lib/db/types";

export const metadata = { title: "Caso · Counsel" };

export default async function CasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase } = await requireStaff();
  const { data: caso } = await supabase.from("cases").select("*").eq("id", id).is("deleted_at", null).maybeSingle<Case>();
  if (!caso) notFound();
  const [{ data: client }, { data: events }, { data: appts }, { data: tasks }, { data: docs }] = await Promise.all([
    supabase.from("clients").select("full_name").eq("id", caso.client_id).maybeSingle(),
    supabase.from("case_events").select("*").eq("case_id", id).order("happened_at", { ascending: false }),
    supabase.from("appointments").select("*").eq("case_id", id).order("starts_at"),
    supabase.from("tasks").select("*").eq("case_id", id).order("due_at", { nullsFirst: false }),
    supabase.from("documents").select("*").eq("case_id", id).is("deleted_at", null).order("updated_at", { ascending: false }),
  ]);
  return (
    <>
    <LogView entity="cases" id={id} />
    <CasoDetalle
      caso={caso}
      clientName={(client?.full_name as string | undefined) ?? "Cliente archivado"}
      events={(events ?? []) as CaseEvent[]}
      appointments={(appts ?? []) as Appointment[]}
      tasks={(tasks ?? []) as Task[]}
      documents={(docs ?? []) as Doc[]}
    />
    </>
  );
}
