# DESIGN — Counsel

Fuente de verdad: `refero.md` (Notion = pantallas de trabajo; Lusion = momentos de marca).
Regla 0 del .md: **no usar colores fosforescentes.** Esto descarta Acid Lime (#c1ff00) y vuelve opcionales/atenuados los acentos saturados de Notion (Marigold, Coral, Vermillion). Prioridad de diseño: 1) usabilidad 50+, 2) este documento, 3) las skills.

## Dónde se usa cada referencia
| Superficie | Referencia |
|---|---|
| Dashboard, casos, agenda, tareas, documentos, facturación, ajustes | **Notion**: lienzo cálido, tarjetas blancas con borde fino, sin sombras, acentos sobrios |
| Login, bienvenida, estados vacíos, transiciones grandes, portal del cliente (portada) | **Lusion**: lienzo lavanda frío, botones píldora, radios generosos, mucho aire |

## Color (tokens semánticos; ver `src/app/globals.css`)
Base neutra + **un solo acento** (azul Notion, ligeramente oscurecido para contraste AA con texto blanco).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--canvas` | #f6f5f4 | #161615 | Fondo de pantallas de trabajo |
| `--canvas-brand` | #f0f1fa | #14151c | Fondo de momentos de marca (Lusion) |
| `--surface` | #ffffff | #1f1f1d | Tarjetas, paneles |
| `--surface-2` | #efeeec | #292927 | Filas hover, fondos sutiles |
| `--ink` | #111111 | #f3f2f0 | Texto principal |
| `--ink-2` | #4d4a47 | #c4c1bc | Texto secundario (≥ 7:1 sobre canvas) |
| `--ink-3` | #6b6763 | #9d9993 | Ayudas (≥ 4.5:1) |
| `--line` | rgba(0,0,0,.10) | rgba(255,255,255,.12) | Bordes finos 1px |
| `--accent` | #0a64c8 | #6bb2f2 | Única acción principal por pantalla, foco, enlaces |
| `--accent-soft` | #e6f3fe | #1d2c3d | Botón secundario / fondo tenue |
| `--danger` | #a8321f | #f08b78 | Eliminar, error |
| `--ok` | #2f6b3c | #86c995 | Éxito |
| `--warn` | #8a5a00 | #e3b45a | Plazo próximo |

Estados (píldoras): fondo = tinte suave (12 % del color) + texto del color oscuro. **Nada saturado ni neón.** Acentos decorativos permitidos solo en tono apagado (arena #e9dcc3, salvia #cfe0d0, terracota apagada #e8cdc4, cielo #d7e6f5).

## Tipografía
- Sans: **Inter** (sustituto de NotionInter/Aeonik). Pesos 400, 500, 600 (máximo 600 en trabajo).
- Serif: **Source Serif 4** solo para documentos legales y subtítulos editoriales (Lyon Text → sustituto).
- **Base 18 px** (mínimo absoluto 16 px). Selector de tamaño: normal 18 / grande 20 / muy grande 22 (escala `rem` sobre `html`).
- Escala (a base 18 px): caption 14 · body-sm 16 · body 18 · subheading 20 · heading-sm 24 · heading 32 · heading-lg 40 · display 56 (solo marca).
- Tracking: normal en cuerpo; -0.01em a partir de heading; -0.02em en display (Lusion).
- Interlineado: 1.5 cuerpo, 1.2 títulos.

## Espaciado y forma
- Unidad 4 px. Escala: 4, 8, 12, 16, 20, 24, 32, 48, 64, 80.
- Densidad: *cómoda* (por defecto) y *compacta* (reduce `--density` a 0.85 en padding vertical de filas y tarjetas; nunca baja de 44 px los objetivos táctiles).
- Radios — trabajo (Notion): tarjetas 12, botones 8, píldoras 9999, detalles 4. Marca (Lusion): botones 9999, contenedores 24–32, campos 18.
- Bordes 1px `--line`; **sin sombras** en tarjetas (solo menú flotante/paneles: sombra 4 % tipo "susurro").
- Sin degradados ni glassmorphism.
- Área táctil mínima **44 × 44 px**; botones estándar 48 px de alto.

## Componentes clave
- **Botón primario**: fondo `--accent`, texto blanco, 48 px alto, radio 8. Solo uno por pantalla. Secundario: `--accent-soft`/texto accent. Terciario: texto. Peligro: borde + texto danger.
- **Campos**: 48 px alto, borde `--line`, foco con anillo `--accent` 2 px (visible siempre). Botón de dictado a la derecha en campos de texto.
- **Tarjeta de caso (Kanban)**: blanca, radio 8–12, borde fino, título 18 px, cliente en `--ink-2`, píldora de próximo plazo.
- **Píldora de estado**: texto + punto; nunca solo color.
- **Navegación**: barra lateral con ícono + texto siempre; en móvil, barra inferior con 5 destinos con texto.
- **Panel de IA**: lateral derecho (cajón en móvil), aviso permanente "No reemplaza la verificación oficial en la Gaceta Oficial de Bolivia" y bloque "Qué se envía a la IA".
- **Estados vacíos** (momento de marca): ilustración geométrica mínima en tonos apagados, título, una frase, un botón.
- **Deshacer**: toast inferior 8 s con botón "Deshacer" tras archivar/eliminar/mover.

## Movimiento (principios de Emil Kowalski)
- Duración 120–220 ms (interacciones) y ≤ 250 ms (transiciones grandes). Nunca > 250 ms.
- Easing: `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out fuerte) para entrar; `cubic-bezier(0.77, 0, 0.175, 1)` para movimiento en pantalla. Nunca `ease-in` en UI. Nunca animar desde `scale(0)`; partir de 0.96 + opacidad.
- Solo `transform` y `opacity`. Botones: `:active { scale .97 }`.
- Sin animación en acciones repetidas (atajos, Cmd+K abre casi instantáneo).
- `prefers-reduced-motion`: se mantienen opacidad/color, se eliminan desplazamientos y escalas.
- Lusion: solo en login/bienvenida/vacíos, escenas suaves; Notion: 200 ms ease.

## Accesibilidad
Contraste AA mínimo (AAA para texto de cuerpo). Foco visible. Etiquetas con texto en todos los controles. Formularios con errores en texto claro y `aria-live`. Soporte teclado completo; atajos opcionales.

## Preferencias por usuario (guardadas en `profiles.preferences`)
`theme` (claro/oscuro/sistema), `fontSize` (normal/grande/muy-grande), `density` (comoda/compacta).
