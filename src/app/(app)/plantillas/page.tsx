import { PageHeader } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import type { Template } from "@/lib/db/types";
import type { FillCase, FillClient } from "@/components/editor/template-fill-dialog";
import { Paginacion } from "@/components/paginacion/paginacion";
import { fetchPage, orIlike, parseListParams, type RawParams } from "@/lib/paginacion";
import { Gallery } from "./gallery";

export const metadata = { title: "Plantillas · Counsel" };

export default async function Plantillas({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const { page, q } = parseListParams(sp);
  const { supabase } = await requireStaff();
  const [list, cl, ca] = await Promise.all([
    fetchPage<Template>((from, to) => {
      let query = supabase.from("templates").select("*", { count: "exact" });
      if (q) query = query.or(orIlike(["title", "description", "category"], q));
      return query.order("category").order("title").order("id").range(from, to).returns<Template[]>();
    }, page),
    supabase.from("clients").select("id, full_name, ci_nit, address, phone").is("deleted_at", null).order("full_name").limit(500),
    supabase.from("cases").select("id, title, case_number, court, opponent, client_id").is("deleted_at", null).order("title").limit(500),
  ]);

  return (
    <>
      <PageHeader title="Plantillas" subtitle="Modelos de escritos y contratos. Elige uno, completa los datos y empieza a editar." />
      <Gallery
        templates={list.rows}
        clients={(cl.data ?? []) as FillClient[]}
        cases={(ca.data ?? []) as FillCase[]}
        q={q}
        total={list.meta.total}
      />
      <Paginacion total={list.meta.total} page={list.meta.page} pageSize={list.meta.pageSize} basePath="/plantillas" params={{ q }} noun="plantillas" />
    </>
  );
}
