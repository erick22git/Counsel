import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui/card";
import { InvoiceForm } from "@/components/cobros/invoice-form";
import { todayLaPaz } from "@/lib/cobros/status";

export const metadata = { title: "Nuevo cobro · Counsel" };

export default async function NuevoCobro({ searchParams }: { searchParams: Promise<{ [k: string]: string | undefined }> }) {
  const sp = await searchParams;
  const { supabase, firm } = await requireStaff();
  const [{ data: clients }, { data: cases }] = await Promise.all([
    supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
    supabase.from("cases").select("id, title, client_id").is("deleted_at", null).order("title"),
  ]);
  return (
    <>
      <PageHeader title="Nuevo cobro" subtitle="Cuenta de cobro interna para tu cliente." />
      <InvoiceForm
        clients={clients ?? []}
        cases={cases ?? []}
        today={todayLaPaz()}
        defaultCurrency={firm.currency}
        initialClientId={sp.cliente}
        initialCaseId={sp.caso}
      />
    </>
  );
}
