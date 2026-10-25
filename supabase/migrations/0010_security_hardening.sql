-- Counsel · endurecimiento de seguridad (auditoría de la base, Sprint 5-6, tarea C)
-- Idempotente. No edita 0001–0009: reemplaza funciones/políticas con `create or replace` / `drop policy if exists`.
--
-- Hallazgos que corrige:
--  1. Postgres da EXECUTE a PUBLIC por defecto => anon podía invocar TODAS las funciones de `public`
--     (register_firm, set_member_role, team_directory, has_role, ...). Solo submit_intake, request_appointment
--     y firm_public deben ser públicas.
--  2. anon tenía privilegios de tabla (Supabase los da por defecto). Con RLS no veía filas, pero se quitan
--     (defensa en profundidad: ninguna política ni grant de tabla para anon).
--  3. templates_read dejaba que un cliente del portal leyera las plantillas privadas de su despacho.
--  4. submit_intake / request_appointment: sin límite de frecuencia (cualquiera podía inundar al despacho de
--     solicitudes y de correos de aviso) y con campos sin límite de largo (email, teléfono, nombre en la cita…).
--  5. register_firm: sin validación de largo/forma del nombre de la persona y del despacho.

-- ───────────────────────── 1. Funciones: solo las 3 públicas para anon ─────────────────────────
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      -- no tocar funciones de extensiones (pgvector vive en public)
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
  end loop;
end $$;

-- Las funciones futuras tampoco serán públicas por omisión (hay que hacer grant explícito).
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- ───────────────────────── 2. anon sin acceso directo a tablas ─────────────────────────
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ───────────────────────── 3. Plantillas: solo el personal (no el portal del cliente) ─────────────────────────
drop policy if exists templates_read on templates;
create policy templates_read on templates for select to authenticated
  using (is_staff() and (firm_id is null or firm_id = current_firm_id()));

-- ───────────────────────── 4. RPC públicos: límites de largo y de frecuencia ─────────────────────────
create or replace function public.submit_intake(p_slug text, p_name text, p_email text, p_phone text, p_matter text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_firm firms; v_id uuid;
begin
  select * into v_firm from firms where slug = p_slug and intake_enabled;
  if not found then raise exception 'Formulario no disponible'; end if;
  if char_length(btrim(coalesce(p_name,''))) < 2 or char_length(btrim(coalesce(p_message,''))) < 5 then
    raise exception 'Datos incompletos';
  end if;
  if char_length(p_message) > 4000 or char_length(p_name) > 200
     or char_length(coalesce(p_email,'')) > 254 or char_length(coalesce(p_phone,'')) > 40
     or char_length(coalesce(p_matter,'')) > 60 then
    raise exception 'Texto demasiado largo';
  end if;
  if coalesce(p_email,'') <> '' and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo no válido';
  end if;
  -- Freno anti-inundación por despacho (también evita avisos por correo en masa)
  if (select count(*) from intake_submissions where firm_id = v_firm.id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Demasiadas consultas en poco tiempo. Intenta de nuevo más tarde.';
  end if;
  insert into intake_submissions (firm_id, full_name, email, phone, matter, message)
  values (v_firm.id, btrim(p_name), nullif(p_email,''), nullif(p_phone,''), nullif(p_matter,''), p_message)
  returning id into v_id;
  insert into notifications (firm_id, to_email, kind, subject, body)
  select v_firm.id, p.email, 'intake', 'Nueva consulta: ' || left(btrim(p_name), 120), left(p_message, 500)
  from profiles p where p.firm_id = v_firm.id and p.role = 'owner' and p.active and p.email is not null;
  return v_id;
end $$;

create or replace function public.request_appointment(p_slug text, p_name text, p_email text, p_phone text, p_reason text, p_preferred timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_firm firms; v_id uuid;
begin
  select * into v_firm from firms where slug = p_slug and bot_enabled;
  if not found then raise exception 'Reserva no disponible'; end if;
  if char_length(btrim(coalesce(p_name,''))) < 2 then raise exception 'Datos incompletos'; end if;
  if char_length(p_name) > 200 or char_length(coalesce(p_email,'')) > 254 or char_length(coalesce(p_phone,'')) > 40 then
    raise exception 'Texto demasiado largo';
  end if;
  if coalesce(p_email,'') <> '' and p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo no válido';
  end if;
  if p_preferred is null or p_preferred < now() then raise exception 'La fecha debe ser futura'; end if;
  if p_preferred > now() + interval '2 years' then raise exception 'La fecha es demasiado lejana'; end if;
  if (select count(*) from appointment_requests where firm_id = v_firm.id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Demasiadas solicitudes en poco tiempo. Intenta de nuevo más tarde.';
  end if;
  insert into appointment_requests (firm_id, full_name, email, phone, reason, preferred_at)
  values (v_firm.id, btrim(p_name), nullif(p_email,''), nullif(p_phone,''), left(p_reason, 1000), p_preferred)
  returning id into v_id;
  insert into notifications (firm_id, to_email, kind, subject, body)
  select v_firm.id, p.email, 'cita', 'Solicitud de cita: ' || left(btrim(p_name), 120), coalesce(left(p_reason, 300), '')
  from profiles p where p.firm_id = v_firm.id and p.role = 'owner' and p.active and p.email is not null;
  return v_id;
end $$;

grant execute on function public.submit_intake(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.request_appointment(text, text, text, text, text, timestamptz) to anon, authenticated;
grant execute on function public.firm_public(text) to anon, authenticated;

-- ───────────────────────── 5. register_firm: validación de entradas ─────────────────────────
create or replace function public.register_firm(p_firm_name text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_firm uuid;
  v_slug text;
  v_email text;
  v_name text := btrim(coalesce(p_firm_name, ''));
  v_person text := btrim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then raise exception 'Ya tienes un despacho'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 120 then raise exception 'El nombre del despacho debe tener entre 2 y 120 caracteres'; end if;
  if char_length(v_person) < 2 or char_length(v_person) > 200 then raise exception 'Tu nombre debe tener entre 2 y 200 caracteres'; end if;
  v_slug := lower(regexp_replace(translate(v_name, 'áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if char_length(v_slug) < 3 then v_slug := 'despacho-' || substr(gen_random_uuid()::text, 1, 6); end if;
  v_slug := trim(both '-' from left(v_slug, 32));
  if char_length(v_slug) < 3 or exists (select 1 from firms where slug = v_slug) then
    v_slug := left(v_slug, 32) || '-' || substr(gen_random_uuid()::text, 1, 5);
  end if;
  insert into firms (name, slug) values (v_name, v_slug) returning id into v_firm;
  select email into v_email from auth.users where id = auth.uid();
  insert into profiles (id, firm_id, full_name, email, role) values (auth.uid(), v_firm, v_person, v_email, 'owner');
  return v_firm;
end $$;
