# CLAUDE.md — Counsel

Sistema de gestión legal para abogados de Bolivia. Lee primero `PRODUCT.md` (producto y reglas de IA) y `DESIGN.md` (diseño). Decisiones tomadas: `DECISIONS.md`. Estado: `PROGRESS.md`.

## Producto en una línea
Web app (PWA) rápida, simple y fácil para abogados de 50+ años. Lo que toma 10 minutos debe tomar 2 clics.

## Stack
Next.js 16 (App Router) + TypeScript + Tailwind v4 + componentes tipo shadcn/ui (Radix), Supabase (Postgres, Auth, Storage, pgvector, RLS por despacho), Tiptap, dnd-kit, Framer Motion, cmdk, Claude API (rutas de servidor). Lee `node_modules/next/dist/docs/` antes de usar APIs de Next que no conozcas (`AGENTS.md`).

## Comandos
- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test`
- Migraciones: `supabase/migrations/*.sql` (se prueban con PGlite en `tests/db`).

## Reglas de código
- Todo texto de interfaz en español de Bolivia, lenguaje simple. Textos en `src/lib/i18n/es.ts` cuando sean reutilizables.
- Multi-tenant: cada tabla de negocio lleva `firm_id` y RLS activada. Nunca usar la service-role key en código de cliente. Toda consulta pasa por el cliente Supabase del usuario.
- Datos demo siempre ficticios. Nunca datos reales.
- Server Actions/Route Handlers validan con zod.
- Colores solo vía tokens CSS (`var(--accent)`, etc.). Nada fosforescente. Un solo acento.
- Texto base 18 px; áreas táctiles ≥ 44 px; foco visible; etiquetas con texto.
- Animación: ≤ 250 ms, solo transform/opacity, respetar `prefers-reduced-motion`.
- Acciones destructivas: confirmación clara + "Deshacer" (soft delete con `deleted_at`).
- IA legal: cita norma + artículo + fuente; si no hay fuente, lo dice; aviso Gaceta Oficial siempre visible; mostrar qué se envía al LLM.

## Estructura
- `src/app/(auth)` login/registro · `src/app/(app)` app autenticada · `src/app/portal` portal del cliente · `src/app/api` rutas de servidor.
- `src/components/ui` primitivas · `src/components/shell` layout, Cmd+K, panel IA.
- `src/lib/supabase` clientes · `src/lib/ai` RAG y prompts · `src/lib/data` consultas.
- `supabase/migrations` esquema + RLS · `supabase/seed.sql` datos demo.
