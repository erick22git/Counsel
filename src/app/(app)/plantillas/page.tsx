import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import type { Template } from "@/lib/db/types";
import type { FillCase, FillClient } from "@/components/editor/template-fill-dialog";
import { Gallery } from "./gallery";

export const metadata = { title: "Plantillas · Counsel" };

export default async function Plantillas() {
  const { supabase } = await requireStaff();
  const [t, cl, ca] = await Promise.all([
    supabase.from("templates").select("*").order("title").limit(500),
    supabase.from("clients").select("id, full_name, ci_nit, address, phone").is("deleted_at", null).order("full_name").limit(500),
    supabase.from("cases").select("id, title, case_number, court, opponent, client_id").is("deleted_at", null).order("title").limit(500),
  ]);

  return (
    <>
      <PageHeader title="Plantillas" subtitle="Modelos de escritos y contratos. Elige uno, completa los datos y empieza a editar." />
      <Gallery
        templates={(t.data ?? []) as Template[]}
        clients={(cl.data ?? []) as FillClient[]}
        cases={(ca.data ?? []) as FillCase[]}
      />
    </>
  );
}
