# Counsel (nombre provisional)

Gestión legal para abogados y pequeños despachos de Bolivia. Web app instalable (PWA): casos con Kanban, agenda, tareas, documentos con versiones, editor y plantillas, cobros, tiempo, dashboard, asistente legal con IA citada, portal del cliente, formulario de consultas y bot de citas.

Documentos clave: [PRODUCT.md](PRODUCT.md) · [DESIGN.md](DESIGN.md) · [CLAUDE.md](CLAUDE.md) · [DECISIONS.md](DECISIONS.md) · [PROGRESS.md](PROGRESS.md) · [docs/SECURITY.md](docs/SECURITY.md) · [docs/MODULE_GUIDE.md](docs/MODULE_GUIDE.md)

## Cómo correrlo

Requisitos: Node 20+, un proyecto de [Supabase](https://supabase.com) (nube, o local con Docker + `supabase start`).

```bash
npm install
cp .env.example .env.local      # completa las claves (ver abajo)
```

1. **Base de datos**: en Supabase → SQL Editor, ejecuta en orden `supabase/migrations/0001…0006` (o `supabase db push` con la CLI). Incluye esquema, RLS, bucket de Storage, 32 plantillas, leyes demo.
2. **Auth**: en Supabase → Authentication → URL Configuration, agrega `http://localhost:3000/auth/callback` (y tu dominio) a Redirect URLs. Para probar sin confirmar correo, desactiva "Confirm email".
3. `npm run dev` → http://localhost:3000 → "Crear mi despacho".
4. **Datos demo** (opcional, ficticios): `npx tsx scripts/seed-demo.ts` (necesita `SUPABASE_SERVICE_ROLE_KEY`; imprime usuario y clave).
5. **Leyes reales** (opcional): `npm run ingest:leyes` descarga de Lexivox (revisa los títulos de página en `scripts/leyes.config.json`). Sin esto, la IA solo ve 3 artículos DEMO ficticios.
6. **IA**: `ANTHROPIC_API_KEY` en `.env.local`. Modelo por defecto `claude-opus-5-5`; para ahorrar usa `ANTHROPIC_MODEL=claude-sonnet-5-5`. Embeddings opcionales con `VOYAGE_API_KEY`.
7. **Emails**: `RESEND_API_KEY` + `EMAIL_FROM`. Programa un cron cada 15–60 min: `GET /api/cron/recordatorios` con `Authorization: Bearer $CRON_SECRET` (Vercel Cron, GitHub Actions, etc.).

Comandos: `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`. CI en `.github/workflows/ci.yml`.

**Deploy**: Vercel (importar repo, variables de `.env.example`, `NEXT_PUBLIC_APP_URL` con tu dominio).

## Resumen por sprint
| Sprint | Contenido |
|---|---|
| 0 | Repo, design system (tokens, 18 px base, tema claro/oscuro, tamaño de letra y densidad por usuario), auth, multi-tenant con RLS probado en PGlite, CI, PWA base |
| 1 | Clientes, casos con Kanban (arrastrar o "Mover a…"), línea de tiempo, agenda (lista y mes), tareas, documentos con versiones y Storage, Cmd/Ctrl+K con búsqueda |
| 2 | Editor Tiptap con autoguardado y versiones, 32 plantillas con autollenado, cuentas de cobro con pagos e impresión, timer manual, dashboard "Lo de hoy" |
| 3 | Asistente legal (cita norma + artículo + fuente; sin fuente no consulta al modelo), chat con el caso (datos personales ocultos por defecto, aviso de qué se envía), dictado → redacción corregida, generador desde plantilla, página de fuentes (Lexivox, GFDL) |
| 4 | Portal del cliente, formulario de consulta, bot de citas, bandeja de consultas, emails y recordatorios, PWA instalable, CSP/HSTS, términos y privacidad con aceptación registrada, datos demo |

## Qué falta (honesto)
- **No se probó en navegador ni contra un Supabase real**: lint, tipos, 171 tests y `next build` pasan, y las políticas RLS se probaron en Postgres (PGlite), pero las pantallas y las server actions no se ejecutaron end-to-end. Esperen pequeños errores de integración en la primera corrida. Revisión visual (contraste, móvil, impresión de cobros y escritos) pendiente.
- Leyes reales no cargadas: ejecutar `ingest:leyes` y verificar que los títulos de página existan en Lexivox.
- Términos y privacidad son **borradores**: requieren revisión legal.
- Cobros no son facturas fiscales (SIAT).
- Dictado con Web Speech (Chrome/Edge); la interfaz está lista para cambiar a Whisper (`src/lib/dictation/engine.ts`).
- Rate limiting es en memoria; CSP permite `unsafe-inline`; sin MFA (ver `docs/SECURITY.md`).
- Sin paginación (listas cargan hasta ~500 registros), sin invitar colegas al despacho desde la interfaz, sin exportar datos.
- Íconos PWA y marca son provisionales.

## Decisiones pendientes para ti
- Nombre definitivo del producto y dominio.
- Modelo de IA por defecto (calidad vs. costo): `claude-opus-5-5` vs `claude-sonnet-5-5`.
- Proveedor de embeddings (Voyage) y si se carga el corpus legal completo.
- Política de retención de datos y del registro de auditoría de IA.
- Planes y cobro del servicio; moneda por defecto (Bs).
- Ver también las decisiones tomadas en [DECISIONS.md](DECISIONS.md).
