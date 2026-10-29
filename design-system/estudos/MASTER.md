# Design system: Estudos

One accent, hairline borders, comfortable measure. Direction resolved from
`capacitacao_ia_arquitetura/slides/index.html` (Montserrat, `#1d4ed8` accent, 1px lines, 14px cards,
uppercase kickers) and adapted from slides to long-form reading.

Dials: variance 3, motion 2, density 5. Product type: technical reading tool with a light dashboard.
Rejected: serif body, gradients as decoration, per-subject colors, emoji icons, hover-only affordances.

## Color tokens

Semantic only. Components never use raw hex (`color-semantic`).

| Token | Light | Dark | Use |
|:---|:---|:---|:---|
| `--background` | `#ffffff` | `#0f1116` | page |
| `--foreground` | `#15181e` | `#e8eaef` | body text |
| `--muted-foreground` | `#5c6470` | `#a3abba` | secondary text, kickers |
| `--faint` | `#8a92a0` | `#7b8496` | captions, meta |
| `--card` | `#ffffff` | `#15181e` | cards, sidebar |
| `--border` | `#e7eaf0` | `#262b36` | hairlines, table rules |
| `--accent` | `#1d4ed8` | `#7aa2ff` | links, active nav, progress fill |
| `--accent-ink` | `#14357f` | `#c7d6ff` | accent text on soft background |
| `--accent-soft` | `#eef3fe` | `#16213c` | selected row, callouts |
| `--success` | `#157347` | `#4ade80` | done state |
| `--warning` | `#b42318` | `#f87171` | review state, drift warnings |
| `--code-bg` | `#f5f7fa` | `#111522` | code blocks, inline code, strips |

Contrast targets: body text 4.5:1 minimum in both themes, large headings 3:1, borders 3:1 against
their surface (`color-accessible-pairs`, `color-dark-mode`). Verify both themes independently; do
not infer dark from light.

## Typography

Family: Montserrat variable, self-hosted woff2, `font-display: swap`, weights 400/500/600/700/800.
Mono: `ui-monospace, "FiraCode Nerd Font", monospace`. No second display family.

| Role | Size / line height | Weight | Notes |
|:---|:---|:---|:---|
| Page title (guide cover) | 34px / 1.15 | 800 | letter-spacing -0.02em |
| Chapter title (h1 in chapter) | 30px / 1.2 | 700 | letter-spacing -0.015em |
| Section h2 | 23px / 1.3 | 700 | `scroll-margin-top: 88px` |
| Subsection h3 | 19px / 1.35 | 600 | |
| h4 | 17px / 1.4 | 600 | magnésio, cálculo numérico |
| Body | 18px / 1.65 | 400 | minimum 16px on mobile (`readable-font-size`) |
| Small / meta | 14px / 1.5 | 500 | |
| Caption | 13px / 1.45 | 400 | `--faint` |
| Kicker | 12px / 1 | 700 | uppercase, 0.16em tracking, accent |
| Table | 15px / 1.4 | 400 | `font-variant-numeric: tabular-nums` |

Measure: 66ch body column, 60ch on phone (`line-length-control`). Long tokens, URLs and molecule
names wrap with `overflow-wrap: anywhere` (`long-token-wrapping`).

## Spacing, radius, elevation

Spacing scale 4/8: 4, 8, 12, 16, 24, 32, 48, 64. Section rhythm: 16 between paragraphs, 32 before
an h2, 48 before a new chapter block, 64 above the footer nav.

Radius: 14px cards, 12px code and strips, 10px figures, 999px chips, 6px inline code.
Elevation: none by default; one soft shadow on the mobile drawer and the lightbox only. Borders do
the work. `--shadow-pop: 0 12px 32px rgb(21 24 30 / 0.12)`.

## Layout

- Desktop `>= 1024px`: 64px icon rail (no permanent sidebar), reading column centered at 66ch with
  32px gutters, sticky top bar 64px with breadcrumb, progress meter and theme toggle.
- Tablet `768–1023px`: the same 64px icon rail. The top bar's menu button opens the drawer at every
  width, desktop included.
- Phone `< 768px`: no rail; top bar 56px with back, title and overflow menu; drawer via
  coss `Sheet`; reading column 100% minus 20px gutters; bottom safe area respected
  (`viewport-units`, `fixed-element-offset`).
- z-index scale: 0 content, 10 sticky bar, 20 sidebar, 40 drawer, 60 dialog/lightbox, 80 toast.
- No page-level horizontal scroll at 375px; wide tables and code scroll inside their own container
  (`horizontal-scroll`).

## Components and page rules

