-- ===== supabase/migrations/0001_schema.sql =====
-- Counsel · esquema base multi-tenant (un despacho = un tenant)
-- Todas las tablas de negocio llevan firm_id y RLS activada.

create extension if not exists vector;

-- ───────────────────────── Tipos ─────────────────────────
create type user_role as enum ('owner', 'lawyer', 'assistant', 'client');

-- ───────────────────────── Despachos y perfiles ─────────────────────────
create table firms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  intake_enabled boolean not null default true,
  bot_enabled boolean not null default true,
  currency text not null default 'BOB' check (currency in ('BOB', 'USD')),
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  firm_id uuid not null references firms (id) on delete cascade,
  full_name text not null,
  email text,
  role user_role not null default 'lawyer',
  client_id uuid, -- se llena si role = 'client' (portal)
  hourly_rate numeric(12,2) not null default 0,
  preferences jsonb not null default '{"theme":"sistema","fontSize":"normal","density":"comoda"}'::jsonb,
  created_at timestamptz not null default now()
);
create index on profiles (firm_id);

-- Funciones auxiliares (security definer evita recursión de RLS en profiles)
create or replace function public.current_firm_id() returns uuid
language sql stable security definer set search_path = public as $$
  select firm_id from profiles where id = auth.uid()
$$;

create or replace function public.current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.current_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from profiles where id = auth.uid() and role = 'client'
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role <> 'client' from profiles where id = auth.uid()), false)
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────────────────── Clientes ─────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  kind text not null default 'persona' check (kind in ('persona', 'empresa')),
  full_name text not null check (char_length(full_name) between 2 and 200),
  ci_nit text,
  email text,
  phone text,
  address text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on clients (firm_id) where deleted_at is null;
alter table profiles add constraint profiles_client_fk foreign key (client_id) references clients (id) on delete set null;

-- ───────────────────────── Casos ─────────────────────────
create table cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  client_id uuid not null references clients (id) on delete restrict,
  title text not null check (char_length(title) between 2 and 200),
  case_number text,
  matter text not null default 'civil'
    check (matter in ('civil','penal','familia','laboral','comercial','administrativo','constitucional','otro')),
  court text,
  opponent text,
  description text,
  stage text not null default 'nuevo'
    check (stage in ('nuevo','en_tramite','audiencia','resolucion','cerrado')),
  position double precision not null default 0,
  responsible_id uuid references profiles (id) on delete set null,
  portal_visible boolean not null default true,
  opened_at date not null default current_date,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on cases (firm_id, stage) where deleted_at is null;
create index on cases (client_id);

-- Línea de tiempo por caso
create table case_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  case_id uuid not null references cases (id) on delete cascade,
  kind text not null default 'nota'
    check (kind in ('nota','etapa','documento','audiencia','tarea','pago','mensaje','sistema')),
  title text not null,
  body text,
  visible_to_client boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  happened_at timestamptz not null default now()
);
create index on case_events (case_id, happened_at desc);

-- ───────────────────────── Agenda ─────────────────────────
create table appointments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete set null,
  client_id uuid references clients (id) on delete set null,
  kind text not null default 'cita' check (kind in ('audiencia','cita','plazo')),
  title text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  notes text,
  status text not null default 'programada' check (status in ('programada','realizada','cancelada')),
  visible_to_client boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on appointments (firm_id, starts_at);

-- ───────────────────────── Tareas ─────────────────────────
create table tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete cascade,
  title text not null,
  due_at date,
  done_at timestamptz,
  assigned_to uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on tasks (firm_id, due_at) where done_at is null;

-- ───────────────────────── Documentos ─────────────────────────
create table documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete set null,
  client_id uuid references clients (id) on delete set null,
  title text not null,
  kind text not null default 'archivo' check (kind in ('archivo','escrito')), -- archivo = subido, escrito = editor
  storage_path text,
  mime text,
  size_bytes bigint,
  content_html text,            -- contenido actual si kind = 'escrito'
  current_version int not null default 1,
  shared_with_client boolean not null default false,
  deleted_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on documents (firm_id, case_id) where deleted_at is null;

create table document_versions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  document_id uuid not null references documents (id) on delete cascade,
  version int not null,
  storage_path text,
  content_html text,
  note text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

-- Plantillas legales: firm_id nulo = plantilla global del sistema (solo lectura)
create table templates (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references firms (id) on delete cascade default current_firm_id(),
  slug text,
  title text not null,
  category text not null,
  description text,
  body_html text not null,
  variables jsonb not null default '[]'::jsonb, -- [{key,label,type}]
  created_at timestamptz not null default now()
);
create unique index templates_global_slug on templates (slug) where firm_id is null;

-- ───────────────────────── Facturación y tiempo ─────────────────────────
create table invoices (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  client_id uuid not null references clients (id) on delete restrict,
  case_id uuid references cases (id) on delete set null,
  number text not null,
  status text not null default 'borrador' check (status in ('borrador','enviada','pagada','anulada')),
  currency text not null default 'BOB' check (currency in ('BOB','USD')),
  issue_date date not null default current_date,
  due_date date,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (firm_id, number)
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  invoice_id uuid not null references invoices (id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  invoice_id uuid not null references invoices (id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method text not null default 'efectivo' check (method in ('efectivo','transferencia','qr','cheque','otro')),
  paid_on date not null default current_date,
  note text
);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  case_id uuid references cases (id) on delete set null,
  user_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  description text,
  minutes int not null check (minutes > 0),
  worked_on date not null default current_date,
  billable boolean not null default true,
  rate numeric(12,2) not null default 0,
  invoice_id uuid references invoices (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on time_entries (firm_id, worked_on);

-- ───────────────────────── Leyes (RAG) — globales, solo lectura ─────────────────────────
create table law_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,            -- ej. 'CPE', 'CC', 'LEY-439'
  title text not null,
  kind text not null default 'ley',
  source_name text not null default 'Lexivox',
  source_url text,
  license text not null default 'GFDL',
  is_demo boolean not null default false,
  retrieved_at timestamptz not null default now()
);

create table law_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references law_sources (id) on delete cascade,
  article text,                         -- 'Artículo 5', 'Art. 12 II'
  heading text,
  content text not null,
  tsv tsvector generated always as (to_tsvector('spanish', coalesce(heading,'') || ' ' || content)) stored,
  embedding vector(1024)                -- opcional (Voyage voyage-3); la búsqueda funciona sin él
);
create index law_chunks_tsv on law_chunks using gin (tsv);
create index law_chunks_source on law_chunks (source_id);

-- ───────────────────────── IA ─────────────────────────
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  user_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  case_id uuid references cases (id) on delete cascade,
  mode text not null default 'legal' check (mode in ('legal','caso','dictado','redaccion')),
  title text,
  created_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  conversation_id uuid not null references ai_conversations (id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Registro de qué se envió al LLM (transparencia + auditoría)
create table ai_audit_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  user_id uuid default auth.uid() references profiles (id) on delete set null,
  feature text not null,
  summary text not null,        -- descripción legible de lo enviado
  chars_sent int not null default 0,
  model text,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Intake, bot de citas, notificaciones ─────────────────────────
create table intake_submissions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  matter text,
  message text not null,
  status text not null default 'nueva' check (status in ('nueva','convertida','descartada')),
  client_id uuid references clients (id) on delete set null,
  created_at timestamptz not null default now()
);

create table appointment_requests (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  reason text,
  preferred_at timestamptz not null,
  status text not null default 'pendiente' check (status in ('pendiente','confirmada','rechazada')),
  appointment_id uuid references appointments (id) on delete set null,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  user_id uuid references profiles (id) on delete cascade,
  to_email text,
  kind text not null,
  subject text not null,
  body text not null,
  send_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);
create index on notifications (send_at) where sent_at is null;

-- Aceptación registrada de términos y políticas
create table terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  document text not null check (document in ('terminos','privacidad','ia')),
  version text not null,
  accepted_at timestamptz not null default now(),
  ip text,
  user_agent text,
  unique (user_id, document, version)
);

