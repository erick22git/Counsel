# Seguridad — Counsel

## Modelo
- **Multi-tenant por despacho** con RLS en Postgres: cada tabla de negocio tiene `firm_id` y políticas `firm_id = current_firm_id() and is_staff()`. 12+ pruebas automáticas (`tests/db/rls.test.ts`, PGlite) verifican aislamiento, portal del cliente y formularios públicos.
- **Portal del cliente**: rol `client`, solo lectura, limitado a sus casos, eventos marcados "visible", citas visibles, documentos compartidos y facturas enviadas/pagadas.
- **Service-role** solo en servidor y para: invitar al portal, cron de recordatorios, ingesta de leyes, datos demo. Nunca en el navegador (`import "server-only"`).
- **Formularios públicos** (consulta, reservar): solo mediante funciones `security definer` (`submit_intake`, `request_appointment`) que validan largo y estado; sin acceso a tablas. Además honeypot y límite por IP (en memoria, por instancia).
- **Storage**: bucket privado `documents`; ruta con prefijo `firm_id`; políticas por despacho; URLs firmadas de 60 s.
- **Cabeceras**: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.
- **IA**: sin fuentes no se llama al modelo; límite diario por usuario (150); auditoría en `ai_audit_log` de qué se envió; opción de ocultar datos personales del cliente; texto de casos tratado como dato, no instrucción.
- **Auth**: Supabase Auth (contraseñas con hash, sesión por cookie httpOnly vía `@supabase/ssr`); redirecciones `siguiente` validadas contra open-redirect.
- **Términos y privacidad**: aceptación versionada con fecha, IP y navegador (`terms_acceptances`).

## Pendiente / recomendado antes de producción
1. Revisión legal de términos y privacidad (son borradores).
2. Activar MFA y confirmación de correo en Supabase; política de contraseñas.
3. Rate limiting distribuido (Upstash/Edge) para formularios públicos y `/api/ia/*`.
4. Endurecer CSP con nonces (hoy permite `'unsafe-inline'` por requisitos de Next).
5. Copias de seguridad y prueba de restauración; retención de `ai_audit_log`.
6. Prueba de penetración externa y revisión de dependencias (`npm audit`).
7. Rotar la clave `SUPABASE_SERVICE_ROLE_KEY` si se expuso y borrar el usuario demo.