**Home (`/`)**: subject groups in a vertical list, one row per guide: title, subject chip, type chip
(`teoria`, `banco`, `referência`, `glossário`), chapter count, progress bar, last-read chip.
"Continuar" appears once at the top when there is reading history. One primary action per screen
(`primary-action`).

**Covers (`/estantes`)**: grid of guide cards with a 16:9 cover derived from the first figure of the
guide or a typographic placeholder; fuzzy subject filter with an accent-insensitive match; empty
state explains how to add a guide (`empty-states`).

**Guide cover (`/g/:guideId`)**: title, source metadata (discipline, professor, dates), chapter TOC
as a list with per-chapter progress and type labels, total progress meter, and the original manual
index content that used to sit inside the merged file.

**Chapter (`/g/:guideId/c/:chapterSlug`)**: chapter number kicker, h1, reading column, sticky
in-page TOC on `>= 1280px` (right rail, 220px), prev/next footer with target titles, "back to guide".
Heading checks appear to the left of h2/h3/h4 on desktop (20px gutter) and as a 44px tap row above
the heading on mobile (`touch-target-size`, `hover-vs-tap`).

**Reading elements**:
- Tables: wrapper with `overflow-x: auto`, sticky first column on `>= 768px` when the table has 5+
  columns, sticky header row, right-aligned numeric cells with tabular figures, visible edge shadow
  to signal scroll.
- Code: `rehype-highlight`, two highlight themes (light/dark), copy button 44px, language label in
  the caption row, no line numbers.
- Figures: `figure` + `figcaption` from the markdown alt text, `loading="lazy"`,
  `width`/`height` from the media manifest to reserve space (`image-dimension`), tap opens a coss
  `Dialog` lightbox with pinch/scroll zoom and a link to the original file.
- Math: KaTeX, display math inside a horizontally scrollable block, never clipped.
- Callouts: blockquotes styled as a 3px left accent rule with soft background; no drop shadows.
- Footnotes: coss `PreviewCard` on hover and focus, plain anchor list at the end on mobile.

**Progress UI**: `Meter` per guide on home and cover, per-chapter counts (`3/7`) with a compact
checklist in the sidebar. Two states only: done (success) and review (warning), both with icon plus
text so color is not the only signal (`color-not-only`). Aggregate = done units / total units;
review units count as not done but are surfaced separately.

**Notes**: right-hand `Sheet` on desktop, full-screen sheet on mobile, autosave debounced 800ms,
explicit "salvo" indicator, no destructive action without confirmation (`form-autosave`,
`confirmation-dialogs`).

**Search**: `Command` palette on `Cmd/Ctrl+K` and `/busca` page. Results group by guide, show the
matched heading, highlight the query, and support keyboard-only navigation. Recent queries are kept
in `localStorage` (`search-accessible`).

**Theme**: `auto` follows `prefers-color-scheme`; cycle light/dark/auto from the top bar; choice
persisted; no flash of the wrong theme (inline script sets `color-scheme` before paint).

## Motion

Tokens: `--dur-fast: 120ms`, `--dur-base: 180ms`, `--dur-slow: 240ms`, easing
`cubic-bezier(0.2, 0, 0, 1)` for enter, `cubic-bezier(0.4, 0, 1, 1)` for exit. Only transform and
opacity animate. Drawer and lightbox: 240ms in, 160ms out (`exit-faster-than-enter`). Press
feedback on cards and checks within 100ms (`tap-feedback-speed`), no layout shift. Everything is
disabled under `prefers-reduced-motion: reduce` (`reduced-motion`).

## Accessibility gates

- Sequential headings, no skipped levels; one h1 per page (`heading-hierarchy`).
- Visible focus ring: 2px `--accent` with 2px offset, never removed (`focus-states`).
- Skip link to main content; route changes move focus to the main region (`focus-on-route-change`).
- Icon-only buttons get `aria-label`; decorative icons are `aria-hidden` (`aria-labels`, `icon-context`).
- Checks are real controls with accessible names including the section title; state announced via
  `aria-pressed`/`checked`, not color.
- Lightbox: `Esc` closes, focus trapped, returns focus to the figure (`modal-escape`).
- Tables have `<caption>` when the markdown provides a title, and `scope` on header cells.
- Minimum target 44x44 on touch surfaces, 24x24 with documented exception on desktop density
  (`touch-target-size`, `web-target-size`).

## Pre-delivery check (ui-ux-pro-max)

Both themes, 375px, 768px, 1440px, landscape, reduced motion, largest system text size. Every
tappable element has press feedback and a 44px target. No emoji icons; one icon family (Lucide,
1.5px stroke). Body contrast 4.5:1 in both themes. No horizontal page scroll. Reading measure
66ch. Focus never hidden behind the sticky bar. Drawer and lightbox have visible close affordances.
