import { PageHeader } from "@/components/ui/card";
import { TareasView } from "@/components/tareas/tareas-view";
import { CASES, ME_ID, TASKS } from "../datos";

export default function Page() {
  return (
    <>
      <PageHeader title="Tareas" subtitle="Lo que tienes pendiente en el despacho." />
      <TareasView tasks={TASKS} cases={CASES.map((c) => ({ id: c.id, title: c.title, case_number: c.case_number }))} people={[{ id: ME_ID, full_name: "Elena Ficticia Rojas" }]} meId={ME_ID} openNew={false} presetCaseId="" />
    </>
  );
}
