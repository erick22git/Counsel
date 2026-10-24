import { PageHeader } from "@/components/ui/card";
import { PrefsForm } from "@/app/(app)/ajustes/prefs-form";

export default function Page() {
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Hazlo cómodo para ti. Se guarda en tu cuenta." />
      <div className="max-w-2xl"><PrefsForm /></div>
    </>
  );
}
