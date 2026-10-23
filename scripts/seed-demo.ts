/**
 * Datos DEMO 100 % ficticios (nombres y números inventados).
 *   npx tsx scripts/seed-demo.ts
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Crea el despacho "Despacho Demo" y el usuario
 * demo@counsel.test (la contraseña se imprime al final; cámbiala o borra el usuario antes de producción).
 */
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(url, key, { auth: { persistSession: false } });

const day = (offset: number, hour = 9) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(hour + 4, 0, 0, 0); // hora de La Paz (UTC-4)
  return d.toISOString();
};
const date = (offset: number) => day(offset).slice(0, 10);
const must = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

async function main() {
  const password = "Demo-" + crypto.randomBytes(5).toString("hex");
  const created = await sb.auth.admin.createUser({ email: "demo@counsel.test", password, email_confirm: true, user_metadata: { full_name: "Elena Ficticia Rojas" } });
  if (created.error) throw new Error(created.error.message.includes("already") ? "El usuario demo ya existe: bórralo en Auth para volver a sembrar." : created.error.message);
  const uid = created.data.user.id;

  const firm = must<{ id: string; slug: string }>(await sb.from("firms").insert({ name: "Despacho Demo", slug: "despacho-demo-" + crypto.randomBytes(2).toString("hex") }).select("id,slug").single());
  must(await sb.from("profiles").insert({ id: uid, firm_id: firm.id, full_name: "Elena Ficticia Rojas", email: "demo@counsel.test", role: "owner", hourly_rate: 250 }).select().single());
  const F = { firm_id: firm.id };

  const clients = must(await sb.from("clients").insert([
    { ...F, full_name: "Marcos Ejemplo Quispe", ci_nit: "1000001 LP", email: "marcos@ejemplo.test", phone: "70000001", kind: "persona" },
    { ...F, full_name: "Lucía Muestra Mamani", ci_nit: "1000002 LP", email: "lucia@ejemplo.test", phone: "70000002", kind: "persona" },
    { ...F, full_name: "Comercial Ficticia S.R.L.", ci_nit: "9000003", email: "contacto@ficticia.test", phone: "22000003", kind: "empresa" },
    { ...F, full_name: "Rodrigo Prueba Choque", ci_nit: "1000004 CB", phone: "70000004", kind: "persona" },
    { ...F, full_name: "Carmen Demo Flores", ci_nit: "1000005 SC", email: "carmen@ejemplo.test", kind: "persona" },
  ]).select("id,full_name"));

  const cases = must(await sb.from("cases").insert([
    { ...F, client_id: clients[0].id, title: "Cobro de alquileres atrasados", matter: "civil", stage: "en_tramite", position: 1000, case_number: "DEMO-001/2026", court: "Juzgado Civil 3ro (ficticio)", opponent: "Inquilino Ficticio", responsible_id: uid, description: "Caso de ejemplo: el inquilino adeuda cuatro meses de alquiler." },
    { ...F, client_id: clients[1].id, title: "Asistencia familiar", matter: "familia", stage: "audiencia", position: 1000, case_number: "DEMO-002/2026", court: "Juzgado de Familia (ficticio)", responsible_id: uid },
    { ...F, client_id: clients[2].id, title: "Constitución de sociedad", matter: "comercial", stage: "nuevo", position: 1000, responsible_id: uid },
    { ...F, client_id: clients[3].id, title: "Denuncia por estafa", matter: "penal", stage: "en_tramite", position: 2000, case_number: "DEMO-004/2026", responsible_id: uid },
    { ...F, client_id: clients[4].id, title: "Reincorporación laboral", matter: "laboral", stage: "resolucion", position: 1000, responsible_id: uid },
    { ...F, client_id: clients[0].id, title: "Compraventa de terreno", matter: "civil", stage: "cerrado", position: 1000, responsible_id: uid },
  ]).select("id,title,client_id"));

  must(await sb.from("case_events").insert([
    { ...F, case_id: cases[0].id, kind: "nota", title: "Reunión inicial", body: "El cliente trajo el contrato firmado (ficticio).", visible_to_client: true, created_by: uid },
    { ...F, case_id: cases[0].id, kind: "etapa", title: "Pasó de Nuevo a En trámite", visible_to_client: true, created_by: uid },
    { ...F, case_id: cases[1].id, kind: "nota", title: "Audiencia programada", body: "Preparar documentos de ingresos.", visible_to_client: false, created_by: uid },
  ]).select("id"));

  must(await sb.from("appointments").insert([
    { ...F, case_id: cases[1].id, client_id: cases[1].client_id, kind: "audiencia", title: "Audiencia de asistencia familiar", location: "Juzgado de Familia (ficticio)", starts_at: day(2, 10), ends_at: day(2, 11), visible_to_client: true, created_by: uid },
    { ...F, case_id: cases[0].id, client_id: cases[0].client_id, kind: "plazo", title: "Plazo para presentar memorial", starts_at: day(3, 12), created_by: uid },
    { ...F, case_id: cases[2].id, client_id: cases[2].client_id, kind: "cita", title: "Reunión con socios", location: "Oficina", starts_at: day(1, 15), ends_at: day(1, 16), created_by: uid },
    { ...F, case_id: cases[3].id, client_id: cases[3].client_id, kind: "audiencia", title: "Audiencia de medidas cautelares", starts_at: day(8, 9), created_by: uid },
  ]).select("id"));

  must(await sb.from("tasks").insert([
    { ...F, case_id: cases[0].id, title: "Redactar memorial de apersonamiento", due_at: date(0), assigned_to: uid },
    { ...F, case_id: cases[1].id, title: "Pedir certificado de ingresos al cliente", due_at: date(-1), assigned_to: uid },
    { ...F, case_id: cases[2].id, title: "Reservar nombre de la sociedad", due_at: date(4), assigned_to: uid },
    { ...F, title: "Renovar suscripción de la biblioteca jurídica", assigned_to: uid },
  ]).select("id"));

  const inv = must(await sb.from("invoices").insert([
    { ...F, client_id: clients[0].id, case_id: cases[0].id, number: "F-0001", status: "enviada", issue_date: date(-20), due_date: date(-5) },
    { ...F, client_id: clients[1].id, case_id: cases[1].id, number: "F-0002", status: "pagada", issue_date: date(-30), paid_at: day(-10) },
    { ...F, client_id: clients[2].id, case_id: cases[2].id, number: "F-0003", status: "borrador", issue_date: date(0) },
  ]).select("id"));
  must(await sb.from("invoice_items").insert([
    { ...F, invoice_id: inv[0].id, description: "Honorarios: demanda de cobro", quantity: 1, unit_price: 1800 },
    { ...F, invoice_id: inv[1].id, description: "Honorarios: asistencia familiar", quantity: 1, unit_price: 1200 },
    { ...F, invoice_id: inv[2].id, description: "Constitución de sociedad (ficticia)", quantity: 1, unit_price: 3500 },
  ]).select("id"));
  must(await sb.from("payments").insert([{ ...F, invoice_id: inv[1].id, amount: 1200, method: "transferencia", paid_on: date(-10) }]).select("id"));

  must(await sb.from("time_entries").insert([
    { ...F, case_id: cases[0].id, user_id: uid, description: "Revisión del contrato", minutes: 90, worked_on: date(-2), rate: 250 },
    { ...F, case_id: cases[1].id, user_id: uid, description: "Preparación de audiencia", minutes: 120, worked_on: date(-1), rate: 250 },
  ]).select("id"));

  must(await sb.from("documents").insert([
    { ...F, case_id: cases[0].id, client_id: clients[0].id, title: "Contrato de alquiler (ficticio)", kind: "archivo", created_by: uid },
  ]).select("id"));

  console.log("\nListo. Entra con:\n  correo: demo@counsel.test\n  clave:  " + password);
  console.log(`  formulario público: /consulta/${firm.slug}   reservar: /reservar/${firm.slug}\n`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
