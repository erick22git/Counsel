import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { CasosView } from "@/components/casos/casos-view";
import type { CaseView } from "@/components/casos/caso-card";
import { nextAppointmentByCase } from "@/lib/casos/filters";
import { STAGE_IDS } from "@/lib/casos/board";
import { MATTERS } from "@/lib/format";
import { enumParam, fetchPage, ilikePattern, orIlike, parseListParams, type RawParams } from "@/lib/paginacion";
import type { Appointment, Case } from "@/lib/db/types";

export const metadata = { title: "Casos · Counsel" };

/** Tope de tarjetas por columna en el tablero. */
const KANBAN_PER_COLUMN = 200;

type Row = Case & { clients: { full_name: string } | { full_name: string }[] | null };
const clientName = (c: Row["clients"]) => (Array.isArray(c) ? c[0]?.full_name : c?.full_name);

export default async function CasosPage({ searchParams }: { searchParams: Promise<RawParams & { nuevo?: string; cliente?: string }> }) {
  const sp = await searchParams;
  const { page, q, filters } = parseListParams(sp, {
    filters: { materia: enumParam(Object.keys(MATTERS)), vista: enumParam(["tablero", "lista"] as const) },
  });
  const materia = filters.materia;
  const vista = filters.vista === "lista" ? "lista" : "tablero";
  const { supabase } = await requireStaff();

  // La búsqueda incluye el nombre del cliente: se buscan primero los clientes que coinciden.
  let orFilter = "";
  if (q) {
    const { data: hit } = await supabase.from("clients").select("id").is("deleted_at", null).ilike("full_name", ilikePattern(q)).limit(50);
    const ids = (hit ?? []).map((c) => c.id as string);
    orFilter = [orIlike(["title", "case_number", "opponent"], q), ids.length ? `client_id.in.(${ids.join(",")})` : ""].filter(Boolean).join(",");
  }
  const base = () => {
    let query = supabase.from("cases").select("*, clients(full_name)", { count: "exact" }).is("deleted_at", null);
    if (materia) query = query.eq("matter", materia);
    if (orFilter) query = query.or(orFilter);
    return query;
  };

  let rows: Row[] = [];
  let total = 0;
  let pageNo = 1;
  let pageSize = 25;
  const truncated: string[] = [];
  if (vista === "lista") {
    const r = await fetchPage<Row>((from, to) => base().order("updated_at", { ascending: false }).order("id").range(from, to).returns<Row[]>(), page);
    rows = r.rows;
    total = r.meta.total;
    pageNo = r.meta.page;
    pageSize = r.meta.pageSize;
  } else {
    // Tablero: lo activo de cada etapa, con tope de 200 tarjetas por columna (las más recientes).
    const cols = await Promise.all(
      STAGE_IDS.map((s) => base().eq("stage", s).order("updated_at", { ascending: false }).order("id").limit(KANBAN_PER_COLUMN).returns<Row[]>())
    );
    cols.forEach((c, i) => {
      rows.push(...(c.data ?? []));
      if ((c.count ?? 0) > KANBAN_PER_COLUMN) truncated.push(STAGE_IDS[i]);
    });
    total = cols.reduce((s, c) => s + (c.count ?? (c.data ?? []).length), 0);
  }

  // Cuántos casos hay en total, sin filtros (para decidir entre "no hay casos" y "ninguno coincide").
  const [{ data: clients }, { count: anyCount }] = await Promise.all([
    supabase.from("clients").select("id, full_name").is("deleted_at", null).order("full_name"),
    supabase.from("cases").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  let apptQuery = supabase
    .from("appointments").select("case_id, kind, title, starts_at, status")
    .not("case_id", "is", null).eq("status", "programada").gte("starts_at", new Date().toISOString())
    .order("starts_at");
  apptQuery = vista === "lista" && rows.length > 0 ? apptQuery.in("case_id", rows.map((c) => c.id)) : apptQuery.limit(500);
  const { data: appts } = await apptQuery;
  const next = nextAppointmentByCase((appts ?? []) as Pick<Appointment, "case_id" | "kind" | "title" | "starts_at" | "status">[]);

  const views: CaseView[] = rows.map(({ clients: cl, ...c }) => ({
    ...c,
    client_name: clientName(cl) ?? "Cliente archivado",
    next: next.get(c.id) ? { kind: next.get(c.id)!.kind, title: next.get(c.id)!.title, starts_at: next.get(c.id)!.starts_at } : null,
  }));
  const preset = z.string().uuid().safeParse(sp.cliente).success ? (sp.cliente as string) : null;
  return (
    <CasosView
      cases={views}
      clients={(clients ?? []).map((c) => ({ id: c.id as string, full_name: c.full_name as string }))}
      initialOpen={sp.nuevo === "1" || !!preset}
      presetClientId={preset}
      vista={vista}
      q={q}
      materia={materia}
      hasAny={(anyCount ?? 0) > 0}
      total={total}
      page={pageNo}
      pageSize={pageSize}
      truncatedStages={truncated}
      perColumn={KANBAN_PER_COLUMN}
    />
  );
}
