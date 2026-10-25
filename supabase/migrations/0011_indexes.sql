-- Counsel · índices faltantes (llaves foráneas y consultas frecuentes por despacho/fecha). Idempotente.
-- Postgres no indexa las FK automáticamente: sin índice, borrar/consultar por la FK recorre toda la tabla.

-- Perfiles / casos
create index if not exists profiles_client_id on profiles (client_id) where client_id is not null;
create index if not exists cases_responsible on cases (responsible_id) where responsible_id is not null;
create index if not exists cases_firm_updated on cases (firm_id, updated_at desc) where deleted_at is null;
create index if not exists case_events_firm on case_events (firm_id);
create index if not exists case_events_created_by on case_events (created_by) where created_by is not null;

-- Agenda (agenda por fecha, portal por caso, cron de recordatorios por fecha)
create index if not exists appointments_case on appointments (case_id) where case_id is not null;
create index if not exists appointments_client on appointments (client_id) where client_id is not null;
create index if not exists appointments_created_by on appointments (created_by) where created_by is not null;
create index if not exists appointments_reminder on appointments (starts_at) where reminded_at is null and status = 'programada';

-- Tareas
create index if not exists tasks_case on tasks (case_id) where case_id is not null;
create index if not exists tasks_assigned on tasks (assigned_to, due_at) where assigned_to is not null and done_at is null;

-- Documentos
create index if not exists documents_case on documents (case_id) where deleted_at is null and case_id is not null;
create index if not exists documents_client on documents (client_id) where client_id is not null;
create index if not exists documents_firm_updated on documents (firm_id, updated_at desc) where deleted_at is null;
create index if not exists documents_created_by on documents (created_by) where created_by is not null;
create index if not exists document_versions_firm on document_versions (firm_id);
create index if not exists document_versions_created_by on document_versions (created_by) where created_by is not null;
create index if not exists templates_firm on templates (firm_id) where firm_id is not null;

-- Cobros y tiempo
create index if not exists invoices_client on invoices (client_id);
create index if not exists invoices_case on invoices (case_id) where case_id is not null;
create index if not exists invoices_firm_issue on invoices (firm_id, issue_date desc);
create index if not exists invoice_items_invoice on invoice_items (invoice_id);
create index if not exists invoice_items_firm on invoice_items (firm_id);
create index if not exists payments_invoice on payments (invoice_id);
create index if not exists payments_firm_paid on payments (firm_id, paid_on desc);
create index if not exists time_entries_case on time_entries (case_id) where case_id is not null;
create index if not exists time_entries_user on time_entries (user_id, worked_on desc);
create index if not exists time_entries_invoice on time_entries (invoice_id) where invoice_id is not null;

-- IA
create index if not exists ai_conversations_user on ai_conversations (user_id, created_at desc);
create index if not exists ai_conversations_firm on ai_conversations (firm_id);
create index if not exists ai_conversations_case on ai_conversations (case_id) where case_id is not null;
create index if not exists ai_messages_conversation on ai_messages (conversation_id, created_at);
create index if not exists ai_messages_firm on ai_messages (firm_id);
create index if not exists ai_audit_log_user_created on ai_audit_log (user_id, created_at desc) where user_id is not null; -- límite diario de uso
create index if not exists ai_audit_log_firm on ai_audit_log (firm_id, created_at desc);

-- Consultas, citas y avisos
create index if not exists intake_firm_created on intake_submissions (firm_id, created_at desc);
create index if not exists intake_client on intake_submissions (client_id) where client_id is not null;
create index if not exists appt_requests_firm_created on appointment_requests (firm_id, created_at desc);
create index if not exists appt_requests_appointment on appointment_requests (appointment_id) where appointment_id is not null;
create index if not exists notifications_firm on notifications (firm_id);
create index if not exists notifications_user on notifications (user_id) where user_id is not null;
create index if not exists terms_acceptances_firm on terms_acceptances (firm_id);

-- Auditoría (0009): la FK user_id no tenía índice
create index if not exists audit_log_user on audit_log (user_id) where user_id is not null;
