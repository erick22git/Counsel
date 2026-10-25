-- Índices para la búsqueda del lado del servidor (ilike '%texto%') en listas largas.
-- pg_trgm acelera los patrones con comodín al inicio. Es opcional: si la extensión no está
-- disponible (p. ej. el entorno de pruebas con PGlite sin pg_trgm), la migración no falla
-- y las búsquedas siguen funcionando, solo sin índice.
do $$
begin
  create extension if not exists pg_trgm;

  create index if not exists clients_full_name_trgm on clients using gin (full_name gin_trgm_ops);
  create index if not exists clients_ci_nit_trgm on clients using gin (ci_nit gin_trgm_ops);
  create index if not exists cases_title_trgm on cases using gin (title gin_trgm_ops);
  create index if not exists cases_case_number_trgm on cases using gin (case_number gin_trgm_ops);
  create index if not exists cases_opponent_trgm on cases using gin (opponent gin_trgm_ops);
  create index if not exists documents_title_trgm on documents using gin (title gin_trgm_ops);
exception when others then
  raise notice 'Índices de búsqueda omitidos (pg_trgm no disponible): %', sqlerrm;
end $$;

-- Orden y paginación estables de las listas.
create index if not exists cases_firm_stage_updated_idx on cases (firm_id, stage, updated_at desc) where deleted_at is null;
create index if not exists invoices_firm_created_idx on invoices (firm_id, created_at desc);
create index if not exists tasks_firm_done_idx on tasks (firm_id, done_at);
