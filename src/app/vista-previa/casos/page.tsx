import { CasosView } from "@/components/casos/casos-view";
import { CASES, CLIENTS } from "../datos";

export default function Page() {
  return <CasosView cases={CASES} clients={CLIENTS.map((c) => ({ id: c.id, full_name: c.full_name }))} initialOpen={false} presetClientId={null} />;
}
