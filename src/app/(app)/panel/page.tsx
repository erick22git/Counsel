import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Inicio · Counsel" };

export default async function Panel() {
  const { profile } = await requireStaff();
  return (
    <>
      <PageHeader title={`Hola, ${profile.full_name.split(" ")[0]}`} subtitle="Esto es lo que necesitas hoy." />
      <EmptyState title="Todo en calma" description="Cuando crees casos y citas, aquí verás lo que vence hoy." />
    </>
  );
}
