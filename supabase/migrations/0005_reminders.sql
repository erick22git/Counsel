-- Recordatorios: marca de "ya avisado" (evita enviar el mismo aviso dos veces)
alter table appointments add column if not exists reminded_at timestamptz;
