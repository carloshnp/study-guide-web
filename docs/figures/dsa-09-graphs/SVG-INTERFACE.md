# SVG interface for chapter 9 figures

Every figure is one standalone SVG file, drawn from its spec. This file is the shared
mechanical contract: the skeleton, the palette classes, the type classes, the marker set and
the data attributes the audit reads. Read your spec in full, then this file, then draw.

## File and shell

Path: `svg/FIG-09-NN-<slug>.svg`, one file, UTF-8, no external references of any kind (no
CSS file, no font file, no image, no script). The rasterizer is `rsvg-convert` 2.63.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 HEIGHT" width="1000" height="HEIGHT"
     role="img" aria-labelledby="fig-title fig-desc">
  <title id="fig-title">FIG-09-NN: short title</title>
  <desc id="fig-desc">One sentence, the message of the figure.</desc>
  <style>
    /* palette, literal hex only, light theme */
    .ink { fill: #15181e; } .muted { fill: #5c6470; } .faint { fill: #8a92a0; }
    .accent { fill: #1d4ed8; } .accent-ink { fill: #14357f; }
    .success { fill: #157347; } .warning { fill: #b42318; }
    .f-card { fill: #ffffff; } .f-wash { fill: #f5f7fa; } .f-soft { fill: #eef3fe; }
    .s-ink { stroke: #15181e; } .s-muted { stroke: #5c6470; } .s-border { stroke: #e7eaf0; }
    .s-accent { stroke: #1d4ed8; } .s-success { stroke: #157347; } .s-warning { stroke: #b42318; }
    .w-out { stroke-width: 3.2; } .w-line { stroke-width: 1.6; } .w-hair { stroke-width: 1.0; }
    text { font-family: "Montserrat", sans-serif; }
    .mono { font-family: "DejaVu Sans Mono", monospace; }
    .t-id { font-size: 18px; font-weight: 400; }
    .t-label { font-size: 15px; font-weight: 400; }
    .t-panel { font-size: 16px; font-weight: 600; }
    .t-note { font-size: 14px; font-weight: 400; }
  </style>
  <defs>
    <marker id="head-muted" viewBox="0 0 14 10" refX="13" refY="5" markerWidth="14" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L14,5 L0,10 z" fill="#5c6470"/></marker>
    <marker id="head-accent" viewBox="0 0 14 10" refX="13" refY="5" markerWidth="14" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L14,5 L0,10 z" fill="#1d4ed8"/></marker>
    <marker id="head-warning" viewBox="0 0 14 10" refX="13" refY="5" markerWidth="14" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L14,5 L0,10 z" fill="#b42318"/></marker>
    <marker id="head-success" viewBox="0 0 14 10" refX="13" refY="5" markerWidth="14" markerHeight="10" orient="auto-start-reverse"><path d="M0,0 L14,5 L0,10 z" fill="#157347"/></marker>
  </defs>
  <rect x="0" y="0" width="1000" height="HEIGHT" class="f-card"/>
  <g data-view="A">
    ...
  </g>
</svg>
```

The first drawn element after the defs is the full-bleed card rectangle: the site serves a
raster image, and a light plate on a dark page must not look like a hole.

## Structure rules

- One `<g data-view="A">`, `B`, `C` per view, in reading order. Never nest a view inside another.
- Every drawn element carries `data-el="<inventory id>"`, for example `data-el="A-03"` or
  `data-el="A-PANEL"` where the spec uses semantic ids, and also `id="VIZ-<inventory id>"` as the
  spec's section 9 asks, so the DOM hook and the audit agree. Repeated copies of one inventory row
  share the same id (eight vertex circles are eight `A-01`). The audit uses `data-el` to prove each
  inventory row reached the drawing; an element without it counts as undrawn.
- Group reuse is allowed (`<g>` wrappers, `<use>`), but a `data-el` must sit on the element the
  inventory describes, not on a wrapper.
- No `<foreignObject>`, no `<filter>`, no gradient, no `<script>`, no `opacity` below 0.35, no
  clipping that can hide text.
- Text is never inside a shape element: use a separate `<text>`.

## Type

- Every `<text>` carries an explicit `font-size` attribute (14, 15, 16 or 18), a class from
  `.t-*`, and a colour class (`.ink`, `.muted`, `.accent-ink`, `.success`, `.warning`).
- Never below 14. Panel labels are 16 and weight 600 (class `.t-panel`). Vertex ids are 18.
  Weights, distances and notes are 15; marginal notes 14.
- The class `.mono` is allowed only where the spec says monospace.
- Vertex ids, weights, distances stay in Latin letters and digits, exactly as the spec prints
  them: `s a b c t u v w`, `4 2 1 5 8 3 10 7`, `d=0` to `d=11`.
- Maximum 24 characters in one label, counting spaces. Split longer text into lines of separate
  `<text>` elements.
- Do not use an em dash or an en dash anywhere. Use a comma, a colon, or parentheses.

## Geometry

- Coordinates are absolute in the 1000-unit viewBox, exactly as the spec's inventory gives them.
  When the spec inherits the canonical node positions, use those numbers verbatim, plus the one
  translation the spec declares.
- Node radius 22 unless the spec declares a scale.
- Edge lines stop at the node rim (trim 22) so they do not cross the id; the spec gives trims
  where they matter.
- Arrowheads only on directed arcs and flow arrows, via `marker-end="url(#head-...)"`. Leaders
  never carry a head.
- Text anchored `middle` when centred on a node or a cell; `start` and `end` for lists and table
  columns; baseline 5 units below the centre for a centred id.

## Colour meaning, one meaning per role

- `accent`: the active, current or examined element (current vertex, edge under test, current row).
- `success`: final, settled or verified (a settled distance, a finished vertex, a passing check).
- `warning`: contradiction or breakage (a rejected route, a cycle that forbids an order, a
  negative edge, a value that is wrong).
- `muted`: edges, connectors, secondary labels, pending states.
- `faint`: aids only. Never text, never a state.
- `border`: frames, rules, band edges. Never a meaningful stroke.
- Every meaning carried by hue is also carried by shape, dash or label.

## Self-check before you report

```bash
cd /home/carloshnp/study-site/docs/figures/dsa-09-graphs
python3 svg_audit.py svg/FIG-09-NN-<slug>.svg
```

The audit must print `ok` for your file: every inventory id present, the view floors met, no
colour outside the palette, no text under 14, no label over 24 characters, no dash characters,
and a parseable render. Then rasterise once to prove it renders:

```bash
rsvg-convert --width 1000 --format png --output /tmp/FIG-09-NN.png svg/FIG-09-NN-<slug>.svg
```

Report the audit line, the element count per view, and the raster size. Do not report success
without both.
