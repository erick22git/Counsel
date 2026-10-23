REGLA PARA TODO EL DISEÑO DONDE HAY COLORES FOSFORECENTES NO LOS USES 
# Notion — Style Reference
> warm paper notebook under afternoon sun

**Theme:** light

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

Notion reads like a well-loved paper notebook under afternoon light: a warm off-white canvas (#f6f5f4) that feels tactile rather than clinical, generous sans typography that gives editorial weight to product copy, and color used as sparse punctuation — peachy pills highlight verbs, a single blue anchors the primary action, and a rotating cast of accent hues (coral, amber, sky, midnight) paints the feature card backgrounds like sticky notes. Cards sit on the canvas with 1px hairline borders and 12px corners — no shadows, no chrome — like ruled sections in a Moleskine. Motion is playful and springy, with 200ms ease transitions and bouncy character-mark animations that make the interface feel alive without ever being decorative.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Notion Blue | `#0075de` | `--color-notion-blue` | Primary CTA fill, active nav accent, filled action buttons — the single chromatic commitment in a near-monochrome system, saturated enough to read as a switch |
| Paper Warmth | `#f6f5f4` | `--color-paper-warmth` | Page canvas, hero background, section backgrounds — warm off-white gives the system its tactile analog feel |
| Pure White | `#ffffff` | `--color-pure-white` | Card surfaces, elevated panels, logo-wall background, contrast text on dark cards |
| Ink Black | `#000000` | `--color-ink-black` | Primary text, nav links, headings — deployed at varying alpha (100%, 95%, 90%, 60%, 40%, 20%) to build hierarchy without adding new colors |
| Charcoal | `#111111` | `--color-charcoal` | Dark text variant for specific UI moments where pure black would feel too harsh |
| Stone | `#757575` | `--color-stone` | Secondary nav text, muted helper text, deactivated button labels — the 60% alpha of ink |
| Graphite | `#615d59` | `--color-graphite` | Body text with warm cast — the brown-tinted gray that harmonizes with the warm canvas |
| Slate | `#696969` | `--color-slate` | Card body text, secondary content within cards — slightly lighter than Stone |
| Sky Tint | `#e6f3fe` | `--color-sky-tint` | Ghost CTA background, soft blue wash for secondary actions, tinted hover states |
| Marigold | `#ffb110` | `--color-marigold` | Hero pill highlights, Agent feature card background, warm accent for callouts — the first color the eye finds |
| Coral | `#f64932` | `--color-coral` | Decorative card backgrounds, hero pill alternates, warm-to-hot accent in the rotating cast |
| Saffron | `#e89d01` | `--color-saffron` | Body-section accent panels, secondary warm yellow for background washes |
| Vermillion | `#e32d14` | `--color-vermillion` | Deep coral for saturated body-section backgrounds, signal-warm accent |
| Mocha | `#b18164` | `--color-mocha` | Warm brown accent for body-section panels — the earthy member of the accent cast |
| Signal Blue | `#097fe8` | `--color-signal-blue` | Decorative card backgrounds, hero decorative highlights, secondary blue for visual variety |
| Sky Wash | `#62aef0` | `--color-sky-wash` | Lightest blue in the cast — decorative backgrounds, heading accent highlights, airy washes |
| Midnight Ink | `#02093a` | `--color-midnight-ink` | Violet wash for highlight backgrounds, decorative bands, and soft emphasis behind content. |

## Tokens — Typography

### NotionInter — Primary sans-serif — geometric humanist with slight quirks, deployed at 400 for body, 500 for nav/UI, 600-700 for display headings. The type-scale uses aggressive negative letter-spacing at large sizes (-4.6px at 96px, -2px at 72px) that tightens the headline to feel confident and compact rather than airy. · `--font-notioninter`
- **Substitute:** Inter
- **Weights:** 400, 500, 600, 700
- **Sizes:** 12px, 14px, 16px, 20px, 22px, 24px, 40px, 42px, 48px, 54px, 72px, 96px
- **Line height:** 0.83, 1.00, 1.04, 1.14, 1.21, 1.27, 1.33, 1.40, 1.43, 1.50
- **Letter spacing:** -0.048em at 96px, -0.036em at 42px, -0.035em at 54px, -0.028em at 72px, -0.011em at 22px, +0.01em at 12px, normal at body sizes
- **OpenType features:** `"lnum", "locl" 0`
- **Role:** Primary sans-serif — geometric humanist with slight quirks, deployed at 400 for body, 500 for nav/UI, 600-700 for display headings. The type-scale uses aggressive negative letter-spacing at large sizes (-4.6px at 96px, -2px at 72px) that tightens the headline to feel confident and compact rather than airy.

### Lyon Text — Editorial serif reserved for specific body-text moments and section intros — used sparingly (4 instances) to give voice a literary weight, like a pull-quote in a magazine layout. Functions as a system accent, not a parallel hierarchy. · `--font-lyon-text`
- **Substitute:** Source Serif Pro
- **Weights:** 400
- **Sizes:** 18px, 32px
- **Line height:** 1.25, 1.56
- **Role:** Editorial serif reserved for specific body-text moments and section intros — used sparingly (4 instances) to give voice a literary weight, like a pull-quote in a magazine layout. Functions as a system accent, not a parallel hierarchy.

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| caption | — | — | 12px | 1.33 | 0.12px | `--text-caption` |
| body-sm | — | — | 14px | 1.43 | — | `--text-body-sm` |
| body | — | — | 16px | 1.5 | — | `--text-body` |
| subheading | — | — | 20px | 1 | — | `--text-subheading` |
| heading-sm | — | — | 22px | 1.27 | -0.242px | `--text-heading-sm` |
| heading | — | — | 40px | 1.5 | — | `--text-heading` |
| heading-lg | — | — | 48px | 1.5 | — | `--text-heading-lg` |
| display-sm | — | — | 54px | 1.04 | -1.89px | `--text-display-sm` |
| display | — | — | 72px | 1.21 | -2.016px | `--text-display` |
| display-lg | — | — | 96px | 1.04 | -4.608px | `--text-display-lg` |

## Tokens — Spacing & Shapes

**Base unit:** 4px

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 28 | 28px | `--spacing-28` |
| 32 | 32px | `--spacing-32` |
| 36 | 36px | `--spacing-36` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |

### Border Radius

| Element | Value |
|---------|-------|
| cards | 12px |
| pills | 9999px |
| small | 4px |
| buttons | 8px |

### Layout

- **Page max-width:** 1440px
- **Section gap:** 80px
- **Card padding:** 24px
- **Element gap:** 8px

## Components

### Primary CTA Button
**Role:** Filled blue action button for the main conversion goal

Background #0075de, text #ffffff at 14px NotionInter weight 500, border-radius 8px, padding 6px 15px. The only chromatic filled button in the system — every other action defers to ghost or text styles.

### Ghost CTA Button
**Role:** Secondary action with a subtle blue tint

Background #e6f3fe (sky tint), text #0075de at 14px weight 500, border-radius 8px, padding 6px 15px. Pairs beside the primary CTA as the lower-commitment alternative.

### Ghost Text Button
**Role:** Minimal action button with no fill or border

Background transparent, text #000000 at 95% alpha, border-radius 8px, padding 6px 15px. The default for tertiary actions in the hero and feature cards.

### Outlined Text Button
**Role:** Bordered button with no fill for mid-priority actions

Background transparent, text #000000 at 90% alpha, 1px border at same color, border-radius 4px, padding 5px 10px. Used for compact inline actions like view-all links.

### Muted Nav Link
**Role:** Low-emphasis navigation item

Background transparent, text #000000 at 54% alpha, border-radius 8px, padding 12px 16px. The default nav-item state — text darkens to full alpha on hover, never gets an underline.

### Pill Tag
**Role:** Category label or status indicator

Background colored fill (varies), text #000000 or #ffffff, border-radius 9999px, padding 4px 12px. Used for status labels like 'In progress', 'To do', 'Complete' in product mockups.

### White Feature Card
**Role:** Standard content card on warm canvas

Background #ffffff, border-radius 12px, padding 24px, 1px solid border at rgba(0,0,0,0.08), no shadow. The default card — sits on the warm canvas like a sticky note.

### Accent Feature Card
**Role:** Full-bleed colored card for feature blocks

Background one of the accent hues (#ffb110, #f64932, #62aef0, #e6f3fe, etc.), border-radius 12px, padding 24px, no border. Functions as a colored panel that paints the canvas — text inside uses #000000 or #ffffff depending on contrast.

### Dark Feature Card
**Role:** Inverted card for dark-on-light contrast moments

Background #02093a (midnight), text #ffffff, border-radius 12px, padding 24px. The system uses this sparingly as a 'dark mode island' on the light page — not as a full dark theme.

### Hero Highlight Pill
**Role:** Colored pill placed behind a verb in hero copy

Background accent color (peach #f6d5b8, yellow #ffb110, or coral #f64932), text #000000, border-radius 9999px, padding 8px 24px. The signature typographic device — wraps a single word in a sentence to draw the eye and give it weight.

### Avatar Character Mark
**Role:** Decorative illustrated character in a circle

40-48px circle with 2px colored border (blue, red, yellow), flat illustration inside, white background. Used in hero arrangements and scattered as decorative marks with squiggle/sparkle companions.

### Kanban Task Card
**Role:** Product UI task item in the embedded product mockup

Background #ffffff, border-radius 8px, padding 8px 12px, 1px border at rgba(0,0,0,0.08), small status text and emoji. Replicates the real Notion task card aesthetic inside the marketing screenshot.

### Section Header
**Role:** Large heading that opens a new content section

NotionInter weight 500-700, 48-54px, line-height 1.04-1.5, letter-spacing -1.89 to -2.016px. Color #000000. Followed by an optional Lyon Text subhead at 18px for editorial voice.

### Logo Wall Item
**Role:** Greyscale partner/client logo

SVG logo at native proportions, color desaturated to near-black (#000000 at 60% alpha), no individual borders or backgrounds. Centered grid layout with generous spacing — logos are treated as typography, not imagery.

## Do's and Don'ts

### Do
- Use #f6f5f4 as the page canvas and #ffffff for card surfaces — never invert this hierarchy by putting a warm card on a white page
- Reserve #0075de for the single primary action per screen; all secondary actions should use ghost (#e6f3fe bg) or text styles
- Apply negative letter-spacing to all display sizes: -4.6px at 96px, -2px at 72px, -1.9px at 54px — body text stays at normal tracking
- Use 1px solid borders at rgba(0,0,0,0.08) instead of shadows to separate cards from the canvas
- Use 12px border-radius for cards and 8px for buttons; reserve 9999px for pills and hero highlight pills only
- Paint feature-block backgrounds with accent hues (#ffb110, #f64932, #62aef0, #02093a) rather than adding borders or shadows to create visual variety
- Keep motion at 200ms with ease timing for hovers and transitions; reserve spring/bounce animations for character marks and hero elements

### Don't
- Do not use pure #ffffff as the page background — the warm #f6f5f4 canvas is the system's signature warmth
- Do not add shadows to content cards — the system uses hairline borders only, shadows appear only on the product UI mockup and nav bar
- Do not use multiple chromatic button colors in the same view — #0075de is the only filled button; color variety belongs in card backgrounds
- Do not use #000000 at 100% for all text — build hierarchy through alpha (100%, 95%, 60%, 40%) on the same color
- Do not use Lyon Text for UI labels or navigation — it is reserved for editorial body copy moments at 18px
- Do not apply border-radius larger than 12px to rectangular content — pills (9999px) and cards (12px) are the two shapes
- Do not use gradients — the system is strictly flat fills; visual depth comes from the warm-to-white surface contrast and accent card backgrounds

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Page Canvas | `#f6f5f4` | Warm off-white base for the entire page — the analog-paper feel starts here |
| 1 | Card Surface | `#ffffff` | White cards on warm canvas — pure white is reserved for surfaces that need to read as 'on top of the page' |
| 2 | Accent Card Surface | `#ffb110` | Colored card backgrounds (yellow, coral, blue, midnight) — feature blocks paint the canvas with single-hue fills |
| 3 | Dark Card Surface | `#02093a` | Deep navy panels for dark-mode-style feature blocks — inverting the surface stack with white text on midnight |

## Elevation

- **Nav (sticky):** `0px 0.7px 1.462px 0px rgb(0% 0% 0%/0.015), 0px 3px 9px 0px rgb(0% 0% 0%/0.03)`
- **Product UI Mockup:** `0px 4px 12px rgba(0, 0, 0, 0.1)`

## Imagery

Illustration-first, photography-free. The visual language is built from flat illustrated character marks (round faces in 2px colored circles), abstract decorative elements (hand-drawn squiggles, sparkles, arrows, flower shapes), and product UI mockups. Character marks appear in the hero as a horizontal row of 7 avatars and scatter across the page as playful punctuation. Product screenshots are the only 'real' visuals — they show the actual Notion interface (kanban boards, document views, AI agent panels) with full chrome and real data. The product mockup in the hero is large, centered, and casts a single drop-shadow to separate it from the canvas. There are no lifestyle photos, no stock imagery, no abstract 3D renders.

## Layout

Centered, max-width contained at ~1440px. The hero is a centered stack: character-mark row → large two-line headline with an embedded colored pill → subhead → two-button CTA row → large product UI mockup. Below the hero, sections alternate between white-card grids and full-bleed colored accent panels. The logo wall is a centered single-row grid of greyscale partner logos. Feature blocks use a 2-column layout (text left, colored panel right) that alternates left-right between sections. The 'Ask your on-demand assistants' section uses a 2×2 card grid where the top card is full-width and the bottom row splits into two equal columns. Section gaps are generous (~80px) creating a calm vertical rhythm. Navigation is a fixed top bar at 64px height with centered nav items and right-aligned action buttons.

## Agent Prompt Guide

## Quick Color Reference
- text: #000000 (build hierarchy through alpha: 100% / 95% / 60% / 40%)
- background: #f6f5f4 (warm off-white canvas)
- card surface: #ffffff
- border: rgba(0, 0, 0, 0.08)
- primary action: #0075de (filled action)
- accent: #ffb110, #f64932, #62aef0, #02093a (rotate through these for card backgrounds)

## Example Component Prompts

1. **Hero headline with highlight pill**: Render a centered hero on #f6f5f4. Headline: 'Where teams and agents Create together.' at 72px NotionInter weight 500, #000000, line-height 1.21, letter-spacing -2.016px. Wrap the word 'Create' in a pill: background #f6d5b8, text #000000, border-radius 9999px, padding 8px 24px, inline within the sentence. Subhead below at 18px Lyon Text weight 400, #615d59, line-height 1.56.

2. **White feature card**: Create a card on the warm canvas. Background #ffffff, border-radius 12px, padding 24px, 1px solid border rgba(0,0,0,0.08). No shadow. Title at 22px NotionInter weight 700, #000000, letter-spacing -0.242px. Body at 16px weight 400, #615d59, line-height 1.5.

3. **Accent feature block**: Create a full-bleed colored panel. Background #ffb110, border-radius 12px, padding 24px. Title at 40px NotionInter weight 400, #000000, line-height 1.5. A product UI screenshot sits inside with a drop-shadow at 0px 4px 12px rgba(0,0,0,0.1) to create depth against the colored background.

4. Create a Primary Action Button: #0075de background, #ffffff text, 9999px radius, compact pill padding. Use this filled treatment for the main CTA.

5. **Kanban task card (product mockup)**: Create a task card inside a product screenshot. Background #ffffff, border-radius 8px, padding 8px 12px, 1px solid border rgba(0,0,0,0.08). Task text at 14px NotionInter weight 500, #000000. Optional status pill above: background colored fill, text #ffffff, border-radius 9999px, padding 2px 8px, font 12px.

## Decorative Marks System

Character marks (round illustrated faces in 2px colored circles) and abstract decorative elements (squiggles, sparkles, arrows, flower shapes) are deployed as visual punctuation, not as illustrations with content. They cluster around hero copy, scatter near feature cards, and animate on scroll. Colors for the circle borders rotate through the accent palette: #097fe8 (blue), #f64932 (coral), #ffb110 (yellow), #62aef0 (sky). The marks are 40-48px circles with flat color illustrations inside, always on white fills. They never carry information or link to content — they exist purely to make the interface feel alive and handcrafted.

## Similar Brands

- **Linear** — Same monochrome-light approach with a single accent color, hairline-border cards, generous display typography with negative tracking, and zero shadows on content surfaces
- **Stripe** — Same editorial use of serif+sans pairing, large display headlines with tight letter-spacing, and color reserved for functional emphasis rather than decoration
- **Figma** — Same playful illustrated character marks as decorative punctuation, warm light canvas, and rotating accent hues for section variety
- **Craft Docs** — Same paper-warm aesthetic with off-white canvas, restrained color palette, and a focus on the document-as-surface metaphor

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-notion-blue: #0075de;
  --color-paper-warmth: #f6f5f4;
  --color-pure-white: #ffffff;
  --color-ink-black: #000000;
  --color-charcoal: #111111;
  --color-stone: #757575;
  --color-graphite: #615d59;
  --color-slate: #696969;
  --color-sky-tint: #e6f3fe;
  --color-marigold: #ffb110;
  --color-coral: #f64932;
  --color-saffron: #e89d01;
  --color-vermillion: #e32d14;
  --color-mocha: #b18164;
  --color-signal-blue: #097fe8;
  --color-sky-wash: #62aef0;
  --color-midnight-ink: #02093a;

  /* Typography — Font Families */
  --font-notioninter: 'NotionInter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-lyon-text: 'Lyon Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --tracking-caption: 0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 22px;
  --leading-heading-sm: 1.27;
  --tracking-heading-sm: -0.242px;
  --text-heading: 40px;
  --leading-heading: 1.5;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1.5;
  --text-display-sm: 54px;
  --leading-display-sm: 1.04;
  --tracking-display-sm: -1.89px;
  --text-display: 72px;
  --leading-display: 1.21;
  --tracking-display: -2.016px;
  --text-display-lg: 96px;
  --leading-display-lg: 1.04;
  --tracking-display-lg: -4.608px;

  /* Typography — Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Layout */
  --page-max-width: 1440px;
  --section-gap: 80px;
  --card-padding: 24px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-cards: 12px;
  --radius-pills: 9999px;
  --radius-small: 4px;
  --radius-buttons: 8px;

  /* Surfaces */
  --surface-page-canvas: #f6f5f4;
  --surface-card-surface: #ffffff;
  --surface-accent-card-surface: #ffb110;
  --surface-dark-card-surface: #02093a;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-notion-blue: #0075de;
  --color-paper-warmth: #f6f5f4;
  --color-pure-white: #ffffff;
  --color-ink-black: #000000;
  --color-charcoal: #111111;
  --color-stone: #757575;
  --color-graphite: #615d59;
  --color-slate: #696969;
  --color-sky-tint: #e6f3fe;
  --color-marigold: #ffb110;
  --color-coral: #f64932;
  --color-saffron: #e89d01;
  --color-vermillion: #e32d14;
  --color-mocha: #b18164;
  --color-signal-blue: #097fe8;
  --color-sky-wash: #62aef0;
  --color-midnight-ink: #02093a;

  /* Typography */
  --font-notioninter: 'NotionInter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-lyon-text: 'Lyon Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --tracking-caption: 0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 22px;
  --leading-heading-sm: 1.27;
  --tracking-heading-sm: -0.242px;
  --text-heading: 40px;
  --leading-heading: 1.5;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1.5;
  --text-display-sm: 54px;
  --leading-display-sm: 1.04;
  --tracking-display-sm: -1.89px;
  --text-display: 72px;
  --leading-display: 1.21;
  --tracking-display: -2.016px;
  --text-display-lg: 96px;
  --leading-display-lg: 1.04;
  --tracking-display-lg: -4.608px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```
@theme {
  /* Colors */
  --color-notion-blue: #0075de;
  --color-paper-warmth: #f6f5f4;
  --color-pure-white: #ffffff;
  --color-ink-black: #000000;
  --color-charcoal: #111111;
  --color-stone: #757575;
  --color-graphite: #615d59;
  --color-slate: #696969;
  --color-sky-tint: #e6f3fe;
  --color-marigold: #ffb110;
  --color-coral: #f64932;
  --color-saffron: #e89d01;
  --color-vermillion: #e32d14;
  --color-mocha: #b18164;
  --color-signal-blue: #097fe8;
  --color-sky-wash: #62aef0;
  --color-midnight-ink: #02093a;

  /* Typography */
  --font-notioninter: 'NotionInter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-lyon-text: 'Lyon Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --tracking-caption: 0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 22px;
  --leading-heading-sm: 1.27;
  --tracking-heading-sm: -0.242px;
  --text-heading: 40px;
  --leading-heading: 1.5;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1.5;
  --text-display-sm: 54px;
  --leading-display-sm: 1.04;
  --tracking-display-sm: -1.89px;
  --text-display: 72px;
  --leading-display: 1.21;
  --tracking-display: -2.016px;
  --text-display-lg: 96px;
  --leading-display-lg: 1.04;
  --tracking-display-lg: -4.608px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
:root {
  /* Colors */
  --color-notion-blue: #0075de;
  --color-paper-warmth: #f6f5f4;
  --color-pure-white: #ffffff;
  --color-ink-black: #000000;
  --color-charcoal: #111111;
  --color-stone: #757575;
  --color-graphite: #615d59;
  --color-slate: #696969;
  --color-sky-tint: #e6f3fe;
  --color-marigold: #ffb110;
  --color-coral: #f64932;
  --color-saffron: #e89d01;
  --color-vermillion: #e32d14;
  --color-mocha: #b18164;
  --color-signal-blue: #097fe8;
  --color-sky-wash: #62aef0;
  --color-midnight-ink: #02093a;

  /* Typography — Font Families */
  --font-notioninter: 'NotionInter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-lyon-text: 'Lyon Text', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.33;
  --tracking-caption: 0.12px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.43;
  --text-body: 16px;
  --leading-body: 1.5;
  --text-subheading: 20px;
  --leading-subheading: 1;
  --text-heading-sm: 22px;
  --leading-heading-sm: 1.27;
  --tracking-heading-sm: -0.242px;
  --text-heading: 40px;
  --leading-heading: 1.5;
  --text-heading-lg: 48px;
  --leading-heading-lg: 1.5;
  --text-display-sm: 54px;
  --leading-display-sm: 1.04;
  --tracking-display-sm: -1.89px;
  --text-display: 72px;
  --leading-display: 1.21;
  --tracking-display: -2.016px;
  --text-display-lg: 96px;
  --leading-display-lg: 1.04;
  --tracking-display-lg: -4.608px;

  /* Typography — Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-36: 36px;
  --spacing-64: 64px;
  --spacing-80: 80px;

  /* Layout */
  --page-max-width: 1440px;
  --section-gap: 80px;
  --card-padding: 24px;
  --element-gap: 8px;

  /* Border Radius */
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Named Radii */
  --radius-cards: 12px;
  --radius-pills: 9999px;
  --radius-small: 4px;
  --radius-buttons: 8px;

  /* Surfaces */
  --surface-page-canvas: #f6f5f4;
  --surface-card-surface: #ffffff;
  --surface-accent-card-surface: #ffb110;
  --surface-dark-card-surface: #02093a;
}
{
  "color": {
    "notion-blue": {
      "$value": "#0075de",
      "$type": "color",
      "$description": "Notion Blue — Primary CTA fill, active nav accent, filled action buttons — the single chromatic commitment in a near-monochrome system, saturated enough to read as a switch"
    },
    "paper-warmth": {
      "$value": "#f6f5f4",
      "$type": "color",
      "$description": "Paper Warmth — Page canvas, hero background, section backgrounds — warm off-white gives the system its tactile analog feel"
    },
    "pure-white": {
      "$value": "#ffffff",
      "$type": "color",
      "$description": "Pure White — Card surfaces, elevated panels, logo-wall background, contrast text on dark cards"
    },
    "ink-black": {
      "$value": "#000000",
      "$type": "color",
      "$description": "Ink Black — Primary text, nav links, headings — deployed at varying alpha (100%, 95%, 90%, 60%, 40%, 20%) to build hierarchy without adding new colors"
    },
    "charcoal": {
      "$value": "#111111",
      "$type": "color",
      "$description": "Charcoal — Dark text variant for specific UI moments where pure black would feel too harsh"
    },
    "stone": {
      "$value": "#757575",
      "$type": "color",
      "$description": "Stone — Secondary nav text, muted helper text, deactivated button labels — the 60% alpha of ink"
    },
    "graphite": {
      "$value": "#615d59",
      "$type": "color",
      "$description": "Graphite — Body text with warm cast — the brown-tinted gray that harmonizes with the warm canvas"
    },
    "slate": {
      "$value": "#696969",
      "$type": "color",
      "$description": "Slate — Card body text, secondary content within cards — slightly lighter than Stone"
    },
    "sky-tint": {
      "$value": "#e6f3fe",
      "$type": "color",
      "$description": "Sky Tint — Ghost CTA background, soft blue wash for secondary actions, tinted hover states"
    },
    "marigold": {
      "$value": "#ffb110",
      "$type": "color",
      "$description": "Marigold — Hero pill highlights, Agent feature card background, warm accent for callouts — the first color the eye finds"
    },
    "coral": {
      "$value": "#f64932",
      "$type": "color",
      "$description": "Coral — Decorative card backgrounds, hero pill alternates, warm-to-hot accent in the rotating cast"
    },
    "saffron": {
      "$value": "#e89d01",
      "$type": "color",
      "$description": "Saffron — Body-section accent panels, secondary warm yellow for background washes"
    },
    "vermillion": {
      "$value": "#e32d14",
      "$type": "color",
      "$description": "Vermillion — Deep coral for saturated body-section backgrounds, signal-warm accent"
    },
    "mocha": {
      "$value": "#b18164",
      "$type": "color",
      "$description": "Mocha — Warm brown accent for body-section panels — the earthy member of the accent cast"
    },
    "signal-blue": {
      "$value": "#097fe8",
      "$type": "color",
      "$description": "Signal Blue — Decorative card backgrounds, hero decorative highlights, secondary blue for visual variety"
    },
    "sky-wash": {
      "$value": "#62aef0",
      "$type": "color",
      "$description": "Sky Wash — Lightest blue in the cast — decorative backgrounds, heading accent highlights, airy washes"
    },
    "midnight-ink": {
      "$value": "#02093a",
      "$type": "color",
      "$description": "Midnight Ink — Violet wash for highlight backgrounds, decorative bands, and soft emphasis behind content."
    }
  },
  "font": {
    "notioninter": {
      "$value": "NotionInter",
      "$type": "fontFamily",
      "$description": "Primary sans-serif — geometric humanist with slight quirks, deployed at 400 for body, 500 for nav/UI, 600-700 for display headings. The type-scale uses aggressive negative letter-spacing at large sizes (-4.6px at 96px, -2px at 72px) that tightens the headline to feel confident and compact rather than airy."
    },
    "lyon-text": {
      "$value": "Lyon Text",
      "$type": "fontFamily",
      "$description": "Editorial serif reserved for specific body-text moments and section intros — used sparingly (4 instances) to give voice a literary weight, like a pull-quote in a magazine layout. Functions as a system accent, not a parallel hierarchy."
    }
  },
  "typography": {
    "xs": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "12px",
        "fontWeight": 500,
        "lineHeight": 1.33,
        "letterSpacing": "0.01em"
      },
      "$type": "typography",
      "$description": "Typography step xs at 12px"
    },
    "sm": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "14px",
        "fontWeight": 500,
        "lineHeight": 1.43,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm at 14px"
    },
    "sm-2": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.43,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-2 at 14px"
    },
    "sm-3": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "14px",
        "fontWeight": 600,
        "lineHeight": 1.43,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-3 at 14px"
    },
    "base": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step base at 16px"
    },
    "base-2": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "16px",
        "fontWeight": 500,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step base-2 at 16px"
    },
    "base-3": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "16px",
        "fontWeight": 700,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step base-3 at 16px"
    },
    "lg": {
      "$value": {
        "fontFamily": "Lyon Text",
        "fontSize": "18px",
        "fontWeight": 400,
        "lineHeight": 1.56,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step lg at 18px"
    },
    "xl": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "20px",
        "fontWeight": 400,
        "lineHeight": 1.4,
        "letterSpacing": "-0.006em"
      },
      "$type": "typography",
      "$description": "Typography step xl at 20px"
    },
    "xl-2": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "20px",
        "fontWeight": 600,
        "lineHeight": 1.4,
        "letterSpacing": "-0.006em"
      },
      "$type": "typography",
      "$description": "Typography step xl-2 at 20px"
    },
    "xl-3": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "20px",
        "fontWeight": 400,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step xl-3 at 20px"
    },
    "xl-4": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "20px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step xl-4 at 20px"
    },
    "xl-5": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "22px",
        "fontWeight": 700,
        "lineHeight": 1.27,
        "letterSpacing": "-0.011em"
      },
      "$type": "typography",
      "$description": "Typography step xl-5 at 22px"
    },
    "2xl": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "24px",
        "fontWeight": 500,
        "lineHeight": 0.83,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 2xl at 24px"
    },
    "3xl": {
      "$value": {
        "fontFamily": "Lyon Text",
        "fontSize": "32px",
        "fontWeight": 400,
        "lineHeight": 1.25,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 3xl at 32px"
    },
    "4xl": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "40px",
        "fontWeight": 400,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 4xl at 40px"
    },
    "4xl-2": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "42px",
        "fontWeight": 700,
        "lineHeight": 1.14,
        "letterSpacing": "-0.036em"
      },
      "$type": "typography",
      "$description": "Typography step 4xl-2 at 42px"
    },
    "5xl": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "48px",
        "fontWeight": 400,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl at 48px"
    },
    "5xl-2": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "54px",
        "fontWeight": 700,
        "lineHeight": 1.04,
        "letterSpacing": "-0.035em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-2 at 54px"
    },
    "5xl-3": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "72px",
        "fontWeight": 500,
        "lineHeight": 1.21,
        "letterSpacing": "-0.028em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-3 at 72px"
    },
    "5xl-4": {
      "$value": {
        "fontFamily": "NotionInter",
        "fontSize": "96px",
        "fontWeight": 600,
        "lineHeight": 1.04,
        "letterSpacing": "-0.048em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-4 at 96px"
    }
  },
  "spacing": {
    "4": {
      "$value": "4px",
      "$type": "dimension",
      "$description": "Spacing 4px"
    },
    "8": {
      "$value": "8px",
      "$type": "dimension",
      "$description": "Spacing 8px"
    },
    "12": {
      "$value": "12px",
      "$type": "dimension",
      "$description": "Spacing 12px"
    },
    "16": {
      "$value": "16px",
      "$type": "dimension",
      "$description": "Spacing 16px"
    },
    "20": {
      "$value": "20px",
      "$type": "dimension",
      "$description": "Spacing 20px"
    },
    "24": {
      "$value": "24px",
      "$type": "dimension",
      "$description": "Spacing 24px"
    },
    "28": {
      "$value": "28px",
      "$type": "dimension",
      "$description": "Spacing 28px"
    },
    "32": {
      "$value": "32px",
      "$type": "dimension",
      "$description": "Spacing 32px"
    },
    "36": {
      "$value": "36px",
      "$type": "dimension",
      "$description": "Spacing 36px"
    },
    "64": {
      "$value": "64px",
      "$type": "dimension",
      "$description": "Spacing 64px"
    },
    "80": {
      "$value": "80px",
      "$type": "dimension",
      "$description": "Spacing 80px"
    },
    "unit": {
      "$value": "4px",
      "$type": "dimension",
      "$description": "Base spacing unit"
    }
  },
  "radius": {
    "md": {
      "$value": "4px",
      "$type": "dimension",
      "$description": "Border radius md"
    },
    "lg": {
      "$value": "8px",
      "$type": "dimension",
      "$description": "Border radius lg"
    },
    "xl": {
      "$value": "12px",
      "$type": "dimension",
      "$description": "Border radius xl"
    },
    "full": {
      "$value": "9999px",
      "$type": "dimension",
      "$description": "Border radius full"
    }
  },
  "surface": {
    "page-canvas": {
      "$value": "#f6f5f4",
      "$type": "color",
      "$description": "Surface level 0: Warm off-white base for the entire page — the analog-paper feel starts here"
    },
    "card-surface": {
      "$value": "#ffffff",
      "$type": "color",
      "$description": "Surface level 1: White cards on warm canvas — pure white is reserved for surfaces that need to read as 'on top of the page'"
    },
    "accent-card-surface": {
      "$value": "#ffb110",
      "$type": "color",
      "$description": "Surface level 2: Colored card backgrounds (yellow, coral, blue, midnight) — feature blocks paint the canvas with single-hue fills"
    },
    "dark-card-surface": {
      "$value": "#02093a",
      "$type": "color",
      "$description": "Surface level 3: Deep navy panels for dark-mode-style feature blocks — inverting the surface stack with white text on midnight"
    }
  },
  "$extensions": {
    "com.refero.extraction": {
      "url": "https://notion.so",
      "siteName": "Notion",
      "extractedAt": "2026-07-03T03:31:31.670Z",
      "variant": "extended"
    }
  }
}
--------------------------------------------
# Lusion — Style Reference
> 3D sculpture gallery on a frosted lavender plane. Every interface element should feel like a tactile object resting on a pale, slightly cool gallery floor, with the 3D content doing all the chromatic and dramatic work.

**Theme:** light

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

Lusion treats its website as a digital sculpture gallery rather than a typical agency portfolio. The entire chrome sits on a cold lavender-tinted off-white (#f0f1fa) that makes pure black Aeonik text feel etched into the canvas, while the 3D renders — vivid electric indigo crosses, polished metal, glass cylinders — supply every drop of chromatic energy. Pill-shaped components at 87–100px radius make the UI feel like physical objects placed on a gallery floor, never card stacks. Shadows are reduced to a 4% whisper; depth and drama come from the 3D content itself, not from UI elevation. Whitespace is generous, navigation is reduced to bare essentials, and the few text links are pure black with the same tight -0.02em tracking as body copy.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Lavender Mist | `#f0f1fa` | `--color-lavender-mist` | Page canvas — the dominant background, a cool off-white with a barely-perceptible lavender cast that makes pure black text feel sharper than it would on pure white |
| Paper White | `#ffffff` | `--color-paper-white` | Elevated card and surface backgrounds, button text on dark fills, inverted surfaces |
| Ink | `#000000` | `--color-ink` | Primary text, all headings, body copy, icons, and link text — pure black with no softening |
| Graphite | `#2b2e3a` | `--color-graphite` | Supporting neutral for secondary UI, dividers, and muted labels. Do not promote it to the primary CTA color |
| Haze | `#e4e6ef` | `--color-haze` | Light supporting surface for subtle backgrounds and section separation. Do not promote it to the primary CTA color |
| Slate Hollow | `#34393f` | `--color-slate-hollow` | Deep surface layer for dark bands or modal overlays, darker than graphite for clear hierarchy separation |
| Electric Indigo | `#1a2ffb` | `--color-electric-indigo` | Chromatic brand accent — appears as icon stroke, inline highlight marks, and as the signature color inside the 3D hero render. The single source of energy against the otherwise achromatic UI |
| Acid Lime | `#c1ff00` | `--color-acid-lime` | Highlight wash for emphasis zones, secondary accent inside 3D compositions — used sparingly as a surprise contrast |

## Tokens — Typography

### Aeonik — Used for every text element on the site — navigation, body, headings, buttons, inputs. The deliberate weight ceiling at 500 (no bold) and uniformly tight -0.02em tracking create a uniform geometric confidence. Display sizes compress line-height to 0.90, letting the largest headlines (108–144px) feel sculpted rather than set. The 400 weight is the workhorse; 500 is reserved for navigation, labels, and button text where a slight emphasis is needed. · `--font-aeonik`
- **Substitute:** Inter, Satoshi, General Sans, or DM Sans
- **Weights:** 400, 500
- **Sizes:** 12, 13, 14, 16, 18, 20, 22, 26, 36, 38, 43, 49, 50, 108, 115, 144
- **Line height:** 0.90, 1.00, 1.10, 1.15, 1.20, 1.40, 1.50
- **Letter spacing:** -0.02em applied uniformly across all sizes
- **Role:** Used for every text element on the site — navigation, body, headings, buttons, inputs. The deliberate weight ceiling at 500 (no bold) and uniformly tight -0.02em tracking create a uniform geometric confidence. Display sizes compress line-height to 0.90, letting the largest headlines (108–144px) feel sculpted rather than set. The 400 weight is the workhorse; 500 is reserved for navigation, labels, and button text where a slight emphasis is needed.

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| caption | — | — | 12px | 1.5 | -0.24px | `--text-caption` |
| body-sm | — | — | 14px | 1.4 | -0.28px | `--text-body-sm` |
| body | — | — | 16px | 1.4 | -0.32px | `--text-body` |
| subheading | — | — | 20px | 1.2 | -0.4px | `--text-subheading` |
| heading-sm | — | — | 26px | 1.2 | -0.52px | `--text-heading-sm` |
| heading | — | — | 38px | 1.15 | -0.76px | `--text-heading` |
| heading-lg | — | — | 50px | 1.1 | -1px | `--text-heading-lg` |
| display | — | — | 144px | 0.9 | -2.88px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 4px

**Density:** spacious

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 24 | 24px | `--spacing-24` |
| 72 | 72px | `--spacing-72` |
| 80 | 80px | `--spacing-80` |
| 168 | 168px | `--spacing-168` |
| 216 | 216px | `--spacing-216` |

### Border Radius

| Element | Value |
|---------|-------|
| cards | 15px |
| inputs | 18px |
| buttons | 87.5px |
| smallDetails | 3px |
| imageContainers | 100px |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| md | `rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04)...` | `--shadow-md` |

### Layout

- **Page max-width:** 1400px
- **Section gap:** 72px
- **Card padding:** 24px
- **Element gap:** 16px

## Components

### Pill Action Button
**Role:** Primary call-to-action (e.g. 'LET'S TALK')

Filled dark pill at #2b2e3a background, white text in Aeonik 14px weight 500, -0.02em tracking, uppercase. Radius 87.5px (full pill). Padding 14px 24px. No border, no shadow. A small 1px white dash or plus icon sits to the left of the label as a decorative tick mark.

### Ghost Navigation Link
**Role:** Header menu items and inline links

Pure black text (#000000) in Aeonik 14–16px weight 500, uppercase, -0.02em tracking. No underline, no background. Hover state increases opacity or adds a subtle underline. Sits directly on the Lavender Mist canvas.

### Menu Toggle Button
**Role:** Header right-side menu trigger

Text label 'MENU' in Aeonik 14px weight 500, black, followed by a small horizontal dash/plus icon. No background or border. Identical visual weight to the pill button label but without the dark fill — it relies on proximity and the canvas for separation.

### Hero Image Container
**Role:** Large 3D artwork display

Full-width container with 100px border-radius (the signature soft-rectangle shape). No padding inside — the 3D render bleeds to the edges. Sits directly on the Lavender Mist canvas with no shadow; the contrast between the dark 3D scene and the pale canvas is the only visual separation.

### Card Surface
**Role:** Content cards, secondary information blocks

White (#ffffff) background, 15px border-radius, 24px padding, no shadow. Optional 1px border in #e4e6ef for definition against the canvas. Typography inside uses black on white at Aeonik 16px weight 400.

### Scroll Indicator
**Role:** Bottom-of-viewport prompt

Centered 'SCROLL TO EXPLORE' label in Aeonik 12–14px weight 500, black, uppercase, with flanking plus signs (+) as decorative ticks. No background, sits in the margin between hero and content sections.

### Input Field
**Role:** Form inputs in contact or newsletter areas

White or Lavender Mist background, 18px border-radius, 1px border in #e4e6ef, Aeonik 16px weight 400 placeholder text in a muted gray. Focus state replaces border with Electric Indigo (#1a2ffb). Padding 14px 18px.

### Header Bar
**Role:** Site-wide navigation

Transparent, sits directly on the Lavender Mist canvas with 24–32px vertical padding. Logo (Aeonik wordmark) left-aligned, a short descriptive headline centered, and action + menu controls right-aligned. No background fill, no border, no shadow — the header is typographic, not architectural.

### Section Divider Tick
**Role:** Visual rhythm element between sections

Small plus-sign (+) marks in black, scattered as decorative punctuation along section edges. Aeonik 16px, no background, used as a signature visual signature rather than functional UI.

## Do's and Don'ts

### Do
- Use Lavender Mist (#f0f1fa) as the canvas for every full-page background; never use pure white as the page base — the slight lavender cast is the brand
- Set all text to pure black (#000000) with Aeonik at weight 400–500 and tracking -0.02em; never introduce a bold weight or a softer gray for emphasis
- Use the 87.5px pill radius for all action buttons and the 100px radius for all image/hero containers; these two radii are the signature shape language
- Reach for Electric Indigo (#1a2ffb) only as a chromatic punctuation — icon stroke, inline highlight, focus ring on inputs — never as a large filled surface
- Keep shadows at the single 4% black whisper stack (0px 6px 10px + 0px 2px 4px); do not stack multiple elevations or introduce colored shadows
- Space sections at 72px vertical rhythm; let the generous breathing room and 3D content do the work rather than adding dividers or borders
- Use Aeonik at the full size range from 12px caption through 144px display; let the type scale itself create hierarchy rather than color or weight variation

### Don't
- Don't introduce a third type weight above 500 — bold or black weights break the restrained typographic system
- Don't use white (#ffffff) as the page background; the Lavender Mist canvas is what makes black text and 3D content feel cut and crisp
- Don't fill large UI surfaces with Electric Indigo; it is an accent, not a brand wash — large indigo blocks destroy the gallery-floor metaphor
- Don't add decorative gradients, glassmorphism, or blur effects; surfaces are flat and physical
- Don't use 8px, 12px, or 20px border-radii on cards, buttons, or containers — stick to the defined 3px, 15px, 18px, 87.5px, and 100px values
- Don't add hover states that change background fill or introduce color; rely on opacity shifts and underline reveals against the static canvas
- Don't use the Acid Lime (#c1ff00) as a CTA or text background; it lacks the contrast hierarchy needed for interactive elements and belongs only inside 3D compositions or highlight washes

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Lavender Canvas | `#f0f1fa` | Default page background, dominant surface |
| 1 | Paper Surface | `#ffffff` | Elevated cards and content blocks |
| 2 | Haze Edge | `#e4e6ef` | Borders, dividers, disabled states |
| 3 | Graphite Plate | `#2b2e3a` | Dark UI elements, button fills |
| 4 | Slate Hollow | `#34393f` | Darkest surface layer for inverted sections or overlays |

## Elevation

- **Pill Action Button:** `rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px`
- **Card Surface:** `rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px`

## Imagery

The site is image-driven through full-bleed 3D renders — metallic, glass, and matte plastic objects (cross shapes, cylinders, spheres) rendered in Electric Indigo, black, and white. These renders occupy the entire viewport inside 100px-radius containers, floating on the Lavender Mist canvas with no padding or frame. No photography, no illustration, no icons in the traditional sense — the 3D content IS the visual system. Iconography is minimal: small plus signs, dashes, and arrows in pure black or Electric Indigo, used as decorative ticks and scroll prompts. The 3D work carries all the chromatic and dramatic weight, leaving the UI chrome achromatic and quiet.

## Layout

Full-bleed canvas with a max content width of approximately 1400px centered. The header is a thin transparent bar with the wordmark left, a short descriptive line center, and action/menu controls right — no sticky behavior, no background fill. The hero pattern is a centered short headline (3 lines max) followed by a massive rounded-corner 3D render container that fills the viewport width. Section rhythm is consistent vertical spacing at 72px with no dividers or background alternation — the entire page sits on the same Lavender Mist canvas, so visual separation comes from 3D content and generous whitespace rather than from colored bands. Content arrangement is centered stacks for text and full-bleed for imagery; no asymmetric two-column layouts or z-patterns. The overall density is spacious and gallery-like, with each 3D render given room to breathe as a standalone object.

## Agent Prompt Guide

Quick Color Reference:
- text: #000000 (pure black, all sizes and weights)
- background (canvas): #f0f1fa (Lavender Mist)
- surface (cards): #ffffff (white)
- border: #e4e6ef (Haze)
- accent: #1a2ffb (Electric Indigo, for icons and focus rings only)
- primary action: no distinct CTA color

Example Component Prompts:

1. Create a hero section: Lavender Mist (#f0f1fa) canvas. Centered headline in Aeonik 50px weight 500, #000000, letter-spacing -1.0px, line-height 1.10, 3 lines max. Below, a full-width 3D render container at 100px border-radius, bleeding edge-to-edge, no padding, no border, no shadow. Centered below the container, a 'SCROLL TO EXPLORE' label in Aeonik 12px weight 500, #000000, uppercase, flanked by plus signs.

2. Create a header navigation bar: Transparent on Lavender Mist (#f0f1fa), 24px vertical padding. Left: 'LUSION' wordmark in Aeonik 16px weight 500, #000000. Center: short descriptive line in Aeonik 16px weight 400, #000000. Right: a pill button (background #2b2e3a, text #ffffff, Aeonik 14px weight 500, uppercase, padding 14px 24px, radius 87.5px) with a small white dash icon to the left of the label, followed by a 'MENU' text trigger in Aeonik 14px weight 500, #000000, with a dash icon.

3. Create a card grid: White (#ffffff) cards at 15px border-radius, 24px padding, optional 1px border in #e4e6ef. Title in Aeonik 22px weight 500, #000000. Body in Aeonik 16px weight 400, #000000. No drop shadow on the card itself; rely on the white-on-lavender contrast for separation. Space cards with 24–32px gap in a 3-column grid, max-width 1200px centered on the Lavender Mist canvas.

4. Create an input field: Background #ffffff, border 1px solid #e4e6ef, 18px border-radius, padding 14px 18px. Placeholder text in Aeonik 16px weight 400 in a muted gray. Focus state: border switches to Electric Indigo (#1a2ffb), no other change — no glow, no shadow, no background shift.

5. Create a section divider: On the Lavender Mist canvas, place a centered horizontal row of three small plus signs (+) in #000000, Aeonik 16px, spaced 16px apart, serving as a decorative tick separator between content blocks. No lines, no background change.

## Similar Brands

- **Active Theory** — Both are 3D/webGL agency sites that use full-bleed rendered scenes as the primary visual, with a minimal achromatic UI frame and a single chromatic accent inside the 3D content
- **Resn** — Same spacious-gallery layout philosophy, dark 3D artwork against pale canvas, and restrained UI chrome that defers all drama to the rendered content
- **Locomotive** — Shares the pill-shaped button language, generous whitespace, and an almost-typographic navigation approach with nearly no border or shadow on the interface
- **Basement Studio** — Both use vivid single-hue accents (indigo/blue) inside 3D compositions while keeping the surrounding UI strictly achromatic and gallery-like
- **Gunner** — Similar dark 3D renders inside soft-cornered containers, with flat chrome and a focus on letting the artwork dominate while UI stays quiet

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-lavender-mist: #f0f1fa;
  --color-paper-white: #ffffff;
  --color-ink: #000000;
  --color-graphite: #2b2e3a;
  --color-haze: #e4e6ef;
  --color-slate-hollow: #34393f;
  --color-electric-indigo: #1a2ffb;
  --color-acid-lime: #c1ff00;

  /* Typography — Font Families */
  --font-aeonik: 'Aeonik', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --tracking-caption: -0.24px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.4;
  --tracking-body-sm: -0.28px;
  --text-body: 16px;
  --leading-body: 1.4;
  --tracking-body: -0.32px;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: -0.4px;
  --text-heading-sm: 26px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -0.52px;
  --text-heading: 38px;
  --leading-heading: 1.15;
  --tracking-heading: -0.76px;
  --text-heading-lg: 50px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -1px;
  --text-display: 144px;
  --leading-display: 0.9;
  --tracking-display: -2.88px;

  /* Typography — Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-72: 72px;
  --spacing-80: 80px;
  --spacing-168: 168px;
  --spacing-216: 216px;

  /* Layout */
  --page-max-width: 1400px;
  --section-gap: 72px;
  --card-padding: 24px;
  --element-gap: 16px;

  /* Border Radius */
  --radius-sm: 3px;
  --radius-xl: 15px;
  --radius-2xl: 18px;
  --radius-full: 76.5px;
  --radius-full-2: 87.5px;
  --radius-full-3: 100px;

  /* Named Radii */
  --radius-cards: 15px;
  --radius-inputs: 18px;
  --radius-buttons: 87.5px;
  --radius-smalldetails: 3px;
  --radius-imagecontainers: 100px;

  /* Shadows */
  --shadow-md: rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px;

  /* Surfaces */
  --surface-lavender-canvas: #f0f1fa;
  --surface-paper-surface: #ffffff;
  --surface-haze-edge: #e4e6ef;
  --surface-graphite-plate: #2b2e3a;
  --surface-slate-hollow: #34393f;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-lavender-mist: #f0f1fa;
  --color-paper-white: #ffffff;
  --color-ink: #000000;
  --color-graphite: #2b2e3a;
  --color-haze: #e4e6ef;
  --color-slate-hollow: #34393f;
  --color-electric-indigo: #1a2ffb;
  --color-acid-lime: #c1ff00;

  /* Typography */
  --font-aeonik: 'Aeonik', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --tracking-caption: -0.24px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.4;
  --tracking-body-sm: -0.28px;
  --text-body: 16px;
  --leading-body: 1.4;
  --tracking-body: -0.32px;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: -0.4px;
  --text-heading-sm: 26px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -0.52px;
  --text-heading: 38px;
  --leading-heading: 1.15;
  --tracking-heading: -0.76px;
  --text-heading-lg: 50px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -1px;
  --text-display: 144px;
  --leading-display: 0.9;
  --tracking-display: -2.88px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-72: 72px;
  --spacing-80: 80px;
  --spacing-168: 168px;
  --spacing-216: 216px;

  /* Border Radius */
  --radius-sm: 3px;
  --radius-xl: 15px;
  --radius-2xl: 18px;
  --radius-full: 76.5px;
  --radius-full-2: 87.5px;
  --radius-full-3: 100px;

  /* Shadows */
  --shadow-md: rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px;
}
```
@theme {
  /* Colors */
  --color-lavender-mist: #f0f1fa;
  --color-paper-white: #ffffff;
  --color-ink: #000000;
  --color-graphite: #2b2e3a;
  --color-haze: #e4e6ef;
  --color-slate-hollow: #34393f;
  --color-electric-indigo: #1a2ffb;
  --color-acid-lime: #c1ff00;

  /* Typography */
  --font-aeonik: 'Aeonik', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --tracking-caption: -0.24px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.4;
  --tracking-body-sm: -0.28px;
  --text-body: 16px;
  --leading-body: 1.4;
  --tracking-body: -0.32px;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: -0.4px;
  --text-heading-sm: 26px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -0.52px;
  --text-heading: 38px;
  --leading-heading: 1.15;
  --tracking-heading: -0.76px;
  --text-heading-lg: 50px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -1px;
  --text-display: 144px;
  --leading-display: 0.9;
  --tracking-display: -2.88px;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-72: 72px;
  --spacing-80: 80px;
  --spacing-168: 168px;
  --spacing-216: 216px;

  /* Border Radius */
  --radius-sm: 3px;
  --radius-xl: 15px;
  --radius-2xl: 18px;
  --radius-full: 76.5px;
  --radius-full-2: 87.5px;
  --radius-full-3: 100px;

  /* Shadows */
  --shadow-md: rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px;
}
:root {
  /* Colors */
  --color-lavender-mist: #f0f1fa;
  --color-paper-white: #ffffff;
  --color-ink: #000000;
  --color-graphite: #2b2e3a;
  --color-haze: #e4e6ef;
  --color-slate-hollow: #34393f;
  --color-electric-indigo: #1a2ffb;
  --color-acid-lime: #c1ff00;

  /* Typography — Font Families */
  --font-aeonik: 'Aeonik', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 12px;
  --leading-caption: 1.5;
  --tracking-caption: -0.24px;
  --text-body-sm: 14px;
  --leading-body-sm: 1.4;
  --tracking-body-sm: -0.28px;
  --text-body: 16px;
  --leading-body: 1.4;
  --tracking-body: -0.32px;
  --text-subheading: 20px;
  --leading-subheading: 1.2;
  --tracking-subheading: -0.4px;
  --text-heading-sm: 26px;
  --leading-heading-sm: 1.2;
  --tracking-heading-sm: -0.52px;
  --text-heading: 38px;
  --leading-heading: 1.15;
  --tracking-heading: -0.76px;
  --text-heading-lg: 50px;
  --leading-heading-lg: 1.1;
  --tracking-heading-lg: -1px;
  --text-display: 144px;
  --leading-display: 0.9;
  --tracking-display: -2.88px;

  /* Typography — Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-4: 4px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-72: 72px;
  --spacing-80: 80px;
  --spacing-168: 168px;
  --spacing-216: 216px;

  /* Layout */
  --page-max-width: 1400px;
  --section-gap: 72px;
  --card-padding: 24px;
  --element-gap: 16px;

  /* Border Radius */
  --radius-sm: 3px;
  --radius-xl: 15px;
  --radius-2xl: 18px;
  --radius-full: 76.5px;
  --radius-full-2: 87.5px;
  --radius-full-3: 100px;

  /* Named Radii */
  --radius-cards: 15px;
  --radius-inputs: 18px;
  --radius-buttons: 87.5px;
  --radius-smalldetails: 3px;
  --radius-imagecontainers: 100px;

  /* Shadows */
  --shadow-md: rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px;

  /* Surfaces */
  --surface-lavender-canvas: #f0f1fa;
  --surface-paper-surface: #ffffff;
  --surface-haze-edge: #e4e6ef;
  --surface-graphite-plate: #2b2e3a;
  --surface-slate-hollow: #34393f;
}
{
  "color": {
    "lavender-mist": {
      "$value": "#f0f1fa",
      "$type": "color",
      "$description": "Lavender Mist — Page canvas — the dominant background, a cool off-white with a barely-perceptible lavender cast that makes pure black text feel sharper than it would on pure white"
    },
    "paper-white": {
      "$value": "#ffffff",
      "$type": "color",
      "$description": "Paper White — Elevated card and surface backgrounds, button text on dark fills, inverted surfaces"
    },
    "ink": {
      "$value": "#000000",
      "$type": "color",
      "$description": "Ink — Primary text, all headings, body copy, icons, and link text — pure black with no softening"
    },
    "graphite": {
      "$value": "#2b2e3a",
      "$type": "color",
      "$description": "Graphite — Supporting neutral for secondary UI, dividers, and muted labels. Do not promote it to the primary CTA color"
    },
    "haze": {
      "$value": "#e4e6ef",
      "$type": "color",
      "$description": "Haze — Light supporting surface for subtle backgrounds and section separation. Do not promote it to the primary CTA color"
    },
    "slate-hollow": {
      "$value": "#34393f",
      "$type": "color",
      "$description": "Slate Hollow — Deep surface layer for dark bands or modal overlays, darker than graphite for clear hierarchy separation"
    },
    "electric-indigo": {
      "$value": "#1a2ffb",
      "$type": "color",
      "$description": "Electric Indigo — Chromatic brand accent — appears as icon stroke, inline highlight marks, and as the signature color inside the 3D hero render. The single source of energy against the otherwise achromatic UI"
    },
    "acid-lime": {
      "$value": "#c1ff00",
      "$type": "color",
      "$description": "Acid Lime — Highlight wash for emphasis zones, secondary accent inside 3D compositions — used sparingly as a surprise contrast"
    }
  },
  "font": {
    "aeonik": {
      "$value": "Aeonik",
      "$type": "fontFamily",
      "$description": "Used for every text element on the site — navigation, body, headings, buttons, inputs. The deliberate weight ceiling at 500 (no bold) and uniformly tight -0.02em tracking create a uniform geometric confidence. Display sizes compress line-height to 0.90, letting the largest headlines (108–144px) feel sculpted rather than set. The 400 weight is the workhorse; 500 is reserved for navigation, labels, and button text where a slight emphasis is needed."
    }
  },
  "typography": {
    "xs": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "12px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step xs at 12px"
    },
    "xs-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "12px",
        "fontWeight": 400,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step xs-2 at 12px"
    },
    "sm": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "13px",
        "fontWeight": 400,
        "lineHeight": 1.4,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm at 13px"
    },
    "sm-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "13px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-2 at 13px"
    },
    "sm-3": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-3 at 14px"
    },
    "sm-4": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "14px",
        "fontWeight": 500,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-4 at 14px"
    },
    "sm-5": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "14px",
        "fontWeight": 500,
        "lineHeight": 1.2,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-5 at 14px"
    },
    "sm-6": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "14px",
        "fontWeight": 500,
        "lineHeight": 1.4,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-6 at 14px"
    },
    "sm-7": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.4,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-7 at 14px"
    },
    "sm-8": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-8 at 14px"
    },
    "sm-9": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "14px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step sm-9 at 14px"
    },
    "base": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step base at 16px"
    },
    "base-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step base-2 at 16px"
    },
    "base-3": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "16px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step base-3 at 16px"
    },
    "lg": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "18px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step lg at 18px"
    },
    "lg-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "18px",
        "fontWeight": 400,
        "lineHeight": 1.4,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step lg-2 at 18px"
    },
    "xl": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "20px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step xl at 20px"
    },
    "xl-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "22px",
        "fontWeight": 400,
        "lineHeight": 1.4,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step xl-2 at 22px"
    },
    "2xl": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "26px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 2xl at 26px"
    },
    "2xl-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "26px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 2xl-2 at 26px"
    },
    "4xl": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "36px",
        "fontWeight": 400,
        "lineHeight": 1.1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 4xl at 36px"
    },
    "4xl-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "38px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 4xl-2 at 38px"
    },
    "4xl-3": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "43px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 4xl-3 at 43px"
    },
    "5xl": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "49px",
        "fontWeight": 400,
        "lineHeight": 1.15,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl at 49px"
    },
    "5xl-2": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "50px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-2 at 50px"
    },
    "5xl-3": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "108px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-3 at 108px"
    },
    "5xl-4": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "115px",
        "fontWeight": 400,
        "lineHeight": 0.9,
        "letterSpacing": "-0.02em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-4 at 115px"
    },
    "5xl-5": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "144px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "-0.02em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-5 at 144px"
    },
    "5xl-6": {
      "$value": {
        "fontFamily": "Aeonik",
        "fontSize": "144px",
        "fontWeight": 400,
        "lineHeight": 1,
        "letterSpacing": "0em"
      },
      "$type": "typography",
      "$description": "Typography step 5xl-6 at 144px"
    }
  },
  "spacing": {
    "4": {
      "$value": "4px",
      "$type": "dimension",
      "$description": "Spacing 4px"
    },
    "12": {
      "$value": "12px",
      "$type": "dimension",
      "$description": "Spacing 12px"
    },
    "16": {
      "$value": "16px",
      "$type": "dimension",
      "$description": "Spacing 16px"
    },
    "24": {
      "$value": "24px",
      "$type": "dimension",
      "$description": "Spacing 24px"
    },
    "72": {
      "$value": "72px",
      "$type": "dimension",
      "$description": "Spacing 72px"
    },
    "80": {
      "$value": "80px",
      "$type": "dimension",
      "$description": "Spacing 80px"
    },
    "168": {
      "$value": "168px",
      "$type": "dimension",
      "$description": "Spacing 168px"
    },
    "216": {
      "$value": "216px",
      "$type": "dimension",
      "$description": "Spacing 216px"
    },
    "unit": {
      "$value": "4px",
      "$type": "dimension",
      "$description": "Base spacing unit"
    }
  },
  "radius": {
    "sm": {
      "$value": "3px",
      "$type": "dimension",
      "$description": "Border radius sm"
    },
    "xl": {
      "$value": "15px",
      "$type": "dimension",
      "$description": "Border radius xl"
    },
    "2xl": {
      "$value": "18px",
      "$type": "dimension",
      "$description": "Border radius 2xl"
    },
    "full": {
      "$value": "76.5px",
      "$type": "dimension",
      "$description": "Border radius full"
    },
    "full-2": {
      "$value": "87.5px",
      "$type": "dimension",
      "$description": "Border radius full-2"
    },
    "full-3": {
      "$value": "100px",
      "$type": "dimension",
      "$description": "Border radius full-3"
    }
  },
  "shadow": {
    "md": {
      "$value": "rgba(0, 0, 0, 0.04) 0px 6px 10px 0px, rgba(0, 0, 0, 0.04) 0px 2px 4px 0px",
      "$type": "shadow",
      "$description": "Shadow elevation md"
    }
  },
  "surface": {
    "lavender-canvas": {
      "$value": "#f0f1fa",
      "$type": "color",
      "$description": "Surface level 0: Default page background, dominant surface"
    },
    "paper-surface": {
      "$value": "#ffffff",
      "$type": "color",
      "$description": "Surface level 1: Elevated cards and content blocks"
    },
    "haze-edge": {
      "$value": "#e4e6ef",
      "$type": "color",
      "$description": "Surface level 2: Borders, dividers, disabled states"
    },
    "graphite-plate": {
      "$value": "#2b2e3a",
      "$type": "color",
      "$description": "Surface level 3: Dark UI elements, button fills"
    },
    "slate-hollow": {
      "$value": "#34393f",
      "$type": "color",
      "$description": "Surface level 4: Darkest surface layer for inverted sections or overlays"
    }
  },
  "$extensions": {
    "com.refero.extraction": {
      "url": "https://lusion.co",
      "siteName": "Lusion",
      "extractedAt": "2026-06-03T18:06:30.524Z",
      "variant": "extended"
    }
  }
}