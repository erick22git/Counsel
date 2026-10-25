# Guía Sprints 5–6 (agentes en paralelo)

Lee: `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `docs/MODULE_GUIDE.md` (reglas de UI/UX, tokens, español simple), `docs/SECURITY.md`, `src/lib/db/types.ts`, `supabase/migrations/*.sql`.

## Reglas
- Trabajamos varios agentes a la vez en la MISMA carpeta. Edita solo lo que te asignaron. Si necesitas tocar un archivo ajeno, hazlo mínimo y dilo en el reporte.
- **No ejecutes** `npm install`, `next build`, `next dev` ni `git commit`. Solo: `npx tsc --noEmit` (ignora errores en archivos ajenos a medias), `npx eslint <tus rutas>`, `npx vitest run <tus tests>`. Dependencias ya instaladas: `@playwright/test`, vitest, pglite, zod, etc. Si necesitas otra, no la instales: impleméntalo sin ella y avísalo.
- **Secretos**: nunca imprimas, hardcodees ni commitees claves. Todo por variables de entorno. Si agregas una variable, anótala en tu reporte (el coordinador actualiza `.env.example`). Si algo requiere una clave que no existe, impleméntalo con mock/degradación clara y márcalo **"BLOQUEADO: requiere X"** en tu reporte.
- **Migraciones**: nunca edites 0001–0006. Usa solo el número que te asignen: `supabase/migrations/00NN_tema.sql`. Deben ser idempotentes cuando sea posible, y probarse con `tests/db/harness.ts` (`createDb()` aplica todas las migraciones en PGlite; ya simula `auth.uid()`; los roles `authenticated`/`anon`).
- Todo multi-tenant con RLS (`firm_id = current_firm_id()`); roles: `owner` (titular), `lawyer` (abogado), `assistant` (asistente), `client` (portal). Helpers existentes: `current_firm_id()`, `current_user_role()`, `is_staff()`, `current_client_id()`.
- Datos de ejemplo siempre ficticios.
- Termina con un reporte corto: qué hiciste, rutas/archivos, tests, variables de entorno nuevas, lo BLOQUEADO, decisiones para DECISIONS.md.
