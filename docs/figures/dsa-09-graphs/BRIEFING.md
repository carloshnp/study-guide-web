# BRIEFING: illustration specs for DSA chapter 9 (Graphs)

This file is the contract for every agent writing one figure spec. Read it fully before
writing. Your own assignment is one row of the roster in `PLAN.md`; you write exactly one
file and nothing else.

## 0. Mission and scope

Deliverable: written illustration specifications, in the discipline of the
`illustration-spec` skill (full path, all twelve sections). No SVG, no HTML, no code is
produced in this phase. A spec is the deliverable, and it is audited mechanically before it
is presented.

Chapter under illustration: guide `dsa`, chapter 9, "Graphs", canonically rendered at
`/home/carloshnp/study-site/content/guides/dsa/chapters/09-graphs.json` (field `markdown`).
Read the sections your figure touches; do not rely on this briefing alone for the prose,
rely on it for the numbers, which are machine-checked and given below.

Boundaries, all tiers:

- Always: write only your own `FIG-09-NN-<slug>.md` inside `docs/figures/dsa-09-graphs/`;
  state the numbers exactly as this briefing gives them; run `check_spec.py` on your file
  until it exits 0 with no FAIL.
- Ask first (this phase cannot ask, so escalate instead): dropping a required element,
  changing the canonical coordinates, adding an eleventh figure, changing the canvas width.
- Never: edit anything under `content/`, `web/`, `pipeline/`, `data/`, or another agent's
  spec; invent a numeric value with no row in the claim ledger; encode a meaning in colour
  alone; use an em dash or an en dash (U+2014, U+2013) anywhere in the file.

## 1. What the chapter argues

The chapter's one sentence, which every figure inherits:

> A graph is one object seen three ways (components, orderings, paths), and every traversal
> is an answer to the same question: when may a piece of the answer be trusted?

Figures carry one beat of that argument each. A figure that restates the prose without
showing a mechanism is a failed figure.

Orientation, per section:

| Section | Beat | Figure |
|---|---|---|
| 9.1.1 | what a graph records (directed, weighted, degree, isolated) | FIG-09-01 |
| 9.1.1 | adjacency list against adjacency matrix, the space and query trade | FIG-09-02 |
| 9.2.1 | one graph, three components, maximality, the isolated vertex | FIG-09-03 |
| 9.2.2 | topological order against a cycle, two valid orders | FIG-09-04 |
| 9.2.3 | weighted paths, why the cheaper route is not the shorter one | FIG-09-05 |
| 9.3.1 | anatomy of a specification: pre, invariant, post | FIG-09-06 |
| 9.3.2 | BFS, layers, queue, finality at dequeue | FIG-09-07 |
| 9.3.3 | DFS, stack, discover and finish times nesting | FIG-09-08 |
| 9.3.4 | Dijkstra, settling order, relaxation, the negative breaker | FIG-09-09 |
| 9.3.5 | topological order by prepending, back edge reports the cycle | FIG-09-10 |

## 2. Machine-verified facts

These were recomputed from the chapter's own data structures, not copied from memory. Use
them verbatim. Any number not in this table needs a claim-ledger row naming its source.

Sample graph, undirected, 8 vertices, 8 edges:

- V = {s, a, b, c, t, u, v, w}
- E = {{s,a}, {s,b}, {a,b}, {a,c}, {b,c}, {c,t}, {a,t}, {u,v}}
- degrees: s 2, a 4, b 3, c 3, t 2, u 1, v 1, w 0; sum of degrees 16, twice the edge count 8
- components: {s, a, b, c, t}, {u, v}, {w}
- BFS from s, unweighted: dist s 0, a 1, b 1, c 2, t 2; u, v, w unreachable (distance is
  infinity, displayed as the chapter's unvisited value)

Weights and Dijkstra, from s:

- {s,a} 4, {s,b} 2, {a,b} 1, {a,c} 5, {b,c} 8, {c,t} 3, {a,t} 10, {u,v} 7
- d(s) 0, d(b) 2, d(a) 3, d(c) 8, d(t) 11
- settle order: s (0), b (2), a (3), c (8), t (11)
- shortest path to t: s, b, a, c, t, cost 2 + 1 + 5 + 3 = 11
- the trap: from a at cost 3, the direct edge a to t costs 10 for a total of 13, while
  a, c, t costs 5 + 3 for a total of 11. Do not present the literal path s, a, t (4 + 10 =
  14) as the comparison unless you label it as a path and not as a prefix of the shortest
  route, because d(a) is 3 through b and the two framings disagree.

Directed arcs for the ordering beat: s to a, s to b, b to c, a to c, c to t. No directed
cycle. Valid topological orders include s, b, a, c, t (the one DFS produces with the
neighbour order below) and s, a, b, c, t. Adding the arc t to s closes two cycles in the
graph, s b c t s and s a c t s. Which one a traversal reports depends on the neighbour order,
so a figure that shows the report must state the order it used: with s:[a,b] the DFS path is
s, a, c, t and the reported cycle is s a c t s; with s:[b,a] it is s b c t s. Never mix the
two in one sheet.

DFS on the connected piece, adjacency order s:[a,b], a:[s,b,c,t], b:[s,a,c], c:[a,b,t],
t:[a,c]:

- discover: s 1, a 2, b 3, c 4, t 5; finish: t 6, c 7, b 8, a 9, s 10; last finish 10
- parent chain s, a, b, c, t; finish times nest, and finish(t) < finish(c) < finish(s)

Negative-weight breaker (section 9.5.2 test, vertex indices 0, 1, 2):

- arcs 0 to 1 weight 3, 0 to 2 weight 4, 2 to 1 weight -2
- Dijkstra settles vertex 1 at 3, records dist(1) as 3, and the true cheapest cost is 2
  by way of vertex 2. The invariant that breaks is the finality of a settled distance.

## 3. Canonical geometry for the sample graph

Every figure that draws the sample graph uses these coordinates, in the 1000-unit canvas,
so the same graph looks the same across the chapter. Node radius 22 units, id label centred
on the node.

| vertex | x | y |
|---|---|---|
| s | 110 | 210 |
| a | 280 | 100 |
| b | 280 | 300 |
| c | 450 | 210 |
| t | 620 | 210 |
| u | 800 | 100 |
| v | 800 | 300 |
| w | 930 | 210 |

The connected piece {s, a, b, c, t} therefore occupies x 110 to 620, y 100 to 300, and can
be reused alone in a figure of height 420 by translating the vertical origin. State in your
section 4 that the coordinates are inherited from this table and that any offset is a single
translation, not a redraw.

## 4. Canvas, typography, medium

- canvas: viewBox `0 0 1000 <H>`, H declared per figure, aspect declared in section 2 and 4
- unit scale: 1 unit = 1 CSS px at the 1000-unit reference width; declared, local
- display width: up to 1050 CSS px in the desktop column (article measure 66ch, column cap
  1120 px); on a 390 px phone the figure is read in the site lightbox at 2x zoom
- convention: flat schematic. No isometric, no perspective, no mixed projections. A
  cylindrical feature does not appear in this chapter, so the projection rule reduces to:
  one sheet, one projection, declared once
- typography: Montserrat, self-hosted by the site
- type sizes in canvas units, no exceptions: vertex id 18, edge weight and callout 15,
  panel label 16 semibold, note 14. Nothing below 14
- text split: prose lives in the chapter markdown, never inside the SVG. In-SVG labels are
  short names (vertex ids, weights, distances, one to three words). Maximum 24 characters
  per in-SVG label, maximum 2 lines per label
- detail: full (default). A reduced figure must name what is dropped and why in section 4
- scale: a view that is a detail of the same graph may scale the canonical coordinates by
  one declared factor, stated in its own view label; two views the reader compares by
  distance use the same scale, and no requirement may compare lengths across scales
- distance notation: the chapter writes `d(s) = 0` and `dist[v]`; a figure prints `d=0` or
  `dist 0` at 15 units, consistently within the sheet, and the unreachable value prints
  `inf` with the caption spelling the chapter's `infinity` once
- element floors per view: given in your roster row. The floor is a minimum count of live
  elements (circles, lines, paths, text nodes) in that view, set from the inventory, not
  from a finished drawing. The harness fails a view below its floor
- node budget: 220 live elements for a single-view figure, 380 for a two-panel figure

## 5. Visual system lock (shared by every figure in this chapter)

Projection: flat schematic, one per sheet.

Line grammar, in canvas units:

- outline (node circle, component boundary) 3.2
- edge, connector, annotation 1.6 (ratio to outline 2:1)
- hairline (table rule, band edge, gridline) 1.0
- panel frame 1.0 in `border`, never 3.2: a frame separates, it does not outline a subject
- chip outline 1.6 in `muted`; a chip may take 3.2 only when its rim encodes a state, and then
  that state is also carried by a dot, a fill, or a label
- hidden or secondary at a different depth: long dash 6 4, and it must also differ in
  position or silhouette, never by thinness alone. The dash means one thing only,
  secondary or not counted, and every dashed element carries a label or a distinct
  geometry so the reader is never asked to infer a meaning from the pattern
- centreline, cutting plane: not used in this chapter
- arrowheads: filled triangle, 14 long, 10 wide, used only on directed arcs and on flow
  (a relaxation or a pointer), never on a leader; a leader is a 1.6 line with no head

Palette, roles not swatches. Both themes are carried by the same role names; the builder
defines the light hexes on the root svg and the dark hexes under `data-theme="dark"`, and never a
raw hex inside the drawing. Each figure ships as two rendered variants, one per theme, because the
site serves a raster image and its theme is a class rather than a media query. See the delivery
contract in PLAN.md.

| NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
|---|---|---|---|---|
| ink | #15181e | #e8eaef | structure and primary text | vertex ids, values, panel labels |
| muted | #5c6470 | #a3abba | meaningful secondary | edges, connectors, secondary labels, leaders |
| faint | #8a92a0 | #7b8496 | aids only, never text | ticks, unreachable state, disabled rows |
| border | #e7eaf0 | #262b36 | decorative separation | panel frames, table rules, band edges |
| card | #ffffff | #15181e | panel fill | panel and table backgrounds |
| wash | #f5f7fa | #111522 | code and table zebra | code strips, alternating rows |
| accent | #1d4ed8 | #7aa2ff | active, current, examined | current vertex, current path, edge under test |
| accent-soft | #eef3fe | #16213c | active wash | frontier band fill, highlighted row |
| accent-ink | #14357f | #c7d6ff | text on accent-soft | labels inside a wash |
| success | #157347 | #4ade80 | final, settled, verified | settled distance, finished vertex, confirmed claim |
| warning | #b42318 | #f87171 | contradiction, breakage | broken invariant, negative edge, cycle that forbids an order |

That is eleven colour rows, which is also the full budget: no figure adds a hue.

Verified contrast, computed from the hexes above, so requirement text can quote it:
ink on card 17.78 light and 14.77 dark; muted on card 5.98 light and 7.7 dark; accent on
card 6.7 and 7.14; accent-ink on accent-soft 10.23 and 11.0; success on card 5.87 and 10.2;
warning on card 6.57 and 6.43; faint on card 3.13 and 4.73; border on card 1.21 and 1.25.
Consequences, which are requirements: faint never carries text (3.13 is below 4.5), border
never carries a meaningful edge (1.21 is below 3), and a meaningful stroke uses muted. The
wash values are surface tints (1.07 to 1.11 against card), so a wash may only group, never
encode: a state shown by wash alone is a state a reader in the other theme will miss.

Value plan: three foundation values (card, wash, accent-soft) plus ink as the darkest text
value. The strongest light and dark junction sits on the figure's dominant element, named in
section 8. Meaning is carried by value and shape first, hue second: every hue role also
carries a shape, dash, or label difference, because the site is read in both themes and by
colour-blind readers.

Light: flat, no light source declared, no shadow, no gradient. Depth in this chapter is
temporal (before, during, after), not spatial.

## 6. Required file structure

Headings exactly as written, because the audit script keys on them. Section 6 must contain
two tables: the view map first (with an `element floor` column and a numeric value in every
row), then the element inventory (header row starting with `ID`).

```markdown
# FIG-09-NN: <title>
status: draft   rev: 1   date: 2026-10-22   author: <agent role>

## 1. Summary
One paragraph, then MESSAGE = the sentence the reader should repeat.

## 2. Communicative intent
- AUDIENCE: ...
- INTENDED CHANGE: ...
- READING CONTEXT: ...
- REPRODUCTION: ...
- LIFETIME: illustration system for the chapter
- ASSUMPTIONS: numbered, each confirmed by this briefing or corrected

## 3. Goals and non-goals
- GOAL-1..n, one observable outcome each
- NON-GOAL-1..n, plausible things the figure deliberately does not do

## 4. Constraints
- canvas:, node budget:, palette budget:, typography:, text split:, convention:,
  time appetite:, detail: full, element floor:, boundaries:

## 5. Visual system lock
- projection:, line grammar:, the palette table (copy rows you use, keep the role names),
  value plan:, light:, detail floor:, style reference:

## 6. Content inventory
view map table, then element inventory table

## 7. Requirements
- REQ-FIG09NN-01 [MUST-STANDARD|MUST-LOCAL|SHOULD] <checkable statement> (source: ...)

## 8. Composition plan
dominant, focal mechanism, hierarchy, reading path, balance, framing, negative space,
grouping

## 9. Build contract
steps, interaction, animation, ids and classes, verification hooks, commands

## 9b. Mechanism and state model
STATE, DATUM, DERIVED, CHAIN, INVARIANTS, SAMPLED STATES, SWEEP, or a line starting
"none:" when nothing is derived

## 10. Acceptance criteria
table: REQ | test | pass condition | method

## 11. Open questions
## 12. Revision history
```

Requirement IDs: `REQ-FIG09NN-01`, two digits for the figure number, so FIG-09-07 uses
`REQ-FIG0907-01`. Number them in order of appearance. Each requirement one line, and its
first line must start exactly as `- REQ-FIG09NN-NN [STANDING] `.

Standing: `[MUST-STANDARD]` when a document says it (WCAG 1.4.1, 1.4.3, 1.4.11; the site
design system; the chapter's own numbers), `[MUST-LOCAL]` when this figure decides it,
`[SHOULD]` when it is worth the cost. Never write bare `[MUST]`.

Acceptance table: exactly one row per requirement, first cell the REQ id, no row without a
requirement, no requirement without a row. Method names a check a later session can run
(contrast computation, DOM assertion, element count, state sweep, non-author read).

## 7. Mechanical traps in check_spec.py

The script fails the file on any of these. Each cost a previous build a round trip:

1. Do not write the words clear, clean, modern, professional, appealing, balanced, or
   readable anywhere inside section 7. They are banned adjectives there even in a phrase
   like "clear the queue".
2. Do not write a number followed by "colours" in prose inside section 5, and do not write
   a number followed by "elements" in prose inside section 6. The script counts table rows
   and compares; a stale sentence fails the file. Describe the tables, do not total them.
3. No em dash, no en dash, anywhere. Use a comma, a colon, parentheses, or the word "to"
   for a range.
4. Section 6's view table needs a column literally named `element floor` with digits in
   every view row, and the inventory table's header row must start with `ID`.
5. Section 9b, when it does not start with `none:`, needs `- STATE:` and `- DATUM:` lines
   with content and at least one `INV-01` style invariant.
6. Sections 11 and 12 must exist, even if nearly empty.
7. Every REQ id in section 7 must appear in section 10 and the reverse; duplicates fail.

Run the audit before you report:

```bash
python3 /home/carloshnp/.hermes/skills/svg/illustration-spec/scripts/check_spec.py \
  /home/carloshnp/study-site/docs/figures/dsa-09-graphs/FIG-09-07-bfs-layers.md
```

Exit 0 with `0 findings` is the bar. Warnings about existing sections are tolerated; FAILs
are not.

## 8. Claim ledger

Every factual claim the figure will assert needs a row in section 4 or section 5 as
`claim status`, or a named source in section 7. Statuses: `chapter` (stated in the chapter,
with the section number), `verified` (recomputed from the given data), `derived` (follows
from a defined operation, name it), `unsourced` (never allowed in a requirement). The
sample-graph numbers in section 2 of this briefing are `verified` and need no further
source; anything else you compute yourself must say what you computed.

## 9. House style

- English throughout, matching the chapter. Vertex ids and variable names are code, keep
  them in backticks in prose and monospace in the figure.
- Direct sentences. No filler, no rhetorical questions, no second person imperative in
  requirements.
- No adjective does the work of a measurement. If a label must be legible, say the size.
- Numbers in figures never carry units that the chapter does not define. Edge weights are
  bare numbers, distances are bare numbers.
- Keep the file under 220 lines. A spec longer than that is hiding a decision it did not
  make.

## 10. Reporting back

Report, in this order: the file path, the audit result line, the view roster with element
counts per view from your own inventory table, every claim you could not source, and every
open question with the evidence that would settle it. Do not report success from the
existence of a file; report the audit output.
