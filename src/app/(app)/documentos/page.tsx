import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { requireStaff } from "@/lib/auth";
import { TIPO_LABEL, type DocTipo } from "@/lib/documentos/files";
import {
  applyDocTipo, enumParam, fetchPage, ilikePattern, parseListParams, uuidParam, type RawParams,
} from "@/lib/paginacion";
import { BuscadorLista } from "@/components/paginacion/buscador-lista";
import { Paginacion } from "@/components/paginacion/paginacion";
import type { Doc } from "@/lib/db/types";
import { DocumentList, type DocRow } from "@/components/documentos/document-list";
import { UploadDialog, type CaseOption } from "@/components/documentos/upload-dialog";

export const metadata = { title: "Documentos · Counsel" };

type CaseJoin = { title: string; clients: { full_name: string } | { full_name: string }[] | null };
type Row = Doc & { cases: CaseJoin | CaseJoin[] | null };

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function DocumentosPage({
  searchParams,
}: { searchParams: Promise<RawParams & { nuevo?: string }> }) {
  const sp = await searchParams;
  const { supabase, firm } = await requireStaff();
  const { page, q, filters } = parseListParams(sp, {
    filters: { caso: uuidParam, tipo: enumParam(Object.keys(TIPO_LABEL)) },
  });
  const caso = filters.caso;
  const tipo = filters.tipo as DocTipo | "";

  const [{ rows, meta }, { data: caseRows }] = await Promise.all([
    fetchPage<Row>((from, to) => {
      let query = supabase
        .from("documents")
        .select("*, cases(title, clients(full_name))", { count: "exact" })
        .is("deleted_at", null);
      if (q) query = query.ilike("title", ilikePattern(q));
      if (caso) query = query.eq("case_id", caso);
      query = applyDocTipo(query, tipo);
      return query.order("updated_at", { ascending: false }).order("id").range(from, to).returns<Row[]>();
    }, page),
    supabase
      .from("cases")
      .select("id, title, clients(full_name)")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  const cases: CaseOption[] = ((caseRows ?? []) as unknown as { id: string; title: string; clients: { full_name: string } | { full_name: string }[] | null }[]).map((c) => ({
    id: c.id,
    label: `${c.title}${one(c.clients) ? ` — ${one(c.clients)!.full_name}` : ""}`,
  }));

  const docs: DocRow[] = rows.map((r) => {
    const c = one(r.cases);
    const client = c ? one(c.clients) : null;
    const { cases: _c, ...doc } = r;
    void _c;
    return { ...doc, case_label: c ? `${c.title}${client ? ` — ${client.full_name}` : ""}` : null };
  });

  const filtering = !!(q || caso || tipo);

  const uploadButton = (
    <UploadDialog firmId={firm.id} cases={cases} defaultCaseId={caso || null} defaultOpen={sp.nuevo === "1"} />
  );

  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle="Todos los archivos y escritos de su despacho, con historial de versiones."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="secondary">
              <Link href="/plantillas">Nuevo escrito</Link>
            </Button>
            {uploadButton}
          </div>
        }
      />

      <BuscadorLista
        basePath="/documentos" q={q} id="f-q" label="Buscar por título" placeholder="Ej.: poder notarial"
        clearHref="/documentos" active={Boolean(q || caso || tipo)}
      >
        <div className="grid gap-1.5">
          <label htmlFor="f-caso" className="font-medium">Caso</label>
          <Select id="f-caso" name="caso" defaultValue={caso}>
            <option value="">Todos los casos</option>
            {cases.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="f-tipo" className="font-medium">Tipo</label>
          <Select id="f-tipo" name="tipo" defaultValue={tipo}>
            <option value="">Todos</option>
            {(Object.keys(TIPO_LABEL) as DocTipo[]).map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </Select>
        </div>
      </BuscadorLista>

      {docs.length === 0 ? (
        filtering ? (
          <EmptyState
            title="No encontramos documentos"
            description="Pruebe con otro título o quite los filtros."
            action={<Button asChild variant="outline"><Link href="/documentos">Ver todos</Link></Button>}
          />
        ) : (
          <EmptyState
            title="Aún no hay documentos"
            description="Suba un PDF, un Word o una foto, y quedará guardado con su historial. También puede crear un escrito desde una plantilla."
          />
        )
      ) : (
        <>
          <DocumentList docs={docs} firmId={firm.id} cases={cases} />
          <Paginacion total={meta.total} page={meta.page} pageSize={meta.pageSize} basePath="/documentos" params={{ q, caso, tipo }} noun="documentos" />
        </>
      )}
    </>
  );
}
