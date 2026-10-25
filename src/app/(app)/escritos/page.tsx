import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { BuscadorLista } from "@/components/paginacion/buscador-lista";
import { Paginacion } from "@/components/paginacion/paginacion";
import { fetchPage, ilikePattern, parseListParams, type RawParams } from "@/lib/paginacion";
import { NewEscrito } from "./new-escrito";

export const metadata = { title: "Escritos · Counsel" };

type Row = {
  id: string; title: string; current_version: number; updated_at: string; cases: { title: string; case_number: string | null } | null;
};

export default async function Escritos({ searchParams }: { searchParams: Promise<RawParams & { nuevo?: string }> }) {
  const sp = await searchParams;
  const { page, q } = parseListParams(sp);
  const { supabase } = await requireStaff();
  const { rows, meta } = await fetchPage<Row>((from, to) => {
    let query = supabase
      .from("documents")
      .select("id, title, current_version, updated_at, cases(title, case_number)", { count: "exact" })
      .eq("kind", "escrito")
      .is("deleted_at", null);
    if (q) query = query.ilike("title", ilikePattern(q));
    return query.order("updated_at", { ascending: false }).order("id").range(from, to).returns<Row[]>();
  }, page);
  const nuevo = sp.nuevo === "1";

  return (
    <>
      <PageHeader
        title="Escritos"
        subtitle="Tus memoriales, contratos y cartas. Se guardan solos mientras escribes."
        action={meta.total > 0 || q ? <NewEscrito defaultOpen={nuevo} /> : undefined}
      />
      {(meta.total > 0 || q) && (
        <BuscadorLista basePath="/escritos" q={q} id="buscar-escrito" label="Buscar escrito" placeholder="Por título" clearHref="/escritos" />
      )}
      {meta.total === 0 && q ? (
        <Card className="text-center text-ink-2">No encontramos escritos con “{q}”. Prueba con otra palabra.</Card>
      ) : meta.total === 0 ? (
        <EmptyState
          title="Aún no tienes escritos"
          description="Empieza en blanco o usa una plantilla lista para completar."
          action={<NewEscrito defaultOpen={nuevo} />}
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((d) => (
            <li key={d.id}>
              <Link href={`/escritos/${d.id}`} className="press block">
                <Card className="flex flex-wrap items-center gap-4 hover:bg-surface-2">
                  <FileText size={24} aria-hidden className="text-ink-3" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[length:var(--text-subheading)] font-semibold">{d.title}</p>
                    <p className="text-ink-2">
                      {d.cases ? `Caso: ${d.cases.case_number ? d.cases.case_number + " · " : ""}${d.cases.title}` : "Sin caso"} · Editado {fmtDateTime(d.updated_at)}
                    </p>
                  </div>
                  <Pill>Versión {d.current_version}</Pill>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Paginacion total={meta.total} page={meta.page} pageSize={meta.pageSize} basePath="/escritos" params={{ q }} noun="escritos" />
    </>
  );
}
