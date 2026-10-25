-- Counsel · registro de auditoría (Sprint 5-6, E3)
-- Quién creó/cambió/eliminó/vio qué. Solo el titular lo lee. Nadie lo edita ni lo borra desde la app.
-- NOTA DE RETENCIÓN: la tabla solo crece. Definir una política (p. ej. archivar >24 meses) antes de producción.

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null default current_firm_id() references firms (id) on delete cascade,
  user_id uuid references profiles (id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete', 'view')),
  entity text not null,            -- nombre de tabla: cases, clients, documents, ...
  entity_id uuid,
  summary text not null default '', -- etiqueta corta de la entidad (título, nombre, número)
  meta jsonb not null default '{}'::jsonb, -- {actor, changes:{campo:{from,to}}}
  at timestamptz not null default now()
);
create index if not exists audit_log_firm_at on audit_log (firm_id, at desc);
create index if not exists audit_log_entity on audit_log (firm_id, entity, entity_id);

alter table audit_log enable row level security;

drop policy if exists audit_log_owner_select on audit_log;
create policy audit_log_owner_select on audit_log for select to authenticated
  using (firm_id = current_firm_id() and has_role('owner'));

-- Las "vistas" las registra la app con la sesión del usuario (logView). Solo 'view', solo a su nombre.
drop policy if exists audit_log_view_insert on audit_log;
create policy audit_log_view_insert on audit_log for insert to authenticated
  with check (firm_id = current_firm_id() and is_staff() and action = 'view' and user_id = auth.uid());

-- Sin políticas de update/delete => RLS los rechaza. Además quitamos el privilegio.
revoke update, delete, truncate on audit_log from authenticated, anon;

-- ───────────────────────── Trigger genérico ─────────────────────────
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_entity text := tg_argv[0];
  o jsonb; n jsonb; r jsonb;
  v_firm uuid; v_id uuid; v_changes jsonb; v_label text; v_actor text; v_user uuid;
  v_action text;
  v_skip text[] := array['content_html', 'updated_at', 'created_at', 'tsv', 'embedding', 'preferences'];
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  v_firm := (r->>'firm_id')::uuid;
  v_id := (r->>'id')::uuid;
  -- Si el despacho se está eliminando en cascada, no hay dónde registrar.
  if not exists (select 1 from firms where id = v_firm) then return null; end if;

  v_label := left(coalesce(
    r->>'title', r->>'full_name', r->>'number',
    case when v_entity = 'payments' then 'Pago de ' || (r->>'amount') end,
    case when v_entity = 'document_versions' then 'Versión ' || (r->>'version') end,
    ''), 200);

  if tg_op = 'INSERT' then
    v_action := 'create'; v_changes := '{}'::jsonb;
  elsif tg_op = 'DELETE' then
    v_action := 'delete'; v_changes := '{}'::jsonb;
  else
    v_action := 'update';
    o := to_jsonb(old); n := to_jsonb(new);
    -- Solo los campos que cambiaron; textos recortados a 200 caracteres; nunca content_html.
    select coalesce(jsonb_object_agg(e.key, jsonb_build_object('from', left(o->>e.key, 200), 'to', left(n->>e.key, 200))), '{}'::jsonb)
      into v_changes
      from jsonb_each(n) e
      where e.key <> all (v_skip) and e.value is distinct from o->e.key;
    if v_changes = '{}'::jsonb then return null; end if;
  end if;

  select id, full_name into v_user, v_actor from profiles where id = auth.uid();
  insert into audit_log (firm_id, user_id, action, entity, entity_id, summary, meta)
  values (v_firm, v_user, v_action, v_entity, v_id, v_label,
          jsonb_build_object('actor', v_actor, 'changes', v_changes));
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['cases', 'clients', 'documents', 'document_versions', 'invoices', 'payments'] loop
    execute format('drop trigger if exists t_audit on %I', t);
    execute format('create trigger t_audit after insert or update or delete on %I for each row execute function audit_row(%L)', t, t);
  end loop;
end $$;

-- Cambios de equipo: alta, cambio de rol, quitar/reactivar.
drop trigger if exists t_audit on profiles;
create trigger t_audit after insert or update of role, active or delete on profiles
  for each row execute function audit_row('profiles');