-- ───────────────────────── updated_at ─────────────────────────
create trigger t_clients_upd before update on clients for each row execute function set_updated_at();
create trigger t_cases_upd before update on cases for each row execute function set_updated_at();
create trigger t_documents_upd before update on documents for each row execute function set_updated_at();

-- ───────────────────────── RLS ─────────────────────────
alter table firms enable row level security;
alter table profiles enable row level security;

create policy firms_select on firms for select to authenticated using (id = current_firm_id());
create policy firms_update on firms for update to authenticated
  using (id = current_firm_id() and current_user_role() = 'owner')
  with check (id = current_firm_id());

create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or (firm_id = current_firm_id() and is_staff()));
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and firm_id = current_firm_id());
-- Evita que un usuario se cambie rol o despacho
create or replace function public.protect_profile_fields() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (new.role <> old.role or new.firm_id <> old.firm_id or new.client_id is distinct from old.client_id) then
    raise exception 'No se puede cambiar el rol ni el despacho';
  end if;
  return new;
end $$;
create trigger t_profiles_protect before update on profiles for each row execute function protect_profile_fields();

-- Tablas de negocio solo-personal (staff) del despacho
do $$
declare t text;
begin
  foreach t in array array[
    'clients','cases','case_events','appointments','tasks','documents','document_versions',
    'invoices','invoice_items','payments','time_entries','ai_conversations','ai_messages',
    'ai_audit_log','notifications','intake_submissions','appointment_requests'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all to authenticated using (firm_id = current_firm_id() and is_staff()) with check (firm_id = current_firm_id() and is_staff())',
      t || '_staff', t);
  end loop;
end $$;

-- Acceso del portal del cliente (solo lectura de lo suyo y lo marcado como visible)
create policy clients_portal on clients for select to authenticated using (id = current_client_id());
create policy cases_portal on cases for select to authenticated
  using (client_id = current_client_id() and portal_visible and deleted_at is null);
create policy case_events_portal on case_events for select to authenticated
  using (visible_to_client and exists (select 1 from cases c where c.id = case_id and c.client_id = current_client_id() and c.portal_visible));
create policy appointments_portal on appointments for select to authenticated
  using (visible_to_client and status <> 'cancelada' and exists (select 1 from cases c where c.id = case_id and c.client_id = current_client_id()));
create policy documents_portal on documents for select to authenticated
  using (shared_with_client and deleted_at is null and exists (select 1 from cases c where c.id = case_id and c.client_id = current_client_id()));
create policy invoices_portal on invoices for select to authenticated
  using (client_id = current_client_id() and status in ('enviada','pagada'));

-- Plantillas: globales visibles a todos los autenticados; propias editables por staff
alter table templates enable row level security;
create policy templates_read on templates for select to authenticated
  using (firm_id is null or firm_id = current_firm_id());
create policy templates_write on templates for all to authenticated
  using (firm_id = current_firm_id() and is_staff()) with check (firm_id = current_firm_id() and is_staff());

-- Leyes: lectura para cualquier autenticado; nadie escribe desde la app
alter table law_sources enable row level security;
alter table law_chunks enable row level security;
create policy law_sources_read on law_sources for select to authenticated using (true);
create policy law_chunks_read on law_chunks for select to authenticated using (true);

-- Aceptación de términos: cada usuario ve/crea las suyas
alter table terms_acceptances enable row level security;
create policy terms_own on terms_acceptances for select to authenticated using (user_id = auth.uid());
create policy terms_insert on terms_acceptances for insert to authenticated
  with check (user_id = auth.uid() and firm_id = current_firm_id());

