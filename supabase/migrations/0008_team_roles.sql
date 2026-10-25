-- Counsel · equipo y permisos por rol (Sprint 5-6, E1)
-- * profiles.active: "quitar" a un colega = desactivarlo (reversible). Inactivo => no ve nada (RLS).
-- * has_role(): helper para políticas por rol.
-- * Políticas por rol sobre las tablas *_staff de 0001 (owner todo; lawyer sin gestionar equipo ni borrar
--   definitivamente; assistant sin cobros/tiempo/auditoría IA ni perfiles ajenos).
-- * Funciones set_member_role / set_member_active (solo titular) y límite de 10 miembros.
-- Idempotente: puede ejecutarse más de una vez.

alter table profiles add column if not exists active boolean not null default true;

-- ───────────────────────── Funciones auxiliares (misma firma que 0001) ─────────────────────────
create or replace function public.current_firm_id() returns uuid
language sql stable security definer set search_path = public as $$
  select firm_id from profiles where id = auth.uid() and active
$$;

create or replace function public.current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function public.current_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from profiles where id = auth.uid() and role = 'client' and active
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role <> 'client' and active from profiles where id = auth.uid()), false)
$$;

-- ¿El usuario actual (activo) tiene alguno de estos roles?  has_role('owner','lawyer')
create or replace function public.has_role(variadic roles user_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select active and role = any(roles) from profiles where id = auth.uid()), false)
$$;

-- ───────────────────────── Perfiles: protección y visibilidad ─────────────────────────
-- Nadie cambia su propio rol/despacho/estado; solo las funciones del titular (bandera de transacción).
create or replace function public.protect_profile_fields() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('counsel.profile_admin', true), '') <> '1'
     and (new.role <> old.role or new.firm_id <> old.firm_id or new.client_id is distinct from old.client_id
          or new.active is distinct from old.active) then
    raise exception 'No se puede cambiar el rol, el estado ni el despacho';
  end if;
  return new;
end $$;

-- Titular y abogados ven a todo el equipo; el asistente solo su propio perfil (usa team_directory()).
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or (firm_id = current_firm_id() and has_role('owner', 'lawyer')));

