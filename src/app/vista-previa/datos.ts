// Datos de ejemplo 100 % ficticios, solo para la vista previa del diseño (desarrollo).
import type { Appointment, Client, Task } from "@/lib/db/types";
import type { CaseView } from "@/components/casos/caso-card";

const FIRM = "00000000-0000-4000-8000-000000000001";
const ME = "00000000-0000-4000-8000-0000000000aa";
const iso = (days: number, hour = 9) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour + 4, 0, 0, 0);
  return d.toISOString();
};
const day = (days: number) => iso(days).slice(0, 10);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const ME_ID = ME;

export const CLIENTS: Client[] = [
  ["Marcos Ejemplo Quispe", "persona", "1000001 LP", "marcos@ejemplo.test", "70000001"],
  ["Lucía Muestra Mamani", "persona", "1000002 LP", "lucia@ejemplo.test", "70000002"],
  ["Comercial Ficticia S.R.L.", "empresa", "9000003", "contacto@ficticia.test", "22000003"],
  ["Rodrigo Prueba Choque", "persona", "1000004 CB", null, "70000004"],
  ["Carmen Demo Flores", "persona", "1000005 SC", "carmen@ejemplo.test", null],
].map(([n, k, ci, em, ph], i) => ({
  id: id(100 + i), firm_id: FIRM, kind: k as "persona" | "empresa", full_name: n as string, ci_nit: ci as string,
  email: em as string | null, phone: ph as string | null, address: null, notes: null, deleted_at: null,
  created_at: iso(-30), updated_at: iso(-3),
}));

const base = { firm_id: FIRM, description: null, responsible_id: ME, portal_visible: true, opened_at: day(-40), deleted_at: null, created_at: iso(-40), updated_at: iso(-2) };

export const CASES: CaseView[] = [
  { ...base, id: id(200), client_id: CLIENTS[0].id, title: "Cobro de alquileres atrasados", case_number: "DEMO-001/2026", matter: "civil", court: "Juzgado Civil 3ro", opponent: "Inquilino Ficticio", stage: "en_tramite", position: 1000, client_name: CLIENTS[0].full_name, next: { kind: "plazo", title: "Plazo para presentar memorial", starts_at: iso(3, 12) } },
  { ...base, id: id(201), client_id: CLIENTS[1].id, title: "Asistencia familiar", case_number: "DEMO-002/2026", matter: "familia", court: "Juzgado de Familia", opponent: null, stage: "audiencia", position: 1000, client_name: CLIENTS[1].full_name, next: { kind: "audiencia", title: "Audiencia de asistencia familiar", starts_at: iso(1, 10) } },
  { ...base, id: id(202), client_id: CLIENTS[2].id, title: "Constitución de sociedad", case_number: null, matter: "comercial", court: null, opponent: null, stage: "nuevo", position: 1000, client_name: CLIENTS[2].full_name },
  { ...base, id: id(203), client_id: CLIENTS[3].id, title: "Denuncia por estafa", case_number: "DEMO-004/2026", matter: "penal", court: null, opponent: null, stage: "en_tramite", position: 2000, client_name: CLIENTS[3].full_name },
  { ...base, id: id(204), client_id: CLIENTS[4].id, title: "Reincorporación laboral", case_number: null, matter: "laboral", court: null, opponent: null, stage: "resolucion", position: 1000, client_name: CLIENTS[4].full_name },
  { ...base, id: id(205), client_id: CLIENTS[0].id, title: "Compraventa de terreno", case_number: null, matter: "civil", court: null, opponent: null, stage: "cerrado", position: 1000, client_name: CLIENTS[0].full_name },
];

const ap = { firm_id: FIRM, client_id: null, notes: null, status: "programada" as const, visible_to_client: false, created_by: ME, created_at: iso(-5), ends_at: null };
export const APPOINTMENTS: Appointment[] = [
  { ...ap, id: id(300), case_id: CASES[1].id, kind: "audiencia", title: "Audiencia de asistencia familiar", location: "Juzgado de Familia", starts_at: iso(0, 15) },
  { ...ap, id: id(301), case_id: CASES[2].id, kind: "cita", title: "Reunión con socios", location: "Oficina", starts_at: iso(1, 15) },
  { ...ap, id: id(302), case_id: CASES[0].id, kind: "plazo", title: "Plazo para presentar memorial", location: null, starts_at: iso(3, 12) },
  { ...ap, id: id(303), case_id: CASES[3].id, kind: "audiencia", title: "Audiencia de medidas cautelares", location: "Juzgado Penal 2do", starts_at: iso(8, 9) },
  { ...ap, id: id(304), case_id: null, kind: "cita", title: "Consulta nueva: Paola Ficticia", location: "Oficina", starts_at: iso(10, 11) },
  { ...ap, id: id(305), case_id: CASES[0].id, kind: "cita", title: "Revisión de contrato", location: "Oficina", starts_at: iso(-4, 10), status: "realizada" },
];

const tk = { firm_id: FIRM, assigned_to: ME, created_at: iso(-6), done_at: null };
export const TASKS: Task[] = [
  { ...tk, id: id(400), case_id: CASES[1].id, title: "Pedir certificado de ingresos al cliente", due_at: day(-1) },
  { ...tk, id: id(401), case_id: CASES[0].id, title: "Redactar memorial de apersonamiento", due_at: day(0) },
  { ...tk, id: id(402), case_id: CASES[2].id, title: "Reservar nombre de la sociedad", due_at: day(4) },
  { ...tk, id: id(403), case_id: null, title: "Renovar suscripción de la biblioteca jurídica", due_at: null },
  { ...tk, id: id(404), case_id: CASES[3].id, title: "Reunir pruebas del denunciante", due_at: day(12) },
  { ...tk, id: id(405), case_id: CASES[0].id, title: "Enviar cobro al cliente", due_at: day(-3), done_at: iso(-2) },
];
