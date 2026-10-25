import { requireStaff } from "@/lib/auth";
import { ClientesView } from "@/components/clientes/clientes-view";
import { fetchPage, orIlike, parseListParams, type RawParams } from "@/lib/paginacion";
import type { Client } from "@/lib/db/types";

export const metadata = { title: "Clientes · Counsel" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<RawParams & { nuevo?: string }> }) {
  const sp = await searchParams;
  const { page, q } = parseListParams(sp);
  const { supabase } = await requireStaff();

  const { rows: clients, meta } = await fetchPage<Client>(
    (from, to) => {
      let query = supabase.from("clients").select("*", { count: "exact" }).is("deleted_at", null);
      if (q) query = query.or(orIlike(["full_name", "ci_nit"], q));
      return query.order("full_name").order("id").range(from, to).returns<Client[]>();
    },
    page
  );

  // Conteo de casos solo para los clientes de esta página.
  const caseCounts: Record<string, number> = {};
  if (clients.length > 0) {
    const { data: cases } = await supabase
      .from("cases").select("client_id").is("deleted_at", null).in("client_id", clients.map((c) => c.id));
    for (const c of cases ?? []) caseCounts[c.client_id as string] = (caseCounts[c.client_id as string] ?? 0) + 1;
  }
  return <ClientesView clients={clients} caseCounts={caseCounts} initialOpen={sp.nuevo === "1"} q={q} total={meta.total} page={meta.page} pageSize={meta.pageSize} />;
}
