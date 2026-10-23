import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { requireStaff } from "@/lib/auth";
import { TIPO_LABEL, docTipo, type DocTipo } from "@/lib/documentos/files";
import type { Doc } from "@/lib/db/types";
import { DocumentList, type DocRow } from "@/components/documentos/document-list";
import { UploadDialog, type CaseOption } from "@/components/documentos/upload-dialog";

export const metadata = { title: "Documentos · Counsel" };

type CaseJoin = { title: string; clients: { full_name: string } | { full_name: string }[] | null };
type Row = Doc & { cases: CaseJoin | CaseJoin[] | null };

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export default async function DocumentosPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; caso?: string; tipo?: string; nuevo?: string }> }) {
  const sp = await searchParams;
  const { supabase, firm } = await requireStaff();
  const q = (sp.q ?? "").trim();
  const caso = sp.caso && /^[0-9a-f-]{36}$/i.test(sp.caso) ? sp.caso : "";
  const tipo = (sp.tipo && sp.tipo in TIPO_LABEL ? sp.tipo : "") as DocTipo | "";

  let query = supabase
    .from("documents")
    .select("*, cases(title, clients(full_name))")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (q) query = query.ilike("title", `%${q.replace(/[%_,]/g, " ")}%`);
  if (caso) query = query.eq("case_id", caso);

  const [{ data: rows }, { data: caseRows }] = await Promise.all([
    query,
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

  let docs: DocRow[] = ((rows ?? []) as unknown as Row[]).map((r) => {
    const c = one(r.cases);
    const client = c ? one(c.clients) : null;
    const { cases: _c, ...doc } = r;
    void _c;
    return { ...doc, case_label: c ? `${c.title}${client ? ` — ${client.full_name}` : ""}` : null };
  });
  if (tipo) docs = docs.filter((d) => docTipo(d) === tipo);

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

      <form method="get" className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_12rem_auto]" role="search" aria-label="Buscar documentos">
        <div className="grid gap-1.5">
          <label htmlFor="f-q" className="font-medium">Buscar por título</label>
          <Input id="f-q" name="q" defaultValue={q} placeholder="Ej.: poder notarial" />
        </div>
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
        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline">Buscar</Button>
          {filtering && (
            <Button asChild variant="ghost"><Link href="/documentos">Quitar filtros</Link></Button>
          )}
        </div>
      </form>

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
        <DocumentList docs={docs} firmId={firm.id} cases={cases} />
      )}
    </>
  );
}
