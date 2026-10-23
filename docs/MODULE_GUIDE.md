# Guía para construir un módulo

Lee antes: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `src/lib/db/types.ts`, `supabase/migrations/0001_schema.sql`.
Next.js 16 (App Router): `middleware` se llama `proxy`; `params`/`searchParams` son **Promesas** (`await`). Dudas → `node_modules/next/dist/docs/`.

## Reglas duras
1. **Usuarios de 50+**: texto base 18 px, botones/áreas táctiles ≥ 44 px (usa `Button`, `Input`, etc.), etiquetas con texto (nunca solo ícono), lenguaje simple en español de Bolivia. **Una acción primaria (`variant="primary"`) por pantalla.**
2. **Colores solo con tokens** (`bg-surface`, `text-ink-2`, `border-line`, `text-accent`, `bg-accent-soft`, `text-danger`, `bg-sand`, …). Prohibido hex sueltos y cualquier color fosforescente/saturado. Estados con `<Pill tone=…>`.
3. **Sin sombras** en tarjetas; usa `<Card>`. Sin degradados.
4. **Acciones destructivas**: soft delete (`deleted_at`) o confirmación clara + `toastWithUndo()` ("Deshacer", 8 s). Mover/archivar también deshace.
5. **Estados vacíos** con `<EmptyState>` (título + frase + un botón).
6. **Campos de texto largos** → `<TextWithDictation>` (botón "Dictar").
7. **Movimiento**: ≤ 250 ms, solo transform/opacity, clases `.enter`, `.press`, `.fade-in`; en Framer Motion usa `transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}` y respeta `useReducedMotion()`.
8. **Atajos opcionales**: todo debe poder hacerse con clics.
9. Las páginas que se abren desde Cmd+K aceptan `?nuevo=1` para abrir directamente el diálogo de creación.
10. **Datos**: siempre con `requireStaff()` (`@/lib/auth`) que da `{ supabase, profile, firm }`. `supabase` es el cliente del usuario → RLS aplica. **Nunca** uses `createAdminClient` en módulos de usuario. No pases `firm_id` al insertar (tiene default `current_firm_id()`).
11. **Server Actions** (`actions.ts` con `"use server"`) validan con `zod`, devuelven `{ ok: true } | { ok: false, error: string }` y llaman `revalidatePath`.
12. Interactividad (drag-and-drop, diálogos, formularios con estado) en componentes `"use client"`; páginas en Server Components.
13. Textos de interfaz en español, fechas con `@/lib/format` (`fmtDate`, `fmtDateTime`, `fmtMoney`, `MATTERS`, `STAGES`).
14. Datos de ejemplo siempre ficticios.

## Componentes disponibles
`@/components/ui/`: `button` (Button: primary|secondary|outline|ghost|danger), `field` (Input, Textarea, Select, Field), `card` (Card, PageHeader, Pill), `dialog` (Dialog, DialogTrigger, DialogContent, DialogClose), `tabs`, `empty-state`, `undo-toast` (toastWithUndo, ok, fail), `text-with-dictation`.
Shell: `@/components/shell/*` (NO modificar `app-shell.tsx`, `nav.ts`, `command-palette.tsx`: son del núcleo).

## Dueños de archivos (no tocar archivos ajenos)
Cada módulo es dueño solo de su carpeta bajo `src/app/(app)/<modulo>/`, `src/components/<modulo>/`, `src/lib/<modulo>/` y sus tests `tests/<modulo>/`. Si necesitas cambiar el esquema SQL, **no edites 0001**: crea `supabase/migrations/00NN_<tema>.sql` (número asignado en tu encargo) y ejecútalo en los tests con `tests/db/harness.ts` (`createDb()` aplica todas las migraciones en PGlite).

## Verificación (NO ejecutes `next build` ni `next dev`: otros agentes trabajan en paralelo)
- `npx tsc --noEmit` (ignora errores en archivos de otros módulos que aún se estén escribiendo)
- `npx eslint src/app/(app)/<modulo> src/components/<modulo> src/lib/<modulo>`
- `npx vitest run tests/<modulo>` para lógica pura (sin DOM) y SQL.
No hagas commit: el coordinador integra y hace commit.

## Entrega
Termina con un resumen corto: qué quedó hecho, rutas creadas, qué falta, decisiones tomadas (el coordinador las anotará en DECISIONS.md).
