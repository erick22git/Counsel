/** Lógica pura de la auditoría: textos legibles, filtros y paginación. Sin dependencias de servidor. */

export const PAGE_SIZE = 25;

export const ENTITIES: Record<string, { label: string; article: "el" | "la"; plural: string }> = {
  cases: { label: "caso", article: "el", plural: "Casos" },
  clients: { label: "cliente", article: "el", plural: "Clientes" },
  documents: { label: "documento", article: "el", plural: "Documentos" },
  document_versions: { label: "versión de documento", article: "la", plural: "Versiones de documentos" },
  invoices: { label: "factura", article: "la", plural: "Facturas" },
  payments: { label: "pago", article: "el", plural: "Pagos" },
  profiles: { label: "miembro del equipo", article: "el", plural: "Equipo" },
};
export const ENTITY_IDS = Object.keys(ENTITIES);

/** Entidades para las que se puede registrar "quién vio" (logView). */
export const VIEWABLE_ENTITIES = ["cases", "documents", "clients"] as const;
export type ViewableEntity = (typeof VIEWABLE_ENTITIES)[number];

const STAGE_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  en_tramite: "En trámite",
  audiencia: "Audiencia",
  resolucion: "Resolución",
  cerrado: "Cerrado",
};
const INVOICE_STATUS: Record<string, string> = { borrador: "Borrador", enviada: "Enviada", pagada: "Pagada", anulada: "Anulada" };
const ROLE_NAMES: Record<string, string> = { owner: "Titular", lawyer: "Abogado", assistant: "Asistente", client: "Cliente" };

/** Campo -> [frase "la etapa", formateador de valores] */
const FIELDS: Record<string, { phrase: string; value?: (v: string | null) => string }> = {
  stage: { phrase: "la etapa", value: (v) => (v ? (STAGE_LABELS[v] ?? v) : "—") },
  title: { phrase: "el título" },
  full_name: { phrase: "el nombre" },
  status: { phrase: "el estado", value: (v) => (v ? (INVOICE_STATUS[v] ?? v) : "—") },
  role: { phrase: "el rol", value: (v) => (v ? (ROLE_NAMES[v] ?? v) : "—") },
  responsible_id: { phrase: "el responsable" },
  amount: { phrase: "el monto" },
  case_number: { phrase: "el número de expediente" },
  court: { phrase: "el juzgado" },
  portal_visible: { phrase: "la visibilidad en el portal", value: (v) => (v === "true" ? "Visible" : "Oculto") },
  shared_with_client: { phrase: "si se comparte con el cliente", value: (v) => (v === "true" ? "Compartido" : "No compartido") },
  email: { phrase: "el correo" },
  phone: { phrase: "el teléfono" },
  due_date: { phrase: "el vencimiento" },
  hourly_rate: { phrase: "la tarifa por hora" },
};

export interface AuditEntry {
  action: string;
  entity: string;
  summary: string;
  meta: {
    actor?: string | null;
    changes?: Record<string, { from: string | null; to: string | null }>;
  } | null;
  actorName?: string | null;
}

function firstName(full: string | null | undefined): string {
  const t = (full ?? "").trim();
  return t ? t.split(/\s+/)[0] : "Alguien";
}

/** Texto legible en español: "Elena cambió la etapa del caso «X» de Nuevo a En trámite". */
export function describeEntry(e: AuditEntry): string {
  const who = firstName(e.actorName ?? e.meta?.actor);
  const ent = ENTITIES[e.entity] ?? { label: e.entity, article: "el" as const, plural: e.entity };
  const del = ent.article === "el" ? "del" : "de la";
  const target = e.summary ? `${ent.label} «${e.summary}»` : ent.label;

  switch (e.action) {
    case "create":
      return e.entity === "profiles" ? `${who} agregó al equipo a «${e.summary}»` : `${who} creó ${ent.article} ${target}`;
    case "delete":
      return `${who} eliminó definitivamente ${ent.article} ${target}`;
    case "view":
      return `${who} abrió ${ent.article} ${target}`;
  }

  const changes = Object.entries(e.meta?.changes ?? {});
  if (changes.length === 0) return `${who} modificó ${ent.article} ${target}`;

  // Archivar / restaurar
  const del_ = e.meta?.changes?.deleted_at;
  if (del_ && changes.length === 1) {
    return del_.to ? `${who} archivó ${ent.article} ${target}` : `${who} restauró ${ent.article} ${target}`;
  }
  if (e.entity === "profiles" && e.meta?.changes?.active && changes.length === 1) {
    return e.meta.changes.active.to === "true" ? `${who} devolvió el acceso a «${e.summary}»` : `${who} quitó el acceso a «${e.summary}»`;
  }

  if (changes.length === 1) {
    const [key, ch] = changes[0];
    const f = FIELDS[key];
    if (f) {
      const fmt = f.value ?? ((v: string | null) => (v && v.length ? v : "—"));
      return `${who} cambió ${f.phrase} ${del} ${target} de ${fmt(ch.from)} a ${fmt(ch.to)}`;
    }
  }
  const names = changes.map(([k]) => FIELDS[k]?.phrase.replace(/^(el|la) /, "") ?? k.replace(/_/g, " "));
  return `${who} modificó ${ent.article} ${target} (${names.join(", ")})`;
}

// ───────────────────────── Filtros y paginación ─────────────────────────
export interface AuditParams {
  pagina: number;
  q: string;
  usuario: string | null;
  entidad: string | null;
  desde: string | null;
  hasta: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseAuditParams(sp: Record<string, string | string[] | undefined>): AuditParams {
  const pagina = Math.max(1, Math.min(100000, parseInt(one(sp.pagina), 10) || 1));
  // Se quitan caracteres que tienen significado en filtros de PostgREST y en LIKE.
  const q = one(sp.q).replace(/[,()%*_\\"'.:]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const usuario = UUID_RE.test(one(sp.usuario)) ? one(sp.usuario) : null;
  const entidad = ENTITY_IDS.includes(one(sp.entidad)) ? one(sp.entidad) : null;
  const desde = DATE_RE.test(one(sp.desde)) ? one(sp.desde) : null;
  const hasta = DATE_RE.test(one(sp.hasta)) ? one(sp.hasta) : null;
  return { pagina, q, usuario, entidad, desde, hasta };
}

export function pageRange(pagina: number, size = PAGE_SIZE): { from: number; to: number } {
  const from = (Math.max(1, pagina) - 1) * size;
  return { from, to: from + size - 1 };
}

export function totalPages(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** Construye la query string conservando filtros (para enlaces de paginación). */
export function auditQuery(p: Partial<AuditParams>, overrides: Partial<AuditParams> = {}): string {
  const m = { ...p, ...overrides };
  const u = new URLSearchParams();
  if (m.q) u.set("q", m.q);
  if (m.usuario) u.set("usuario", m.usuario);
  if (m.entidad) u.set("entidad", m.entidad);
  if (m.desde) u.set("desde", m.desde);
  if (m.hasta) u.set("hasta", m.hasta);
  if (m.pagina && m.pagina > 1) u.set("pagina", String(m.pagina));
  const s = u.toString();
  return s ? `?${s}` : "";
}
