-- Metadatos de ingesta de leyes + idempotencia (upsert por (source_id, article)).
alter table law_sources add column if not exists norm_date date;
alter table law_sources add column if not exists origin_url text;
alter table law_sources add column if not exists attribution text;

alter table law_chunks add column if not exists norm_date date;
alter table law_chunks add column if not exists origin_url text;
alter table law_chunks add column if not exists attribution text;
alter table law_chunks add column if not exists content_hash text;

-- Un artículo por fuente. No es parcial a propósito: PostgREST (onConflict=source_id,article) no infiere índices parciales.
-- Los article NULL siguen permitidos (en Postgres los NULL son distintos entre sí).
create unique index if not exists law_chunks_source_article_uq
  on law_chunks (source_id, article);
