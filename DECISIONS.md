# DECISIONS

Decisiones tomadas sin preguntar (para que las revises). Formato: fecha · decisión · motivo.

- 2026-10-23 · Skill de Emil Kowalski **no existía** en el equipo (el usuario dijo que sí). Se instaló `emilkowalski/skills@improve-animations`. Además los principios de movimiento están normalizados en DESIGN.md.
- 2026-10-23 · Skills instaladas con `npx skills add`: ui-ux-pro-max, impeccable, design-taste-frontend (de Leonxlnx/taste-skill, nombre real de la skill), improve-animations. No hizo falta `/plugin marketplace`.
- 2026-10-23 · Regla 0 de refero.md ("no colores fosforescentes") se aplica así: se descarta Acid Lime y los acentos saturados de Notion (Marigold, Coral, Vermillion) se reemplazan por tonos apagados. Único acento: azul Notion oscurecido (#0a64c8) para AA con texto blanco.
- 2026-10-23 · Next.js 16.4.3 (lo que generó create-next-app). Se desactivó `cacheComponents`/`partialPrefetching` que traía por defecto: complican el acceso a datos dinámicos con Supabase sin aportar a un SaaS autenticado.
- 2026-10-23 · Entorno sin Docker: no se puede correr Supabase local. Las migraciones SQL se prueban con PGlite (Postgres en WASM + pgvector) en tests de Vitest, incluyendo RLS. Se necesita un proyecto Supabase real (o `supabase start` con Docker) para correr la app: ver README.
- 2026-10-23 · Moneda por defecto Bs (BOB), con USD opcional. Zona horaria America/La_Paz.
- 2026-10-23 · PWA hecha a mano (manifest + service worker simple) en vez de librería, para evitar fricción con Turbopack.
- 2026-10-23 · El repositorio se llama `counsel`; "Counsel" es nombre provisional.
- 2026-10-23 · Fuente legal: Lexivox (texto bajo GFDL). Se incluye atribución en cada cita y en la página "Fuentes legales". El corpus real no se descarga en la sesión: se entrega un script de ingesta + un corpus semilla pequeño con textos de ejemplo claramente marcados como "demo, verificar en Gaceta Oficial". Nunca se inventan artículos: el semilla solo contiene fragmentos que se marcan para verificación.
- 2026-10-23 · La vista previa del navegador de la app de escritorio lee `C:\Erick\.claude\launch.json` (otro proyecto), por lo que no se verificó visualmente. Se verifica con lint, tsc, tests y `next build`. Pendiente: revisión visual manual con `npm run dev`.
- 2026-10-23 · Corpus legal: no se transcriben artículos de memoria. El script `ingest:leyes` descarga de Lexivox; el semilla de desarrollo es texto ficticio marcado `is_demo`.
- 2026-10-23 · Embeddings: Anthropic no ofrece API de embeddings. Búsqueda principal = texto completo en español (Postgres); vectores opcionales con Voyage AI (`VOYAGE_API_KEY`), columna `vector(1024)` ya creada.
- 2026-10-23 · Portal del cliente: el usuario-cliente se crea con la service-role en servidor (invitación) y se enlaza en `profiles.client_id`; RLS le da solo lectura de lo suyo.
