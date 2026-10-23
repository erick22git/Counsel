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

## Decisiones de los módulos (Sprints 1–2, reportadas por los agentes)
- Casos/Kanban: `position` = punto medio entre vecinos; nuevos casos al final (máx+1000). Mover etapa registra `case_event` "etapa" y tiene Deshacer. Cada tarjeta tiene "Arrastrar" y menú "Mover a…" (accesible, sin depender del arrastre). `needsRebalance/rebalance` existen y están testeados pero nadie los llama aún.
- Archivar cliente/caso = soft delete (`deleted_at`). Notas de línea de tiempo: título "Nota", texto en `body`.
- Agenda: fechas como claves "YYYY-MM-DD" en La Paz con UTC-4 fijo (Bolivia no tiene horario de verano), sin librerías de zona horaria. "Eliminar" una cita = estado `cancelada`. "Plazo próximo" = plazo programado en ≤ 3 días. "Mostrar al cliente" exige caso.
- Tareas: la barra rápida asigna a quien la crea; hechas se cargan solo de los últimos 30 días.
- Documentos: el navegador sube a Storage y luego una server action crea el registro (si falla, se borra el archivo). Restaurar versión crea versión nueva apuntando al mismo archivo. Cambiar de caso no mueve el archivo en Storage. Compartir con cliente exige caso.
- Editor: Tiptap v3 con extensión propia `VarMark` para variables `<mark class="var">`. Autoguardado solo actualiza `content_html`; "Guardar versión" suma versión. 32 plantillas globales (migración 0003) sin artículos ni leyes citadas, todas con nota "Modelo referencial".
- Cobros: "cuentas de cobro" internas, **no** facturación fiscal (SIAT). Dinero en centavos enteros. Número F-0001 por despacho con reintento ante colisión. "Vencida" es estado derivado. Anular libera horas facturadas (con Deshacer). Timer en localStorage.
- Panel: "Por cobrar" suma solo facturas `enviada`. Tareas sin fecha no salen en el panel.
- IA: modelo por defecto `claude-opus-5-5` (configurable con `ANTHROPIC_MODEL`, p. ej. `claude-sonnet-5-5` para ahorrar). Sin fuentes en la base **no se llama al modelo** (garantía anti-invención). Límite de 150 consultas/día/usuario. "Chat con el caso" oculta datos personales del cliente por defecto y muestra qué se envía.
- Portal: invitación por correo con service-role acotada (`src/lib/portal/invite.ts`); migración 0006 da al cliente lectura de ítems/pagos de sus facturas enviadas/pagadas.
- Términos y privacidad: borradores con aviso "revisión legal pendiente"; aceptación versionada (`TERMS_VERSION`) con IP y navegador; si cambia la versión se bloquea con un diálogo hasta aceptar.
- Los commits por sprint se hicieron al final agrupando archivos por módulo (los agentes trabajaron en paralelo en la misma carpeta); solo el estado final (`sprint-4`) se verificó con build completo; los tags intermedios son hitos lógicos.
- Nada se probó en navegador ni contra un Supabase real (ver README, "Qué falta").