-- ───────────────────────── RPC ─────────────────────────
-- Registro: crea despacho + perfil owner para el usuario autenticado recién creado.
create or replace function public.register_firm(p_firm_name text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_firm uuid;
  v_slug text;
  v_email text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'Ya tienes un despacho'; end if;
  v_slug := lower(regexp_replace(translate(p_firm_name, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if char_length(v_slug) < 3 then v_slug := 'despacho-' || substr(gen_random_uuid()::text, 1, 6); end if;
  v_slug := left(v_slug, 32);
  if exists (select 1 from firms where slug = v_slug) then
    v_slug := left(v_slug, 32) || '-' || substr(gen_random_uuid()::text, 1, 5);
  end if;
  insert into firms (name, slug) values (p_firm_name, v_slug) returning id into v_firm;
  select email into v_email from auth.users where id = auth.uid();
  insert into profiles (id, firm_id, full_name, email, role) values (auth.uid(), v_firm, p_full_name, v_email, 'owner');
  return v_firm;
end $$;
grant execute on function public.register_firm(text, text) to authenticated;

-- Formulario público de intake (anon): validado, sin exponer tablas
create or replace function public.submit_intake(p_slug text, p_name text, p_email text, p_phone text, p_matter text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_firm firms; v_id uuid;
begin
  select * into v_firm from firms where slug = p_slug and intake_enabled;
  if not found then raise exception 'Formulario no disponible'; end if;
  if char_length(coalesce(p_name,'')) < 2 or char_length(coalesce(p_message,'')) < 5 then
    raise exception 'Datos incompletos';
  end if;
  if char_length(p_message) > 4000 or char_length(p_name) > 200 then raise exception 'Texto demasiado largo'; end if;
  insert into intake_submissions (firm_id, full_name, email, phone, matter, message)
  values (v_firm.id, p_name, nullif(p_email,''), nullif(p_phone,''), nullif(p_matter,''), p_message)
  returning id into v_id;
  insert into notifications (firm_id, to_email, kind, subject, body)
  select v_firm.id, p.email, 'intake', 'Nueva consulta: ' || p_name, left(p_message, 500)
  from profiles p where p.firm_id = v_firm.id and p.role = 'owner' and p.email is not null;
  return v_id;
end $$;
grant execute on function public.submit_intake(text, text, text, text, text, text) to anon, authenticated;

-- Solicitud de cita (bot simple, anon)
create or replace function public.request_appointment(p_slug text, p_name text, p_email text, p_phone text, p_reason text, p_preferred timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_firm firms; v_id uuid;
begin
  select * into v_firm from firms where slug = p_slug and bot_enabled;
  if not found then raise exception 'Reserva no disponible'; end if;
  if char_length(coalesce(p_name,'')) < 2 then raise exception 'Datos incompletos'; end if;
  if p_preferred < now() then raise exception 'La fecha debe ser futura'; end if;
  insert into appointment_requests (firm_id, full_name, email, phone, reason, preferred_at)
  values (v_firm.id, p_name, nullif(p_email,''), nullif(p_phone,''), left(p_reason, 1000), p_preferred)
  returning id into v_id;
  insert into notifications (firm_id, to_email, kind, subject, body)
  select v_firm.id, p.email, 'cita', 'Solicitud de cita: ' || p_name, coalesce(left(p_reason, 300), '')
  from profiles p where p.firm_id = v_firm.id and p.role = 'owner' and p.email is not null;
  return v_id;
end $$;
grant execute on function public.request_appointment(text, text, text, text, text, timestamptz) to anon, authenticated;

-- Datos mínimos públicos del despacho para el formulario (nombre)
create or replace function public.firm_public(p_slug text)
returns table (name text, intake_enabled boolean, bot_enabled boolean)
language sql stable security definer set search_path = public as $$
  select name, intake_enabled, bot_enabled from firms where slug = p_slug
$$;
grant execute on function public.firm_public(text) to anon, authenticated;

-- Búsqueda de leyes (texto completo en español; el vector se combina desde la app si hay embeddings)
create or replace function public.search_laws(p_query text, p_limit int default 6)
returns table (id uuid, code text, law_title text, article text, heading text, content text, source_name text, source_url text, license text, is_demo boolean, rank real)
language sql stable security invoker set search_path = public as $$
  select c.id, s.code, s.title, c.article, c.heading, c.content, s.source_name, s.source_url, s.license, s.is_demo,
         ts_rank(c.tsv, websearch_to_tsquery('spanish', p_query)) as rank
  from law_chunks c join law_sources s on s.id = c.source_id
  where c.tsv @@ websearch_to_tsquery('spanish', p_query)
  order by rank desc
  limit least(p_limit, 20)
$$;

create or replace function public.match_laws(p_embedding vector(1024), p_limit int default 6)
returns table (id uuid, code text, law_title text, article text, heading text, content text, source_name text, source_url text, license text, is_demo boolean, rank real)
language sql stable security invoker set search_path = public as $$
  select c.id, s.code, s.title, c.article, c.heading, c.content, s.source_name, s.source_url, s.license, s.is_demo,
         (1 - (c.embedding <=> p_embedding))::real as rank
  from law_chunks c join law_sources s on s.id = c.source_id
  where c.embedding is not null
  order by c.embedding <=> p_embedding
  limit least(p_limit, 20)
$$;

-- ===== supabase/migrations/0002_storage.sql =====
-- Bucket privado de documentos. Ruta obligatoria: {firm_id}/{case_id|general}/{uuid}-{nombre}
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 26214400)
on conflict (id) do nothing;

create policy documents_staff_select on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());
create policy documents_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());
create policy documents_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());
create policy documents_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = public.current_firm_id()::text and public.is_staff());

-- Portal: el cliente puede descargar solo archivos de documentos que el despacho compartió con él
create policy documents_client_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      join public.cases c on c.id = d.case_id
      where d.storage_path = storage.objects.name
        and d.shared_with_client and d.deleted_at is null
        and c.client_id = public.current_client_id()
    )
  );

