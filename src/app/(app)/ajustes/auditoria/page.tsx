import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { requireStaff } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { ENTITIES, PAGE_SIZE, auditQuery, describeEntry, pageRange, parseAuditParams, totalPages } from "@/lib/auditoria/format";

export const metadata = { title: "Auditoría · Counsel" };

type Row = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  summary: string;
  meta: { actor?: string | null; changes?: Record<string, { from: string | null; to: string | null }> } | null;
  at: string;
};

const ACTION_PILL: Record<string, { label: string; tone: "ok" | "accent" | "danger" | "neutral" }> = {
  create: { label: "Creó", tone: "ok" },
  update: { label: "Cambió", tone: "accent" },
  delete: { label: "Eliminó", tone: "danger" },
  view: { label: "Vio", tone: "neutral" },
};

export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, profile } = await requireStaff();

  if (profile.role !== "owner") {
    return (
      <>
        <PageHeader title="Auditoría" />
        <Card className="max-w-2xl">
          <h2 className="text-[length:var(--text-heading-sm)]">Solo la persona titular puede ver esta página</h2>
          <p className="mt-2 text-ink-2">
            Aquí se guarda quién creó, cambió o abrió cada caso, documento y cobro. Si necesitas algo de este registro, pídeselo a la persona titular del despacho.
          </p>
        </Card>
      </>
    );
  }

  const p = parseAuditParams(await searchParams);
  const { data: people } = await supabase.from("profiles").select("id,full_name").neq("role", "client").order("full_name");

  const build = (page: number) => {
    let q = supabase
      .from("audit_log")
      .select("id,user_id,action,entity,summary,meta,at", { count: "exact" })
      .order("at", { ascending: false });
    if (p.usuario) q = q.eq("user_id", p.usuario);
    if (p.entidad) q = q.eq("entity", p.entidad);
    if (p.desde) q = q.gte("at", `${p.desde}T00:00:00-04:00`);
    if (p.hasta) q = q.lte("at", `${p.hasta}T23:59:59.999-04:00`);
    if (p.q) q = q.or(`summary.ilike.*${p.q}*,meta->>actor.ilike.*${p.q}*`);
    const { from, to } = pageRange(page);
    return q.range(from, to);
  };

  let { data, count } = await build(p.pagina);
  const pages = totalPages(count ?? 0);
  let pagina = p.pagina;
  if (!data && pagina > 1) {
    pagina = pages;
    ({ data, count } = await build(pagina));
  }
  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const filtered = Boolean(p.q || p.usuario || p.entidad || p.desde || p.hasta);

  return (
    <>
      <PageHeader title="Auditoría" subtitle="Quién creó, cambió, eliminó o abrió cada cosa. Solo tú puedes verlo y nadie puede editarlo." />

      <Card className="mb-6">
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5 font-medium">
            Buscar
            <Input name="q" defaultValue={p.q} placeholder="Nombre del caso, cliente, persona…" maxLength={80} />
          </label>
          <label className="grid gap-1.5 font-medium">
            Persona
            <Select name="usuario" defaultValue={p.usuario ?? ""}>
              <option value="">Todas</option>
              {(people ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 font-medium">
            Qué
            <Select name="entidad" defaultValue={p.entidad ?? ""}>
              <option value="">Todo</option>
              {Object.entries(ENTITIES).map(([id, e]) => (
                <option key={id} value={id}>
                  {e.plural}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5 font-medium">
            Desde
            <Input type="date" name="desde" defaultValue={p.desde ?? ""} />
          </label>
          <label className="grid gap-1.5 font-medium">
            Hasta
            <Input type="date" name="hasta" defaultValue={p.hasta ?? ""} />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            {filtered && (
              <Button asChild variant="outline">
                <Link href="/ajustes/auditoria">Quitar filtros</Link>
              </Button>
            )}
          </div>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No hay movimientos con esos filtros" : "Todavía no hay movimientos"}
          description={filtered ? "Prueba con otras fechas o quita algún filtro." : "Aquí aparecerá lo que haga tu equipo en los casos, clientes, documentos y cobros."}
          action={filtered ? <Button asChild variant="secondary"><Link href="/ajustes/auditoria">Quitar filtros</Link></Button> : undefined}
        />
      ) : (
        <Card className="p-0">
          <p className="px-6 pt-4 text-ink-3 text-[length:var(--text-body-sm)]">
            {total} {total === 1 ? "movimiento" : "movimientos"} · página {pagina} de {pages}
          </p>
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const a = ACTION_PILL[r.action] ?? ACTION_PILL.update;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
                  <Pill tone={a.tone}>{a.label}</Pill>
                  <p className="min-w-0 flex-1 basis-72">{describeEntry({ action: r.action, entity: r.entity, summary: r.summary, meta: r.meta })}</p>
                  <time dateTime={r.at} className="text-ink-3 text-[length:var(--text-body-sm)]">
                    {fmtDateTime(r.at)}
                  </time>
                </li>
              );
            })}
          </ul>
          <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
            {pagina > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/ajustes/auditoria${auditQuery(p, { pagina: pagina - 1 })}`}>Anterior</Link>
              </Button>
            ) : (
              <span />
            )}
            <span className="text-ink-2">
              {PAGE_SIZE} por página
            </span>
            {pagina < pages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/ajustes/auditoria${auditQuery(p, { pagina: pagina + 1 })}`}>Siguiente</Link>
              </Button>
            ) : (
              <span />
            )}
          </nav>
        </Card>
      )}
      <p className="mt-4 max-w-prose text-ink-3 text-[length:var(--text-body-sm)]">
        Este registro crece con el tiempo y no se borra. Las horas se muestran según tu zona horaria.
      </p>
    </>
  );
}
