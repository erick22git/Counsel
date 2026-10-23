// Filtros de búsqueda (sin tildes ni mayúsculas) y próximo plazo por caso.
export function norm(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function matchesText(haystack: (string | null | undefined)[], query: string): boolean {
  const q = norm(query);
  if (!q) return true;
  return haystack.some((h) => norm(h).includes(q));
}

export interface CaseFilterable {
  title: string;
  case_number: string | null;
  matter: string;
  client_id: string;
  opponent?: string | null;
}

export function filterCases<T extends CaseFilterable>(
  cases: T[],
  opts: { text: string; matter: string; clientName: (clientId: string) => string }
): T[] {
  return cases.filter(
    (c) =>
      (!opts.matter || c.matter === opts.matter) &&
      matchesText([c.title, c.case_number, opts.clientName(c.client_id), c.opponent], opts.text)
  );
}

export interface ClientSearchable {
  full_name: string;
  ci_nit: string | null;
}
export function filterClients<T extends ClientSearchable>(clients: T[], query: string): T[] {
  return clients.filter((c) => matchesText([c.full_name, c.ci_nit], query));
}

/** Primer plazo/audiencia/cita futura por caso. `appts` puede venir en cualquier orden. */
export function nextAppointmentByCase<T extends { case_id: string | null; starts_at: string; status: string }>(
  appts: T[],
  now: Date = new Date()
): Map<string, T> {
  const map = new Map<string, T>();
  const sorted = [...appts].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const a of sorted) {
    if (!a.case_id || a.status !== "programada" || new Date(a.starts_at) < now) continue;
    if (!map.has(a.case_id)) map.set(a.case_id, a);
  }
  return map;
}
