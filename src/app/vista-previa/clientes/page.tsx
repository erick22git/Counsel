import { ClientesView } from "@/components/clientes/clientes-view";
import { CASES, CLIENTS } from "../datos";

export default function Page() {
  const counts: Record<string, number> = {};
  for (const c of CASES) counts[c.client_id] = (counts[c.client_id] ?? 0) + 1;
  return <ClientesView clients={CLIENTS} caseCounts={counts} initialOpen={false} />;
}
