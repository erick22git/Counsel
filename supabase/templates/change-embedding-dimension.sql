-- Cambiar la dimensión de los embeddings (p. ej. de 1024 a 768 al pasar a nomic-embed-text).
-- 1) Cambia EMBEDDINGS_PROVIDER / EMBEDDINGS_MODEL / EMBEDDINGS_DIM en .env.local y la constante
--    DB_EMBEDDING_DIM en src/lib/ai/providers/embeddings.ts.
-- 2) Reemplaza 768 por tu dimensión y ejecuta este script en el SQL Editor.
-- 3) Re-ingesta: npm run ingest:leyes -- --embed   (los vectores anteriores se borran aquí: ya no sirven).
begin;
drop function if exists public.match_laws(vector, int);
update law_chunks set embedding = null;
alter table law_chunks alter column embedding type vector(768) using null;

create function public.match_laws(p_embedding vector(768), p_limit int default 6)
returns table (id uuid, code text, law_title text, article text, heading text, content text, source_name text, source_url text, license text, is_demo boolean, rank real)
language sql stable security invoker set search_path = public as $$
  select c.id, s.code, s.title, c.article, c.heading, c.content, s.source_name, s.source_url, s.license, s.is_demo,
         (1 - (c.embedding <=> p_embedding))::real as rank
  from law_chunks c join law_sources s on s.id = c.source_id
  where c.embedding is not null
  order by c.embedding <=> p_embedding
  limit least(p_limit, 20)
$$;
grant execute on function public.match_laws(vector, int) to authenticated;
commit;
