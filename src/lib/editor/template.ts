// Lógica pura de plantillas (sin DOM ni red): reutilizable por el módulo de IA.
import type { Template } from "@/lib/db/types";

export type TemplateVariable = Template["variables"][number];
export type VarValues = Record<string, string | undefined | null>;

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Escapa texto para insertarlo como HTML (anti-XSS). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Claves `{{x}}` únicas, en orden de aparición. */
export function extractVariables(html: string): string[] {
  const seen = new Set<string>();
  for (const m of html.matchAll(VAR_RE)) seen.add(m[1]);
  return [...seen];
}

/** "2026-10-23" → "23 de octubre de 2026". Si no es una fecha ISO, devuelve el texto tal cual. */
export function formatDateLong(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return iso;
  return `${day} de ${MESES[month - 1]} de ${m[1]}`;
}

/** Fecha de hoy (ISO) en la zona de Bolivia. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * Reemplaza `{{clave}}` por el valor (escapado). Las variables sin valor quedan como
 * `<mark class="var">[Etiqueta]</mark>` para que el abogado las vea en el editor.
 * Si se pasa `variables`, las de tipo `fecha` se escriben en formato largo y las `largo` conservan saltos de línea.
 */
export function renderTemplate(html: string, values: VarValues, variables: TemplateVariable[] = []): string {
  const meta = new Map(variables.map((v) => [v.key, v]));
  return html.replace(VAR_RE, (_all, key: string) => {
    const raw = values[key];
    const v = typeof raw === "string" ? raw.trim() : "";
    if (!v) {
      const label = meta.get(key)?.label ?? key;
      return `<mark class="var">[${escapeHtml(label)}]</mark>`;
    }
    const type = meta.get(key)?.type;
    const text = type === "fecha" ? formatDateLong(v) : v;
    const safe = escapeHtml(text);
    return type === "largo" ? safe.replace(/\r?\n/g, "<br>") : safe;
  });
}

/** Cuántas variables siguen sin llenar en un HTML ya renderizado. */
export function countUnfilled(html: string): number {
  return (html.match(/<mark class="var">/g) ?? []).length;
}

export interface AutofillClient { full_name: string; ci_nit?: string | null; address?: string | null; phone?: string | null }
export interface AutofillCase { case_number?: string | null; court?: string | null; opponent?: string | null }

/** Valores conocidos a partir del cliente y del caso elegidos. No pisa nada: solo devuelve lo que se sabe. */
export function autofillValues(opts: { client?: AutofillClient | null; case?: AutofillCase | null; now?: Date; ciudad?: string }): Record<string, string> {
  const out: Record<string, string> = { fecha: todayIso(opts.now), ciudad: opts.ciudad ?? "La Paz" };
  const c = opts.client;
  if (c) {
    out.cliente_nombre = c.full_name;
    if (c.ci_nit) out.cliente_ci = c.ci_nit;
    if (c.address) out.cliente_domicilio = c.address;
    if (c.phone) out.cliente_telefono = c.phone;
  }
  const k = opts.case;
  if (k) {
    if (k.case_number) out.caso_numero = k.case_number;
    if (k.court) out.juzgado = k.court;
    if (k.opponent) out.contraparte_nombre = k.opponent;
  }
  return out;
}

/** Une los valores del autollenado con lo que la persona ya escribió (lo escrito manda). */
export function mergeValues(auto: Record<string, string>, typed: Record<string, string>): Record<string, string> {
  const out = { ...auto };
  for (const [k, v] of Object.entries(typed)) if (v.trim()) out[k] = v;
  return out;
}
