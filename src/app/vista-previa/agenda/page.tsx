import { PageHeader } from "@/components/ui/card";
import { AgendaView } from "@/components/agenda/agenda-view";
import { APPOINTMENTS, CASES } from "../datos";

export default function Page() {
  return (
    <>
      <PageHeader title="Agenda" subtitle="Audiencias, citas y plazos de tu despacho." />
      <AgendaView appointments={APPOINTMENTS} cases={CASES.map((c) => ({ id: c.id, title: c.title, case_number: c.case_number }))} openNew={false} presetCaseId="" />
    </>
  );
}
