// Tipos de filas (espejo de supabase/migrations). Mantener sincronizados al cambiar el esquema.
export type UserRole = "owner" | "lawyer" | "assistant" | "client";
export type Stage = "nuevo" | "en_tramite" | "audiencia" | "resolucion" | "cerrado";
export type Matter = "civil" | "penal" | "familia" | "laboral" | "comercial" | "administrativo" | "constitucional" | "otro";

export interface Preferences {
  theme: "claro" | "oscuro" | "sistema";
  fontSize: "normal" | "grande" | "muy-grande";
  density: "comoda" | "compacta";
}
export const DEFAULT_PREFS: Preferences = { theme: "sistema", fontSize: "normal", density: "comoda" };

export interface Firm {
  id: string; name: string; slug: string; intake_enabled: boolean; bot_enabled: boolean; currency: "BOB" | "USD"; created_at: string;
}
export interface Profile {
  id: string; firm_id: string; full_name: string; email: string | null; role: UserRole; client_id: string | null;
  hourly_rate: number; preferences: Preferences; created_at: string;
}
export interface Client {
  id: string; firm_id: string; kind: "persona" | "empresa"; full_name: string; ci_nit: string | null; email: string | null;
  phone: string | null; address: string | null; notes: string | null; deleted_at: string | null; created_at: string; updated_at: string;
}
export interface Case {
  id: string; firm_id: string; client_id: string; title: string; case_number: string | null; matter: Matter; court: string | null;
  opponent: string | null; description: string | null; stage: Stage; position: number; responsible_id: string | null;
  portal_visible: boolean; opened_at: string; deleted_at: string | null; created_at: string; updated_at: string;
}
export interface CaseEvent {
  id: string; firm_id: string; case_id: string; kind: "nota" | "etapa" | "documento" | "audiencia" | "tarea" | "pago" | "mensaje" | "sistema";
  title: string; body: string | null; visible_to_client: boolean; created_by: string | null; happened_at: string;
}
export interface Appointment {
  id: string; firm_id: string; case_id: string | null; client_id: string | null; kind: "audiencia" | "cita" | "plazo"; title: string;
  location: string | null; starts_at: string; ends_at: string | null; notes: string | null; status: "programada" | "realizada" | "cancelada";
  visible_to_client: boolean; created_by: string | null; created_at: string;
}
export interface Task {
  id: string; firm_id: string; case_id: string | null; title: string; due_at: string | null; done_at: string | null;
  assigned_to: string | null; created_at: string;
}
export interface Doc {
  id: string; firm_id: string; case_id: string | null; client_id: string | null; title: string; kind: "archivo" | "escrito";
  storage_path: string | null; mime: string | null; size_bytes: number | null; content_html: string | null; current_version: number;
  shared_with_client: boolean; deleted_at: string | null; created_by: string | null; created_at: string; updated_at: string;
}
export interface DocVersion {
  id: string; firm_id: string; document_id: string; version: number; storage_path: string | null; content_html: string | null;
  note: string | null; created_by: string | null; created_at: string;
}
export interface Template {
  id: string; firm_id: string | null; slug: string | null; title: string; category: string; description: string | null;
  body_html: string; variables: { key: string; label: string; type?: "texto" | "fecha" | "numero" | "largo" }[]; created_at: string;
}
export interface Invoice {
  id: string; firm_id: string; client_id: string; case_id: string | null; number: string; status: "borrador" | "enviada" | "pagada" | "anulada";
  currency: "BOB" | "USD"; issue_date: string; due_date: string | null; notes: string | null; paid_at: string | null; created_at: string;
}
export interface InvoiceItem { id: string; firm_id: string; invoice_id: string; description: string; quantity: number; unit_price: number }
export interface Payment { id: string; firm_id: string; invoice_id: string; amount: number; method: string; paid_on: string; note: string | null }
export interface TimeEntry {
  id: string; firm_id: string; case_id: string | null; user_id: string; description: string | null; minutes: number; worked_on: string;
  billable: boolean; rate: number; invoice_id: string | null; created_at: string;
}
export interface Citation {
  code: string; law_title: string; article: string | null; source_name: string; source_url: string | null; license: string; is_demo: boolean;
}
