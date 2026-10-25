-- Privacidad del portal: RLS no filtra columnas, y `clients.notes` son notas internas del abogado.
-- El portal no lee `clients` (usa `cases`, `case_events`, `appointments`, `documents`, `invoices`), así que se quita
-- el acceso directo del cliente a su fila de `clients`.
drop policy if exists clients_portal on clients;