-- ===== supabase/migrations/0003_templates_seed.sql =====
-- 0003: plantillas legales globales (Bolivia). Modelos referenciales, sin citas de normas concretas.
-- firm_id nulo = plantilla del sistema (solo lectura para los despachos). Idempotente por slug.

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'contrato-arrendamiento', 'Contrato de arrendamiento', 'Civil', 'Alquiler de un inmueble entre arrendador y arrendatario.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de arrendamiento</h1>
<p>Conste por el presente documento que en la ciudad de {{ciudad}}, a {{fecha}}, se suscribe un contrato de arrendamiento al tenor de las siguientes cláusulas:</p>
<h2>Primera. Partes</h2>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, en calidad de ARRENDADOR; y {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, en calidad de ARRENDATARIO.</p>
<h2>Segunda. Objeto</h2>
<p>El arrendador da en alquiler al arrendatario el inmueble ubicado en: {{inmueble_descripcion}}.</p>
<h2>Tercera. Canon y forma de pago</h2>
<p>El canon mensual es de Bs {{monto}} ({{monto_literal}}), que será pagado por mes adelantado.</p>
<h2>Cuarta. Plazo</h2>
<p>El contrato tendrá una duración de {{plazo_meses}} meses, computables desde el {{fecha_inicio}}.</p>
<h2>Quinta. Obligaciones</h2>
<p>El arrendatario usará el inmueble solo para vivienda o el fin pactado, lo mantendrá en buen estado y lo devolverá en las condiciones en que lo recibió. Los servicios básicos corren por cuenta del arrendatario.</p>
<h2>Sexta. Conformidad</h2>
<p>Ambas partes declaran su plena conformidad con el contenido de este documento y lo firman en dos ejemplares.</p>
<p>{{cliente_nombre}} (arrendador)</p>
<p>{{contraparte_nombre}} (arrendatario)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"inmueble_descripcion","label":"Descripción y ubicación del inmueble","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'compraventa-inmueble', 'Contrato de compraventa de inmueble', 'Civil', 'Transferencia de un inmueble a cambio de un precio.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de compraventa de inmueble</h1>
<p>En la ciudad de {{ciudad}}, a {{fecha}}, comparecen {{cliente_nombre}}, con C.I. {{cliente_ci}}, en calidad de VENDEDOR, y {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, en calidad de COMPRADOR, quienes convienen en lo siguiente:</p>
<h2>Primera. Antecedentes</h2>
<p>El vendedor declara ser propietario del inmueble ubicado en: {{inmueble_descripcion}}, libre de gravámenes según declara.</p>
<h2>Segunda. Venta y precio</h2>
<p>El vendedor transfiere el inmueble al comprador por el precio de Bs {{monto}} ({{monto_literal}}), que el comprador pagará en la forma que las partes acuerden por escrito.</p>
<h2>Tercera. Entrega</h2>
<p>La entrega del inmueble se realizará a la firma de este contrato, con todos sus accesorios y servicios.</p>
<h2>Cuarta. Saneamiento</h2>
<p>El vendedor responde por la legítima propiedad del inmueble y se obliga a realizar los trámites de transferencia necesarios, conforme a ley.</p>
<h2>Quinta. Conformidad</h2>
<p>Las partes aceptan todas las cláusulas y se comprometen a elevar este documento a escritura pública.</p>
<p>{{cliente_nombre}} (vendedor)</p>
<p>{{contraparte_nombre}} (comprador)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"inmueble_descripcion","label":"Descripción y ubicación del inmueble","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'compraventa-vehiculo', 'Contrato de compraventa de vehículo', 'Civil', 'Venta de un vehículo con entrega y transferencia.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de compraventa de vehículo</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, con C.I. {{cliente_ci}} (VENDEDOR), y {{contraparte_nombre}}, con C.I. {{contraparte_ci}} (COMPRADOR), suscriben este contrato:</p>
<h2>Primera. Objeto</h2>
<p>El vendedor transfiere al comprador el siguiente vehículo: {{vehiculo_descripcion}}.</p>
<h2>Segunda. Precio</h2>
<p>El precio pactado es de Bs {{monto}} ({{monto_literal}}), que el vendedor declara recibir a su entera satisfacción.</p>
<h2>Tercera. Estado y entrega</h2>
<p>El comprador recibe el vehículo en el estado en que se encuentra, que declara conocer. La entrega se hace en este acto.</p>
<h2>Cuarta. Trámites</h2>
<p>Las partes realizarán juntas los trámites de transferencia ante las oficinas correspondientes. Las deudas e infracciones anteriores a la fecha son responsabilidad del vendedor.</p>
<p>{{cliente_nombre}} (vendedor)</p>
<p>{{contraparte_nombre}} (comprador)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"vehiculo_descripcion","label":"Datos del vehículo (marca, modelo, año, placa, chasis)","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'anticresis', 'Contrato de anticresis', 'Civil', 'Entrega de un inmueble en garantía de un préstamo, con uso por el acreedor.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de anticresis</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, con C.I. {{cliente_ci}}, propietario (ANTICRESISTA), y {{contraparte_nombre}}, con C.I. {{contraparte_ci}} (ACREEDOR ANTICRÉTICO), acuerdan:</p>
<h2>Primera. Inmueble</h2>
<p>El inmueble objeto del contrato está ubicado en: {{inmueble_descripcion}}.</p>
<h2>Segunda. Monto entregado</h2>
<p>El acreedor entrega la suma de Bs {{monto}} ({{monto_literal}}) al propietario, quien la recibe a título de anticresis.</p>
<h2>Tercera. Plazo y uso</h2>
<p>El contrato dura {{plazo_meses}} meses desde el {{fecha_inicio}}. Durante ese tiempo el acreedor ocupa el inmueble y lo cuida como bien ajeno.</p>
<h2>Cuarta. Devolución</h2>
<p>Vencido el plazo, el propietario devolverá el monto recibido y el acreedor entregará el inmueble libre y desocupado.</p>
<p>{{cliente_nombre}} (propietario)</p>
<p>{{contraparte_nombre}} (acreedor)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"inmueble_descripcion","label":"Descripción y ubicación del inmueble","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'contrato-prestamo', 'Contrato de préstamo de dinero', 'Civil', 'Préstamo con plazo de devolución e interés.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de préstamo de dinero</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, C.I. {{cliente_ci}} (PRESTAMISTA), y {{contraparte_nombre}}, C.I. {{contraparte_ci}} (PRESTATARIO), celebran el siguiente contrato:</p>
<h2>Primera. Monto</h2>
<p>El prestamista entrega al prestatario la suma de Bs {{monto}} ({{monto_literal}}), que este declara haber recibido.</p>
<h2>Segunda. Interés</h2>
<p>El préstamo devenga un interés mensual del {{interes_mensual}} %.</p>
<h2>Tercera. Plazo de devolución</h2>
<p>El prestatario devolverá el capital y los intereses en el plazo de {{plazo_meses}} meses, hasta el {{fecha_limite}}.</p>
<h2>Cuarta. Incumplimiento</h2>
<p>Si el prestatario no paga en la fecha fijada, el prestamista podrá exigir el pago por las vías que corresponden conforme a ley.</p>
<p>{{cliente_nombre}} (prestamista)</p>
<p>{{contraparte_nombre}} (prestatario)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"interes_mensual","label":"Interés mensual (%)","type":"numero"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'reconocimiento-deuda', 'Documento de reconocimiento de deuda', 'Civil', 'El deudor reconoce una deuda y se compromete a pagarla.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Reconocimiento de deuda</h1>
<p>Yo, {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, domiciliado en {{contraparte_domicilio}}, reconozco voluntariamente que adeudo a {{cliente_nombre}}, con C.I. {{cliente_ci}}, la suma de Bs {{monto}} ({{monto_literal}}), por concepto de {{concepto}}.</p>
<p>Me comprometo a pagar esta deuda hasta el {{fecha_limite}}, en el domicilio del acreedor o por el medio que él indique.</p>
<p>Este documento se firma de manera libre y voluntaria, sin presión alguna, y sirve como prueba de la obligación asumida.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{contraparte_nombre}}</p>
<p>C.I. {{contraparte_ci}}</p>$tpl$,
'[{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"concepto","label":"Concepto","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'servicios-profesionales', 'Contrato de servicios profesionales', 'Civil', 'Prestación de servicios independientes con honorarios.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de servicios profesionales</h1>
<p>En {{ciudad}}, a {{fecha}}, {{empresa_nombre}} (CONTRATANTE), representada por {{empresa_representante}}, y {{cliente_nombre}}, C.I. {{cliente_ci}} (PROFESIONAL), acuerdan:</p>
<h2>Primera. Servicio</h2>
<p>El profesional prestará los siguientes servicios: {{objeto}}.</p>
<h2>Segunda. Honorarios</h2>
<p>Los honorarios son de Bs {{monto}} ({{monto_literal}}), pagaderos en la forma acordada por las partes.</p>
<h2>Tercera. Plazo</h2>
<p>El servicio se prestará durante {{plazo_meses}} meses desde el {{fecha_inicio}}.</p>
<h2>Cuarta. Independencia</h2>
<p>El profesional presta sus servicios de manera independiente, sin relación de dependencia laboral con el contratante.</p>
<h2>Quinta. Confidencialidad</h2>
<p>El profesional mantendrá en reserva la información a la que acceda por este contrato.</p>
<p>{{empresa_representante}} (contratante)</p>
<p>{{cliente_nombre}} (profesional)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"empresa_representante","label":"Representante legal","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'recibo-pago', 'Recibo de pago', 'Civil', 'Constancia de haber recibido una suma de dinero.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Recibo de pago</h1>
<p>Recibí de {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, la suma de Bs {{monto}} ({{monto_literal}}), por concepto de {{concepto}}.</p>
<p>Con el pago recibido, declaro estar satisfecho por lo que corresponde al concepto indicado.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"concepto","label":"Concepto","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'transaccion-extrajudicial', 'Transacción extrajudicial', 'Civil', 'Acuerdo entre las partes para terminar una controversia sin juicio.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Transacción extrajudicial</h1>
<p>En {{ciudad}}, a {{fecha}}, {{cliente_nombre}}, C.I. {{cliente_ci}}, y {{contraparte_nombre}}, C.I. {{contraparte_ci}}, deciden poner fin de manera amistosa a la controversia descrita a continuación.</p>
<h2>Primera. Antecedentes</h2>
<p>{{hechos}}</p>
<h2>Segunda. Acuerdo</h2>
<p>Para terminar la controversia, las partes acuerdan lo siguiente: {{petitorio}}.</p>
<h2>Tercera. Pago</h2>
<p>Si corresponde, se pagará la suma de Bs {{monto}} ({{monto_literal}}) hasta el {{fecha_limite}}.</p>
<h2>Cuarta. Efectos</h2>
<p>Cumplido el acuerdo, las partes se otorgan el más amplio finiquito y renuncian a reclamarse por este asunto.</p>
<p>{{cliente_nombre}}</p>
<p>{{contraparte_nombre}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'demanda-divorcio', 'Demanda de divorcio', 'Familia', 'Memorial para iniciar el proceso de divorcio.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez Público de Familia de turno de {{ciudad}}</p>
<p>Ref.: Demanda de divorcio</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Demanda de divorcio</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, con el debido respeto me presento y digo:</p>
<h2>I. Partes</h2>
<p>Demando a {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, con domicilio en {{contraparte_domicilio}}.</p>
<h2>II. Hechos</h2>
<p>{{hechos}}</p>
<h2>III. Petitorio</h2>
<p>Solicito que, previo el trámite que corresponde conforme a ley, se declare el divorcio y se resuelvan los efectos relativos a los hijos y a los bienes: {{petitorio}}.</p>
<h2>Otrosí</h2>
<p>Pido se señale audiencia y se notifique a la parte demandada en el domicilio indicado.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'demanda-asistencia-familiar', 'Demanda de asistencia familiar', 'Familia', 'Solicitud de pensión para hijos o dependientes.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez Público de Familia de turno de {{ciudad}}</p>
<p>Ref.: Demanda de asistencia familiar</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Demanda de asistencia familiar</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, en representación del menor {{menor_nombre}}, de {{menor_edad}} años, con el debido respeto digo:</p>
<h2>I. Hechos</h2>
<p>{{hechos}}</p>
<h2>II. Petitorio</h2>
<p>Solicito que se fije una asistencia familiar mensual de Bs {{monto}} ({{monto_literal}}), a cargo de {{contraparte_nombre}}, con C.I. {{contraparte_ci}}, domiciliado en {{contraparte_domicilio}}, y que se disponga su descuento y pago regular.</p>
<h2>Otrosí</h2>
<p>Ofrezco como prueba los documentos que acompaño y pido que se notifique al demandado en su domicilio.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"menor_nombre","label":"Nombre completo del menor","type":"texto"},{"key":"menor_edad","label":"Edad del menor","type":"numero"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'solicitud-guarda', 'Solicitud de guarda de menor', 'Familia', 'Pedido de guarda de un niño, niña o adolescente.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez Público de Familia de turno de {{ciudad}}</p>
<p>Ref.: Solicitud de guarda</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de guarda</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, con el debido respeto expongo:</p>
<h2>I. Situación del menor</h2>
<p>El menor {{menor_nombre}}, de {{menor_edad}} años, se encuentra actualmente en las siguientes circunstancias: {{hechos}}.</p>
<h2>II. Petitorio</h2>
<p>Solicito que se me otorgue la guarda del menor, tomando en cuenta su interés superior, y que se cite a {{contraparte_nombre}} para que se pronuncie. {{petitorio}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"menor_nombre","label":"Nombre completo del menor","type":"texto"},{"key":"menor_edad","label":"Edad del menor","type":"numero"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'autorizacion-viaje-menor', 'Autorización de viaje de menor', 'Familia', 'Permiso de un padre o madre para que un menor viaje.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Autorización de viaje de menor</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, en mi calidad de padre o madre, AUTORIZO expresamente el viaje del menor {{menor_nombre}}, de {{menor_edad}} años, con destino a {{destino}}.</p>
<p>El viaje se realizará el {{fecha_viaje}} y el retorno está previsto para el {{fecha_retorno}}. El menor viajará acompañado de {{apoderado_nombre}}, con C.I. {{apoderado_ci}}.</p>
<p>Esta autorización se otorga de manera libre y voluntaria para presentarla ante las autoridades que la requieran.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"menor_nombre","label":"Nombre completo del menor","type":"texto"},{"key":"menor_edad","label":"Edad del menor","type":"numero"},{"key":"destino","label":"Lugar de destino","type":"texto"},{"key":"fecha_viaje","label":"Fecha de viaje","type":"fecha"},{"key":"fecha_retorno","label":"Fecha de retorno","type":"fecha"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'contrato-trabajo', 'Contrato de trabajo', 'Laboral', 'Relación laboral entre empleador y trabajador.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de trabajo</h1>
<p>En {{ciudad}}, a {{fecha}}, {{empresa_nombre}}, representada por {{empresa_representante}} (EMPLEADOR), y {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}} (TRABAJADOR), suscriben este contrato:</p>
<h2>Primera. Cargo</h2>
<p>El trabajador desempeñará el cargo de {{cargo}}, con las funciones propias del puesto.</p>
<h2>Segunda. Salario</h2>
<p>El salario mensual es de Bs {{monto}} ({{monto_literal}}), pagadero por mes vencido, más los beneficios que correspondan conforme a ley.</p>
<h2>Tercera. Inicio y duración</h2>
<p>La relación laboral comienza el {{fecha_inicio}}. Se establece un periodo de prueba de acuerdo con lo que la normativa laboral permite.</p>
<h2>Cuarta. Jornada</h2>
<p>La jornada de trabajo se cumplirá según el horario acordado por las partes y las normas laborales vigentes.</p>
<h2>Quinta. Conformidad</h2>
<p>Las partes firman en señal de conformidad.</p>
<p>{{empresa_representante}} (empleador)</p>
<p>{{cliente_nombre}} (trabajador)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"empresa_representante","label":"Representante legal","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'carta-renuncia', 'Carta de renuncia', 'Laboral', 'Carta del trabajador comunicando su renuncia.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Señores</p>
<p>{{empresa_nombre}}</p>
<p>Presente.-</p>
<p>Ref.: Renuncia voluntaria al cargo de {{cargo}}</p>
<p>De mi consideración:</p>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, comunico de manera voluntaria mi renuncia al cargo de {{cargo}}, que desempeño en su institución, a partir del {{fecha_limite}}.</p>
<p>Agradezco la oportunidad brindada y solicito se me haga conocer el cálculo de mis beneficios sociales para su pago oportuno.</p>
<p>Atentamente,</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'memorial-reincorporacion', 'Memorial de reincorporación laboral', 'Laboral', 'Solicitud de reincorporación por despido.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Inspector del Trabajo / Autoridad laboral competente de {{ciudad}}</p>
<p>Ref.: Solicitud de reincorporación</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de reincorporación laboral</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, con el debido respeto expongo:</p>
<h2>I. Relación laboral</h2>
<p>Presto servicios a {{empresa_nombre}} como {{cargo}}, con un salario mensual de Bs {{salario}}, desde el {{fecha_inicio}}.</p>
<h2>II. Hechos</h2>
<p>{{hechos}}</p>
<h2>III. Petitorio</h2>
<p>Solicito que se disponga mi reincorporación al puesto de trabajo, con el pago de los salarios devengados, y que se cite a la parte empleadora para la audiencia que corresponda.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"salario","label":"Salario mensual en bolivianos","type":"numero"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'finiquito', 'Finiquito laboral', 'Laboral', 'Constancia de pago de beneficios al terminar la relación laboral.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Finiquito laboral</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, declaro que presté servicios a {{empresa_nombre}} como {{cargo}} desde el {{fecha_inicio}} hasta el {{fecha_limite}}.</p>
<p>Declaro haber recibido la suma total de Bs {{monto}} ({{monto_literal}}) por concepto de beneficios sociales y demás derechos que me corresponden, detallados en la liquidación que acompaño.</p>
<p>Con este pago me considero satisfecho y no tengo nada más que reclamar por la relación laboral, salvo lo que la ley no permita renunciar.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"cargo","label":"Cargo o función","type":"texto"},{"key":"fecha_inicio","label":"Fecha de inicio","type":"fecha"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'denuncia', 'Denuncia penal', 'Penal', 'Denuncia de un hecho ante el Ministerio Público.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Fiscal de Materia de turno de {{ciudad}}</p>
<p>Ref.: Denuncia</p>
<h1>Denuncia</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, teléfono {{cliente_telefono}}, con el debido respeto presento denuncia contra {{denunciado_nombre}}, en base a lo siguiente:</p>
<h2>I. Hechos</h2>
<p>El día {{fecha_hechos}} ocurrió lo siguiente: {{hechos}}.</p>
<h2>II. Petitorio</h2>
<p>Solicito que se admita la denuncia, se inicien las investigaciones y se practiquen las diligencias necesarias para esclarecer los hechos. {{petitorio}}</p>
<h2>Otrosí</h2>
<p>Ofrezco las pruebas que acompaño y las que se obtengan durante la investigación.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"cliente_telefono","label":"Teléfono del cliente","type":"texto"},{"key":"denunciado_nombre","label":"Nombre de la persona denunciada","type":"texto"},{"key":"fecha_hechos","label":"Fecha de los hechos","type":"fecha"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'querella', 'Querella', 'Penal', 'Acusación particular de la víctima en un proceso penal.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez de Instrucción Penal de turno de {{ciudad}}</p>
<p>Ref.: Querella</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Querella</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, en calidad de víctima, con el debido respeto me constituyo en querellante contra {{denunciado_nombre}}.</p>
<h2>I. Relato de los hechos</h2>
<p>{{hechos}}</p>
<h2>II. Petitorio</h2>
<p>Pido que se admita la querella, se me tenga como parte querellante y se disponga la investigación y el procesamiento que correspondan. {{petitorio}}</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"denunciado_nombre","label":"Nombre de la persona denunciada","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'solicitud-audiencia-penal', 'Memorial de solicitud de audiencia', 'Penal', 'Pedido de señalamiento de audiencia en un proceso penal.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Solicitud de audiencia</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de audiencia</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, dentro del caso de referencia, con el debido respeto expongo y solicito:</p>
<p>Que se señale día y hora de audiencia para considerar lo siguiente: {{asunto}}.</p>
<p>Fundamento mi pedido en los siguientes hechos: {{hechos}}.</p>
<p>Pido que se notifique a todas las partes en sus domicilios procesales.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"asunto","label":"Asunto","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'apersonamiento-penal', 'Memorial de apersonamiento (penal)', 'Penal', 'El abogado se presenta como defensor en un caso penal.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Apersonamiento y señalamiento de domicilio</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Apersonamiento</h1>
<p>{{abogado_nombre}}, abogado, en representación de {{cliente_nombre}}, con C.I. {{cliente_ci}}, según el poder que acompaño, con el debido respeto digo:</p>
<p>Que me apersono al presente caso en defensa de mi mandante y pido que se me tenga como su representante, notificándome en el domicilio procesal que señalo: {{domicilio_legal}}.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'acta-constitucion', 'Acta de constitución de sociedad', 'Comercial y societario', 'Acta de fundación de una sociedad entre dos socios.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Acta de constitución de sociedad</h1>
<p>En la ciudad de {{ciudad}}, a {{fecha}}, se reúnen {{cliente_nombre}}, con C.I. {{cliente_ci}}, y {{socio2_nombre}}, con C.I. {{socio2_ci}}, con el propósito de constituir una sociedad.</p>
<h2>Primero. Denominación y domicilio</h2>
<p>La sociedad se denominará {{denominacion}} y tendrá su domicilio legal en {{domicilio_legal}}.</p>
<h2>Segundo. Objeto</h2>
<p>La sociedad tendrá por objeto: {{objeto}}.</p>
<h2>Tercero. Capital</h2>
<p>El capital social es de Bs {{capital}}, aportado por los socios en la proporción que acuerden por escrito.</p>
<h2>Cuarto. Duración</h2>
<p>La sociedad tendrá una duración de {{duracion_anios}} años, que podrá prorrogarse por decisión de los socios.</p>
<h2>Quinto. Administración</h2>
<p>La administración y representación estarán a cargo de {{cliente_nombre}}, con las facultades que los socios definan.</p>
<p>Firman en señal de conformidad:</p>
<p>{{cliente_nombre}}</p>
<p>{{socio2_nombre}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"socio2_nombre","label":"Nombre del segundo socio","type":"texto"},{"key":"socio2_ci","label":"Cédula de identidad del segundo socio","type":"texto"},{"key":"denominacion","label":"Denominación de la sociedad","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"capital","label":"Capital social en bolivianos","type":"numero"},{"key":"duracion_anios","label":"Duración en años","type":"numero"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'poder-representacion', 'Poder de representación', 'Comercial y societario', 'Otorga a una persona la facultad de representar a otra.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Poder de representación</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, otorgo poder a {{apoderado_nombre}}, con C.I. {{apoderado_ci}}, para que me represente en los siguientes asuntos: {{objeto}}.</p>
<p>El apoderado podrá realizar todos los actos necesarios para el cumplimiento de este encargo y firmar los documentos que se requieran.</p>
<p>Este poder se otorga por {{plazo_meses}} meses a partir de su firma.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"plazo_meses","label":"Plazo en meses","type":"numero"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'poder-especial', 'Poder especial', 'Comercial y societario', 'Poder limitado a un acto o trámite determinado.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Poder especial</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, confiero PODER ESPECIAL a {{apoderado_nombre}}, con C.I. {{apoderado_ci}}, únicamente para: {{facultades}}.</p>
<p>El apoderado no podrá realizar actos distintos a los indicados. Los actos realizados dentro de este encargo me obligarán como si los hubiese hecho yo mismo.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"facultades","label":"Facultades que se otorgan","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'poder-general', 'Poder general', 'Comercial y societario', 'Poder amplio para administrar asuntos del poderdante.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Poder general</h1>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, domiciliado en {{cliente_domicilio}}, otorgo PODER GENERAL a {{apoderado_nombre}}, con C.I. {{apoderado_ci}}, para que en mi nombre administre mis asuntos y bienes, y me represente ante personas e instituciones públicas y privadas.</p>
<p>Las facultades principales son: {{facultades}}.</p>
<p>Los actos que excedan la simple administración requerirán la autorización expresa que exija la ley.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"cliente_domicilio","label":"Domicilio del cliente","type":"texto"},{"key":"apoderado_nombre","label":"Nombre del apoderado","type":"texto"},{"key":"apoderado_ci","label":"Cédula de identidad del apoderado","type":"texto"},{"key":"facultades","label":"Facultades que se otorgan","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'carta-notariada', 'Carta notariada', 'Comercial y societario', 'Comunicación formal que se hace llegar por medio de notaría.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Señor(a)</p>
<p>{{contraparte_nombre}}</p>
<p>{{contraparte_domicilio}}</p>
<p>Presente.-</p>
<p>Ref.: {{asunto}}</p>
<p>CARTA NOTARIADA</p>
<p>De mi consideración:</p>
<p>Yo, {{cliente_nombre}}, con C.I. {{cliente_ci}}, me dirijo a usted para comunicarle formalmente lo siguiente: {{hechos}}.</p>
<p>Por lo expuesto, solicito que en el plazo de {{plazo_dias}} días cumpla con lo siguiente: {{petitorio}}. En caso contrario, me veré obligado a acudir a las instancias que correspondan.</p>
<p>Atentamente,</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"asunto","label":"Asunto","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"hechos","label":"Relato de los hechos","type":"largo"},{"key":"plazo_dias","label":"Plazo en días","type":"numero"},{"key":"petitorio","label":"Lo que se solicita","type":"largo"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'confidencialidad', 'Contrato de confidencialidad', 'Comercial y societario', 'Compromiso de reserva sobre información compartida.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<h1>Contrato de confidencialidad</h1>
<p>En {{ciudad}}, a {{fecha}}, {{empresa_nombre}} (PARTE QUE REVELA) y {{contraparte_nombre}}, C.I. {{contraparte_ci}} (PARTE QUE RECIBE), acuerdan:</p>
<h2>Primera. Información confidencial</h2>
<p>Es confidencial toda información que la parte que revela comparta de manera oral, escrita o digital sobre: {{objeto}}.</p>
<h2>Segunda. Obligación</h2>
<p>La parte que recibe se compromete a no divulgar ni usar la información para fines distintos a los acordados.</p>
<h2>Tercera. Duración</h2>
<p>Esta obligación dura {{duracion_anios}} años contados desde la fecha de este documento.</p>
<h2>Cuarta. Incumplimiento</h2>
<p>El incumplimiento dará lugar al reclamo de los daños y perjuicios que correspondan conforme a ley.</p>
<p>{{empresa_representante}} (parte que revela)</p>
<p>{{contraparte_nombre}} (parte que recibe)</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"empresa_nombre","label":"Nombre de la empresa o institución","type":"texto"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_ci","label":"Cédula de identidad de la otra parte","type":"texto"},{"key":"objeto","label":"Objeto o descripción","type":"largo"},{"key":"duracion_anios","label":"Duración en años","type":"numero"},{"key":"empresa_representante","label":"Representante legal","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'memorial-apersonamiento', 'Memorial de apersonamiento', 'General', 'Presentación del abogado y de su cliente ante un juzgado.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Apersonamiento</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Apersonamiento</h1>
<p>{{abogado_nombre}}, abogado, en representación de {{cliente_nombre}}, con C.I. {{cliente_ci}}, con el debido respeto digo:</p>
<p>Que me apersono al caso de referencia y pido que se me tenga como representante de mi mandante en todas las actuaciones.</p>
<p>Pido que se me notifique en el domicilio que señalo: {{domicilio_legal}}.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'memorial-domicilio', 'Memorial de señalamiento de domicilio', 'General', 'Informa el domicilio procesal para notificaciones.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Señalamiento de domicilio procesal</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Señalamiento de domicilio procesal</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, dentro del caso de referencia, con el debido respeto digo:</p>
<p>Que señalo como domicilio procesal para recibir notificaciones el ubicado en {{domicilio_legal}}, y pido que se me notifique en él de todas las actuaciones.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"domicilio_legal","label":"Domicilio legal","type":"texto"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'fotocopias-legalizadas', 'Solicitud de fotocopias legalizadas', 'General', 'Pide copias certificadas de un expediente.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor Juez: {{juzgado}}</p>
<p>Ref.: Solicitud de fotocopias legalizadas</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de fotocopias legalizadas</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, dentro del caso de referencia, con el debido respeto solicito:</p>
<p>Que se me otorguen fotocopias legalizadas de los siguientes actuados: {{documentos_copias}}.</p>
<p>Declaro que las copias se usarán para fines legales propios del caso, y asumo el costo que corresponda.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"documentos_copias","label":"Documentos o actuados cuya copia se solicita","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'carta-cobranza', 'Carta de cobranza', 'General', 'Recordatorio formal de una deuda pendiente.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>{{ciudad}}, {{fecha}}</p>
<p>Señor(a)</p>
<p>{{contraparte_nombre}}</p>
<p>{{contraparte_domicilio}}</p>
<p>Presente.-</p>
<p>Ref.: Cobro de deuda pendiente</p>
<p>De mi consideración:</p>
<p>Por medio de la presente le recuerdo que mantiene una deuda de Bs {{monto}} ({{monto_literal}}) por concepto de {{concepto}}.</p>
<p>Le solicito regularizar el pago hasta el {{fecha_limite}}. Si ya realizó el pago, le pido hacerme llegar el comprobante.</p>
<p>De no recibir respuesta, me reservo el derecho de iniciar las acciones que correspondan.</p>
<p>Atentamente,</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>$tpl$,
'[{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"contraparte_nombre","label":"Nombre completo de la otra parte","type":"texto"},{"key":"contraparte_domicilio","label":"Domicilio de la otra parte","type":"texto"},{"key":"monto","label":"Monto en bolivianos","type":"numero"},{"key":"monto_literal","label":"Monto en letras","type":"texto"},{"key":"concepto","label":"Concepto","type":"texto"},{"key":"fecha_limite","label":"Fecha límite de pago","type":"fecha"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

insert into templates (firm_id, slug, title, category, description, body_html, variables)
values (null, 'solicitud-audiencia', 'Solicitud de audiencia', 'General', 'Pedido de audiencia ante una autoridad.',
$tpl$<p><em>Modelo referencial: revisar y adaptar al caso concreto antes de usar.</em></p>
<p>Señor(a): {{juzgado}}</p>
<p>Ref.: Solicitud de audiencia</p>
<p>Caso N° {{caso_numero}}</p>
<h1>Solicitud de audiencia</h1>
<p>{{cliente_nombre}}, con C.I. {{cliente_ci}}, con el debido respeto solicito se señale día y hora de audiencia para tratar el siguiente asunto: {{asunto}}.</p>
<p>Motivo: {{motivo}}.</p>
<p>Pido que se notifique a las partes en sus domicilios.</p>
<p>{{ciudad}}, {{fecha}}</p>
<p>{{cliente_nombre}}</p>
<p>C.I. {{cliente_ci}}</p>
<p>{{abogado_nombre}}</p>
<p>ABOGADO</p>$tpl$,
'[{"key":"juzgado","label":"Juzgado o autoridad","type":"texto"},{"key":"caso_numero","label":"Número de caso","type":"texto"},{"key":"cliente_nombre","label":"Nombre completo del cliente","type":"texto"},{"key":"cliente_ci","label":"Cédula de identidad del cliente","type":"texto"},{"key":"asunto","label":"Asunto","type":"texto"},{"key":"motivo","label":"Motivo","type":"largo"},{"key":"ciudad","label":"Ciudad","type":"texto"},{"key":"fecha","label":"Fecha","type":"fecha"},{"key":"abogado_nombre","label":"Nombre del abogado","type":"texto"}]'::jsonb)
on conflict (slug) where firm_id is null do nothing;

-- ===== supabase/migrations/0004_laws_demo.sql =====
-- Corpus DEMO ficticio para probar el flujo de IA sin cargar leyes reales.
-- NO es norma vigente. Para cargar el corpus real: npm run ingest:leyes (Lexivox, GFDL).
insert into law_sources (code, title, kind, source_name, source_url, license, is_demo)
values
  ('DEMO-ARR', 'Norma de ejemplo sobre arrendamientos (ficticia)', 'demo', 'Texto ficticio de prueba', null, 'Sin licencia (inventado para pruebas)', true),
  ('DEMO-PLZ', 'Norma de ejemplo sobre plazos procesales (ficticia)', 'demo', 'Texto ficticio de prueba', null, 'Sin licencia (inventado para pruebas)', true)
on conflict (code) do nothing;

insert into law_chunks (source_id, article, heading, content)
select s.id, v.article, v.heading, v.content
from law_sources s
join (values
  ('DEMO-ARR', 'Artículo 1', 'Disposiciones generales', 'DEMO: El arrendamiento es un contrato ficticio por el cual una parte cede a otra el uso de un inmueble a cambio de un canon. Este texto es inventado solo para probar el sistema.'),
  ('DEMO-ARR', 'Artículo 2', 'Disposiciones generales', 'DEMO: El canon de arrendamiento ficticio debe pagarse dentro de los primeros cinco días de cada mes. Texto inventado, no vigente.'),
  ('DEMO-PLZ', 'Artículo 1', 'Plazos', 'DEMO: El plazo ficticio para contestar una demanda de ejemplo es de treinta días calendario. Texto inventado, no vigente; verifique siempre la norma real en la Gaceta Oficial de Bolivia.')
) as v(code, article, heading, content) on v.code = s.code
where not exists (select 1 from law_chunks c where c.source_id = s.id and c.article = v.article);

-- ===== supabase/migrations/0005_reminders.sql =====
-- Recordatorios: marca de "ya avisado" (evita enviar el mismo aviso dos veces)
alter table appointments add column if not exists reminded_at timestamptz;

-- ===== supabase/migrations/0006_portal_invoices.sql =====
-- El cliente del portal puede ver ítems y pagos de SUS facturas ya enviadas/pagadas.
create policy invoice_items_portal on invoice_items for select to authenticated
  using (exists (select 1 from invoices i where i.id = invoice_id and i.client_id = current_client_id() and i.status in ('enviada','pagada')));
create policy payments_portal on payments for select to authenticated
  using (exists (select 1 from invoices i where i.id = invoice_id and i.client_id = current_client_id() and i.status in ('enviada','pagada')));