-- Directorio mínimo (nombre + rol) para listas de responsables; sin correo ni tarifa.
create or replace function public.team_directory()
returns table (id uuid, full_name text, role user_role, active boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.role, p.active
  from profiles p
  where p.firm_id = current_firm_id() and p.role <> 'client' and is_staff()
  order by p.full_name
$$;
grant execute on function public.team_directory() to authenticated;

-- Límite MVP: 10 miembros activos (sin contar clientes del portal) por despacho.
create or replace function public.enforce_team_limit() returns trigger language plpgsql as $$
begin
  if new.role <> 'client' and new.active
     and (tg_op = 'INSERT' or old.active is false or old.role = 'client') then
    if (select count(*) from profiles
        where firm_id = new.firm_id and role <> 'client' and active and id <> new.id) >= 10 then
      raise exception 'Tu despacho ya tiene 10 miembros. Quita a alguien para invitar a otra persona.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists t_profiles_limit on profiles;
create trigger t_profiles_limit before insert or update of active, role on profiles
  for each row execute function enforce_team_limit();

-- Cambiar rol (solo titular). Nunca a 'client'; nunca deja al despacho sin titular.
create or replace function public.set_member_role(p_user uuid, p_role user_role) returns void
language plpgsql security definer set search_path = public as $$
declare v_target profiles;
begin
  if not has_role('owner') then raise exception 'Solo el titular puede cambiar roles'; end if;
  if p_role = 'client' then raise exception 'Rol no permitido'; end if;
  select * into v_target from profiles where id = p_user and firm_id = current_firm_id();
  if not found then raise exception 'No encontré a esa persona en tu despacho'; end if;
  if v_target.role = 'client' then raise exception 'Esa cuenta es de un cliente del portal'; end if;
  if v_target.role = 'owner' and p_role <> 'owner'
     and (select count(*) from profiles where firm_id = v_target.firm_id and role = 'owner' and active and id <> p_user) = 0 then
    raise exception 'No puedes cambiar el rol del último titular';
  end if;
  perform set_config('counsel.profile_admin', '1', true);
  update profiles set role = p_role where id = p_user;
  perform set_config('counsel.profile_admin', '', true);
end $$;
grant execute on function public.set_member_role(uuid, user_role) to authenticated;

-- Quitar (p_active=false) o reactivar (true) a un miembro. Solo titular.
create or replace function public.set_member_active(p_user uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_target profiles;
begin
  if not has_role('owner') then raise exception 'Solo el titular puede quitar miembros'; end if;
  select * into v_target from profiles where id = p_user and firm_id = current_firm_id();
  if not found then raise exception 'No encontré a esa persona en tu despacho'; end if;
  if v_target.role = 'client' then raise exception 'Esa cuenta es de un cliente del portal'; end if;
  if not p_active then
    if p_user = auth.uid() then raise exception 'No puedes quitarte a ti mismo'; end if;
    if v_target.role = 'owner'
       and (select count(*) from profiles where firm_id = v_target.firm_id and role = 'owner' and active and id <> p_user) = 0 then
      raise exception 'No puedes quitar al último titular';
    end if;
  end if;
  perform set_config('counsel.profile_admin', '1', true);
  update profiles set active = p_active where id = p_user;
  perform set_config('counsel.profile_admin', '', true);
end $$;
grant execute on function public.set_member_active(uuid, boolean) to authenticated;

-- ───────────────────────── Casos: el asistente no reasigna ni archiva ─────────────────────────
create or replace function public.guard_case_assistant() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and current_user_role() = 'assistant'
     and (new.responsible_id is distinct from old.responsible_id or new.deleted_at is distinct from old.deleted_at) then
    raise exception 'Tu rol no permite cambiar el responsable ni archivar casos';
  end if;
  return new;
end $$;
drop trigger if exists t_cases_guard_assistant on cases;
create trigger t_cases_guard_assistant before update on cases for each row execute function guard_case_assistant();

-- ───────────────────────── Políticas por rol ─────────────────────────
-- (tabla, roles que leen/crean/editan, roles que borran definitivamente). El titular siempre puede todo.
do $$
declare
  r record;
begin
  for r in select * from (values
    ('clients',             '{owner,lawyer,assistant}', '{owner}'),
    ('cases',               '{owner,lawyer,assistant}', '{owner}'),
    ('case_events',         '{owner,lawyer,assistant}', '{owner,lawyer}'),
    ('appointments',        '{owner,lawyer,assistant}', '{owner,lawyer,assistant}'),
    ('tasks',               '{owner,lawyer,assistant}', '{owner,lawyer,assistant}'),
    ('documents',           '{owner,lawyer,assistant}', '{owner}'),
    ('document_versions',   '{owner,lawyer,assistant}', '{owner,lawyer}'),
    ('ai_conversations',    '{owner,lawyer,assistant}', '{owner,lawyer,assistant}'),
    ('ai_messages',         '{owner,lawyer,assistant}', '{owner,lawyer,assistant}'),
    ('notifications',       '{owner,lawyer,assistant}', '{owner,lawyer,assistant}'),
    ('intake_submissions',  '{owner,lawyer,assistant}', '{owner,lawyer}'),
    ('appointment_requests','{owner,lawyer,assistant}', '{owner,lawyer}'),
    ('invoices',            '{owner,lawyer}',           '{owner}'),
    ('invoice_items',       '{owner,lawyer}',           '{owner,lawyer}'),
    ('payments',            '{owner,lawyer}',           '{owner}'),
    ('time_entries',        '{owner,lawyer}',           '{owner,lawyer}')
  ) as v(tbl, rw, del)
  loop
    execute format('drop policy if exists %I on %I', r.tbl || '_staff', r.tbl);
    execute format('drop policy if exists %I on %I', r.tbl || '_r_select', r.tbl);
    execute format('drop policy if exists %I on %I', r.tbl || '_r_insert', r.tbl);
    execute format('drop policy if exists %I on %I', r.tbl || '_r_update', r.tbl);
    execute format('drop policy if exists %I on %I', r.tbl || '_r_delete', r.tbl);
    execute format(
      'create policy %I on %I for select to authenticated using (firm_id = current_firm_id() and has_role(variadic %L::user_role[]))',
      r.tbl || '_r_select', r.tbl, r.rw);
    execute format(
      'create policy %I on %I for insert to authenticated with check (firm_id = current_firm_id() and has_role(variadic %L::user_role[]))',
      r.tbl || '_r_insert', r.tbl, r.rw);
    execute format(
      'create policy %I on %I for update to authenticated using (firm_id = current_firm_id() and has_role(variadic %L::user_role[])) with check (firm_id = current_firm_id() and has_role(variadic %L::user_role[]))',
      r.tbl || '_r_update', r.tbl, r.rw, r.rw);
    execute format(
      'create policy %I on %I for delete to authenticated using (firm_id = current_firm_id() and has_role(variadic %L::user_role[]))',
      r.tbl || '_r_delete', r.tbl, r.del);
  end loop;
end $$;

-- Registro de qué se envió a la IA: lo lee titular/abogado; cualquier personal puede registrar su uso.
drop policy if exists ai_audit_log_staff on ai_audit_log;
drop policy if exists ai_audit_log_r_select on ai_audit_log;
drop policy if exists ai_audit_log_r_insert on ai_audit_log;
drop policy if exists ai_audit_log_r_delete on ai_audit_log;
create policy ai_audit_log_r_select on ai_audit_log for select to authenticated
  using (firm_id = current_firm_id() and has_role('owner', 'lawyer'));
create policy ai_audit_log_r_insert on ai_audit_log for insert to authenticated
  with check (firm_id = current_firm_id() and is_staff());
create policy ai_audit_log_r_delete on ai_audit_log for delete to authenticated
  using (firm_id = current_firm_id() and has_role('owner'));
