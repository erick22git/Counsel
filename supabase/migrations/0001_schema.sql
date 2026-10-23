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
