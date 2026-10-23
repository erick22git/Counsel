// Utilidades puras (sin servidor) del módulo de IA: fáciles de probar.

const STOP = new Set(
  "a al algo ante con contra cual cuales cuando de del desde donde el ella ellos en entre es esta este esto estos fue ha han hay la las le les lo los me mi muy no nos o para pero por que se si sin sobre su sus te tu un una uno y ya como puede pueden debe deben tiene tienen son ser cuál qué cómo cuándo dónde quién".split(" ")
);

/** Convierte una pregunta en lenguaje natural a una consulta websearch (OR entre palabras clave). */
export function toSearchQuery(q: string): string {
  const words = q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return Array.from(new Set(words)).slice(0, 10).join(" or ");
}

export interface SourceForPrompt {
  code: string;
  law_title: string;
  article: string | null;
  heading?: string | null;
  content: string;
  source_name: string;
  source_url: string | null;
  license: string;
  is_demo: boolean;
}

export function sourcesBlock(sources: SourceForPrompt[]): string {
  return sources
    .map(
      (s, i) =>
        `[S${i + 1}] ${s.law_title} (${s.code}) — ${s.article ?? "sin artículo"}${s.is_demo ? " [TEXTO DEMO, NO VIGENTE]" : ""}\n${s.content}`
    )
    .join("\n\n");
}

/** Citas que realmente aparecen en la respuesta ([S1], [S2]…) mapeadas a su fuente; ignora marcadores inexistentes. */
export function usedCitations<T>(answer: string, sources: T[]): { n: number; source: T }[] {
  const found = new Set<number>();
  for (const m of answer.matchAll(/\[S(\d{1,2})\]/g)) found.add(Number(m[1]));
  return [...found]
    .filter((n) => n >= 1 && n <= sources.length)
    .sort((a, b) => a - b)
    .map((n) => ({ n, source: sources[n - 1] }));
}

/** Marcadores [S#] que la IA citó pero no existen entre las fuentes entregadas (posible invención). */
export function invalidCitationMarkers(answer: string, count: number): number[] {
  const bad = new Set<number>();
  for (const m of answer.matchAll(/\[S(\d{1,3})\]/g)) {
    const n = Number(m[1]);
    if (n < 1 || n > count) bad.add(n);
  }
  return [...bad];
}

/** Quita datos personales del texto antes de enviarlo al LLM. */
export function redactPII(text: string, opts: { names?: string[]; ids?: (string | null | undefined)[] } = {}): string {
  let out = text;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const n of opts.names ?? []) {
    if (!n || n.trim().length < 2) continue;
    out = out.replace(new RegExp(esc(n.trim()), "gi"), "[CLIENTE]");
    for (const part of n.trim().split(/\s+/).filter((p) => p.length > 3)) {
      out = out.replace(new RegExp(`\\b${esc(part)}\\b`, "gi"), "[CLIENTE]");
    }
  }
  for (const id of opts.ids ?? []) {
    if (id && id.trim().length >= 4) out = out.replace(new RegExp(esc(id.trim()), "gi"), "[DATO]");
  }
  out = out.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[CORREO]");
  out = out.replace(/(?<![\d/-])(?:\+?591[\s-]?)?[67]\d{7}(?!\d)/g, "[TELÉFONO]");
  out = out.replace(/(?<![\d/-])\d{6,9}(?:-\d[A-Z]?)?(?![\d/-])/g, "[NÚMERO]");
  return out;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|h\d|li|div)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
