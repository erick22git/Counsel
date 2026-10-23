import { requireStaff } from "@/lib/auth";
import { ClientesView } from "@/components/clientes/clientes-view";
import type { Client } from "@/lib/db/types";

export const metadata = { title: "Clientes · Counsel" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const [{ data: clients }, { data: cases }] = await Promise.all([
    supabase.from("clients").select("*").is("deleted_at", null).order("full_name"),
    supabase.from("cases").select("client_id").is("deleted_at", null),
  ]);
  const caseCounts: Record<string, number> = {};
  for (const c of cases ?? []) caseCounts[c.client_id as string] = (caseCounts[c.client_id as string] ?? 0) + 1;
  return <ClientesView clients={(clients ?? []) as Client[]} caseCounts={caseCounts} initialOpen={sp.nuevo === "1"} />;
}
