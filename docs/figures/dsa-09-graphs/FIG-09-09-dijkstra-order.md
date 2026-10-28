# FIG-09-09: Dijkstra settles in cost order

status: draft   rev: 2   date: 2026-10-22   author: illustration-spec agent

## 1. Summary

View A draws the weighted piece from `s` beside a five row extraction ladder, `s` 0, `b` 2, `a` 3,
`c` 8, `t` 11, with one relaxation arrow from `b` to `a` carrying `2 + 1 = 3`, which is why `a`
leaves the queue at 3 and not at the 4 that `s` first gave it, and a strip of the three queue
states. View B shrinks the argument to three vertices, adds the arc `2` to `1` of weight `-2`,
and shows the settled value 3 standing where the true value 2 belongs.

MESSAGE = Dijkstra settles in increasing key order because relaxation keeps every key honest, and one negative arc breaks that honesty.

## 2. Communicative intent

- AUDIENCE: a reader who has finished 9.3.3 and knows BFS layers, queue, and vertex ids; they can read a weighted graph and does not yet know why the weight precondition exists.
- INTENDED CHANGE: understand, and afterwards be able to state the loop invariant of Listing 9.3 and the precondition that protects it.
- READING CONTEXT: chapter 9.3.4, anchor section `934-dijkstra-for-weighted-shortest-paths`, after "The nonnegative weight precondition is not decoration: a negative edge can make a settled vertex suddenly reachable by a cheaper route, and the invariant would then be false."; article column of the study site; neighbours are FIG-09-07 and FIG-09-08, so weights in a priority queue must look unlike distances in a FIFO queue.
- REPRODUCTION: 1000 by 720 canvas units, aspect 25:18, displayed up to 1050 CSS px wide, read on a 390 px phone in the site lightbox at 2x zoom.
- LIFETIME: illustration system for the chapter.
- CAPTION AND ALT TEXT: the drawing prints `inf`, a three letter abbreviation, so the caption spells the chapter's `infinity` once and the alt text spells `infinity` once, and neither repeats the word.
- ASSUMPTIONS: 1. two views stacked on one canvas, A above B, confirmed by the roster row. 2. The sample piece is drawn at BRIEFING section 3 coordinates plus one translation of (0, 10), confirmed by BRIEFING section 3. 3. The interactive default is extraction 0 and the published frame is extraction 4, confirmed by the brief's state range and default. 4. View B does not read the state, because it is a separate three vertex graph, and the chapter's unvisited key is written `inf` here, since `infinity` twice would breach the 24 character label cap.

## 3. Goals and non-goals

- GOAL-1: a reader can read the extraction order off the ladder without reading the queue strip.
- GOAL-2: a reader can check the arithmetic `2 + 1 = 3` against the two drawn weights and the chip on `a`.
- GOAL-3: a reader can name the failing invariant after looking at view B's two chips.
- NON-GOAL-1: teaching how a binary heap works; the queue is a strip of keys, not a tree.
- NON-GOAL-2: proving the algorithm; the figure shows one trace and points at the listing.
- NON-GOAL-3: drawing the unreachable components `{u, v}` and `{w}`, which carry no weighted path, and comparing against Bellman-Ford, which the chapter does not present.

## 4. Constraints

- canvas: viewBox `0 0 1000 720`, aspect 25:18, 1 unit = 1 CSS px at the 1000 unit reference width, flat schematic, declared local.
- node budget: 380 live elements for a two panel figure and this plan spends 98; palette budget: the chapter's eleven role rows, no hue added.
- typography: Montserrat, self hosted by the site; vertex ids 18, distances, weights, callouts and queue rows 15, panel labels 16 semibold, headers 14, nothing below 14; the distance notation of BRIEFING section 4 is `d=0` and `inf` at 15 in every column, so the ladder distance column and the chips carry the same size.
- text split: prose stays in the caption; in SVG labels are ids, weights, keys, and words of one to three; 24 characters and 2 lines maximum per label.
- convention: flat schematic, one sheet, one projection; time appetite: one build pass plus one sweep, five states and not a timeline.
- detail: full
- element floor: A 36, B 16, from the view map in section 6.
- boundaries: Always run the audit and the state sweep before reporting. Ask first to drop a view, change the canvas width, or move the ladder. Never a negative weight in view A, a second procedure in view B, or a key without a ledger row.
- claim status: settle order and keys `verified` (BRIEFING section 2). Seven weights `verified` (BRIEFING section 2). View B settled 3 and true 2 `verified` (BRIEFING section 2). Contrast ratios `verified` (BRIEFING section 5). Queue contents after extractions 0, 1, 2 `derived`: recomputed here from Listing 9.3 with those weights, giving `{b 2, a 4, c inf, t inf}`, `{a 3, c 10, t inf}`, `{c 8, t 13}`. The key 4 on `a` before `b` relaxes it `derived`, same trace. Canvas positions of the ladder, strip and view B `derived`, declared local in sections 8 and 9. No claim in this file is `unsourced`.

## 5. Visual system lock

- projection: flat schematic, one per sheet.
- line grammar: outline 3.2, edge, arc, connector and annotation 1.6, hairline 1.0, panel frame 1.0 in border and never 3.2, because a frame separates and does not outline a subject. Arrowheads filled triangle 14 long, 10 wide, on the relaxation arrow and on view B's three arcs, never on a leader.
- palette, roles not swatches, light hexes in `:root` and dark hexes in `.dark`, no raw hex inside the drawing:

| NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
|---|---|---|---|---|
| ink | #15181e | #e8eaef | structure and primary text | ids, weights, keys, panel labels |
| muted | #5c6470 | #a3abba | meaningful secondary | edges, arcs, leaders, queue strips |
| faint | #8a92a0 | #7b8496 | aids only, never text | empty ladder slots, pending rows |
| border | #e7eaf0 | #262b36 | decorative separation | panel frames, ladder slot rules |
| card | #ffffff | #15181e | panel fill | both panels, ladder bands |
| wash | #f5f7fa | #111522 | table zebra | alternate queue rows |
| accent | #1d4ed8 | #7aa2ff | current, examined | relaxation arrow, current ladder row edge |
| accent-soft | #eef3fe | #16213c | active wash | filled ladder band, arithmetic strip |
| accent-ink | #14357f | #c7d6ff | text on accent-soft | arithmetic label, filled row keys |
| success | #157347 | #4ade80 | final, settled | settled rings, ladder keys, chip 3 in B |
| warning | #b42318 | #f87171 | contradiction | arc `2` to `1`, chip 2 in B, struck key 4 |

- value plan: card, wash and accent-soft as the three foundation values, ink as the darkest text; the strongest junction sits on the ladder, where a filled accent-soft band and a 15 unit ink key meet card.
- light: flat, no light source, no shadow, no gradient, depth is temporal; detail floor: no meaningful mark below 1.0 and no text below 14.
- style reference: none rendered yet; this spec is the source, and BRIEFING section 5 is the palette source of record.

## 6. Content inventory

| view | job in the argument | depends on | element floor |
|---|---|---|---|
| A | the settle order is the algorithm, and relaxation is what keeps each key honest | none | 36 |
| B | one negative arc makes a settled key wrong, so finality is conditional | A | 16 |

| ID | element | job in the argument | must show | live | label | convention |
|---|---|---|---|---|---|---|
| A-01 | panel A frame | separates settlement from the breaker | border 1.0 on card, x 40 y 56 w 920 h 414 | 1 | none | flat |
| A-02 | panel A label | names the view at the entry of the reading path | 16 semibold at (60, 82) | 1 | `A  settle, then relax` | flat |
| A-03 | vertex nodes and id labels | the five vertices of the piece | circles r 22 at canonical coords plus (0, 10), ids at 18 | 10 | `s a b c t` | flat |
| A-04 | weighted edges | the seven weights the arithmetic reads | 1.6 muted lines, no heads | 7 | none | flat |
| A-05 | weight labels | the numbers in `2 + 1 = 3` | 15, 16 units above the edge midpoint | 7 | `4 2 1 5 8 3 10` | flat |
| A-06 | settled rings | settled status as a shape, not a hue | outer ring r 27, success 1.6, one per settled vertex | 5 | none | flat |
| A-07 | distance chips | each vertex's current key | rect 44 by 24 plus key at 15, right of the node | 10 | keys | flat |
| A-08 | relaxation arrow | `b` lowers the key of `a` | 1.6 path b to a with 14 by 10 head, accent | 1 | none | flat |
| A-09 | relaxation arithmetic | why the promise can be kept | `2 + 1 = 3` at 15, accent-ink on accent-soft | 1 | `2 + 1 = 3` | flat |
| A-10 | struck previous key | `a` held 4 before `b` relaxed it | `4` at 15 with a 1.0 strike hairline | 2 | `4` | flat |
| A-11 | ladder slots | the five extraction positions, visible before they fill | rect 240 by 44, faint 1.0 rule, x 700 | 5 | none | flat |
| A-12 | ladder filled bands | which extractions have happened | accent-soft fill on rows 0 to e | 5 | none | flat |
| A-13 | ladder step labels | the extraction index | 15 at x 716, rows 0 to 4 | 5 | `0 1 2 3 4` | flat |
| A-14 | ladder vertex labels | which vertex leaves the queue | 18 at x 760 | 5 | `s b a c t` | flat |
| A-15 | ladder distance labels | the key at extraction, which is the settled distance | 15 at x 900, success | 5 | `0 2 3 8 11` | flat |
| A-16 | ladder column header | names the three columns once | 14 at y 92, x 700 to 940 | 1 | `step vertex dist` | flat |
| A-17 | queue rows | the keys still queued after extractions 0, 1, 2 | 3 rows of label at 15 plus contents at 15, x 60 y 396 to 444 | 6 | `after 0` to `after 2` | flat |
| B-01 | panel B frame | isolates the breaker from the sample | border 1.0 on card, x 40 y 490 w 920 h 210 | 1 | none | flat |
| B-02 | panel B label | names the second view | 16 semibold at (60, 524) | 1 | `B  one negative arc` | flat |
| B-03 | vertices and id labels | the three vertices of the counterexample | circles r 22 at (170, 596), (600, 556), (600, 660), id at 18 centred | 6 | `0 1 2` | flat |
| B-04 | arcs | the three directed arcs | 1.6 with heads; the `2` to `1` arc also long dash 6 4 in warning | 3 | none | flat |
| B-05 | weight labels | the weights, including the only negative value in the file | 15 beside each arc midpoint | 3 | `3 4 -2` | flat |
| B-06 | final chip | the value Dijkstra committed to | rect 44 by 28 at (700, 556), solid success outline, `3` at 15 | 2 | `3` | flat |
| B-07 | contradiction chip | the value the graph allowed | rect 44 by 28 at (700, 636), dashed warning outline, `2` at 15 | 2 | `2` | flat |
| B-08 | chip leaders | bind each chip to its arc or vertex | 1.6 muted, no head, 12 unit gap at the target | 2 | none | flat |
| B-09 | invariant line | names the invariant that fails | 15 ink at (60, 680) | 1 | `settled 3 is not final` | flat |

## 7. Requirements

- REQ-FIG0909-01 [MUST-STANDARD] View A draws the connected piece at the BRIEFING section 3 coordinates plus one translation of (0, 10), with all seven weights 4, 2, 1, 5, 8, 3 and 10 at size 15. (source: BRIEFING section 3 and section 2 weights, verified)
- REQ-FIG0909-02 [MUST-STANDARD] The ladder carries five rows in the order `s` 0, `b` 2, `a` 3, `c` 8, `t` 11, one row per extraction, step labels 0 to 4 at 15, vertex id at 18 and distance at 15 in the chapter's distance notation. (source: BRIEFING section 2 settle order and section 4 distance notation, verified)
- REQ-FIG0909-03 [MUST-STANDARD] The relaxation is one arrow from `b` to `a` with a filled head 14 by 10, labelled `2 + 1 = 3` at 15 on accent-soft. (source: BRIEFING section 2, verified)
- REQ-FIG0909-04 [MUST-STANDARD] Vertex `a` carries the struck key 4 and the current key 3, and the strike is a 1.0 hairline, so the improvement is carried by shape as well as value. (derived: the trace in section 4)
- REQ-FIG0909-05 [MUST-STANDARD] The queue strip carries exactly three rows: extraction 0 `b 2, a 4, c inf, t inf`, extraction 1 `a 3, c 10, t inf`, extraction 2 `c 8, t 13`. (derived: Listing 9.3 over the section 2 weights)
- REQ-FIG0909-06 [MUST-STANDARD] No weight drawn in view A is negative, and the smallest weight in view A is 1. (source: brief forbidden list, BRIEFING section 2)
- REQ-FIG0909-07 [MUST-STANDARD] View B draws vertices 0, 1, 2 with arcs 0 to 1 weight 3, 0 to 2 weight 4, and 2 to 1 weight -2, heads on all three, the -2 arc also long dashed 6 4. (source: BRIEFING section 2 negative breaker, verified)
- REQ-FIG0909-08 [MUST-STANDARD] View B places the settled value 3 in the success role with a solid chip outline and the true value 2 in the warning role with a dashed chip outline, so neither value depends on hue. (source: WCAG 1.4.1, BRIEFING section 5)
- REQ-FIG0909-09 [MUST-STANDARD] View B carries exactly one sentence of prose, `settled 3 is not final` at 15, naming the invariant that fails. (source: BRIEFING section 2 finality)
- REQ-FIG0909-10 [MUST-STANDARD] View B carries no queue, no ladder, no extraction index and no second procedure. (source: brief forbidden list)
- REQ-FIG0909-11 [MUST-STANDARD] Type sizes are 18 for vertex ids, 15 for distances, weights, callouts and queue rows, 16 semibold for panel labels and 14 for headers, with nothing below 14; every distance in the sheet, the ladder column and the chips in both views, is 15. (source: BRIEFING section 4)
- REQ-FIG0909-12 [MUST-STANDARD] Faint carries no text and border carries no meaningful stroke; every meaningful stroke uses muted or a stronger role, and both panel frames are 1.0 in border, never 3.2. (source: BRIEFING section 5 verified contrast and line grammar)
- REQ-FIG0909-13 [MUST-STANDARD] Every in SVG label is at most 24 characters over at most 2 lines, and no prose sentence enters the drawing except the invariant line in B. (source: BRIEFING section 4)
- REQ-FIG0909-14 [MUST-LOCAL] The ladder is the dominant element: five 44 unit rows with 8 unit gaps from y 100 to 352 in the column x 700 to 940, filled rows on accent-soft, the tallest block in A. (why: the extraction order is the algorithm)
- REQ-FIG0909-15 [MUST-STANDARD] Every position, label and visibility in both views comes from the section 9b model at extraction index e, and the published frame is the same function at e = 4. (source: illustration-spec section 9b)
- REQ-FIG0909-16 [MUST-STANDARD] At every e from 0 to 4, INV-01 to INV-07 hold, and the sweep names the first failing e by value. (source: section 9b)
- REQ-FIG0909-17 [SHOULD] View B is drawn after A at the same unit scale and its caption names A as its parent, at the cost of one caption line. (why: the reader never sees the two views side by side)
- REQ-FIG0909-18 [MUST-STANDARD] The caption spells the chapter's `infinity` once, because the drawing prints `inf` in the chips and the queue strip, and the alt text spells `infinity` once as well, so the abbreviation is expanded exactly once in each of the two texts and never left unexplained. (source: BRIEFING section 4 distance notation; WCAG 1.1.1)

## 8. Composition plan

- DOMINANT: the extraction ladder in A, a 240 by 252 block of five bands on the right, against a loose graph on the left and a thin queue strip below.
- FOCAL MECHANISM: isolation (80 units of card between the ladder and the graph), value contrast (accent-soft band with a 15 unit ink key), convergence (the single relaxation arrow crossing the gap from `b` to `a`).
- HIERARCHY: level 1 the ladder, level 2 the graph with its chips, level 3 the queue strip and view B.
- READING PATH: entry at the ladder step column, down the five rows to `t` 11, left across the relaxation arrow to the chips on `a`, down to the queue strip, then to B's two chips and the invariant line.
- BALANCE: asymmetrical, ladder mass on the right of A answered by the three row queue strip across the full width below it.
- FRAMING and NEGATIVE SPACE: two frames of 920 units width, A 414 tall and B 210 tall, 20 units of card between them, no crop of any node; the 80 unit gutter between graph and ladder keeps the arrow its only crossing line, and the empty half of B holds the invariant line.
- GROUPING: ladder rows 8 apart inside the ladder and 20 or more from the queue strip; the two chips in B sit 80 apart, each bound to its own feature by a leader.

## 9. Build contract

- steps: 5 states of one function. 0: `s` settled at 0, one filled row, `a` at 4 unstruck, arrow hidden. 1: `b` settled at 2, arrow and `2 + 1 = 3` appear, `a` restruck at 3. 2: `a` settled at 3, `c` at 8 and `t` at 13. 3: `c` settled at 8, `t` drops to 11. 4: `t` settled at 11, all five rows filled.
- interaction: one step control over e, 0 to 4, because the reader must see the key change rather than read it; animation: none, the five states are static frames.
- ids and classes: DOM ids equal inventory IDs with a `VIZ-` prefix; one class per role, `is-settled`, `is-current`, `is-pending`, `is-contradiction`.
- verification hooks: `?e=0` to `?e=4` forces a state, `&audit=1` prints element counts per view and asserts every invariant.
- commands: `python3 /home/carloshnp/.hermes/skills/svg/illustration-spec/scripts/check_spec.py FIG-09-09-dijkstra-order.md`; `python3 verify.py --fig FIG-09-09 --sweep e=0..4 --assert INV-01..INV-07`; `python3 verify.py --fig FIG-09-09 --shot e=4 --out build/fig-09-09.png`, with verify.py written in the same build.

## 9b. Mechanism and state model

- STATE: extraction index `e`, unitless integer, 0 to 4, step 1, default 0.
- DATUM: `e` = 0 is the state immediately after extraction 0, so `s` is settled at 0 and the queue holds `b` 2, `a` 4, `c` inf, `t` inf; every later value counts extractions from that one, and the published frame is `e` = 4.
- RULE: state 0 comes after extraction 0 and not before it, so every chip array holds exactly five entries, one per state 0 to 4, and no array carries a pre-extraction placeholder: `a` reads 4 and `b` reads 2 at state 0, while `c` and `t` read `inf` there because that is the key they really hold.
- DERIVED, one formula per element:
  - A-12 filled bands: rows 0 to `e` filled, rows `e + 1` to 4 on card, count `e + 1`.
  - A-15 distance labels: label at row k = `key[k]` for k <= `e`, no text for k > `e`, with `key` = 0, 2, 3, 8, 11.
  - A-06 settled rings: one ring at `ladder[k]` for k = 0 to `e`, count `e + 1`.
  - A-07 chips: `chip(v, e)` = the key of `v` after extraction `e`, listed as five values for `e` = 0 to 4: `a` 4, 3, 3, 3, 3; `b` 2, 2, 2, 2, 2; `c` inf, 10, 8, 8, 8; `t` inf, 13, 11, 11, 11; `s` 0 at every `e`, because extraction 0 is the extraction state 0 is named after.
  - A-08, A-09 and A-10: visible for `e` >= 1, hidden at `e` = 0, where the chip on `a` reads 4 unstruck and no arrow exists.
  - A-17 queue rows: row k visible for k <= min(`e`, 2), contents from the three strings in REQ-FIG0909-05.
  - A-01, A-02, A-04, A-05, A-11, A-13, A-14, A-16 and all of view B are placed and do not move with `e`.
- CHAIN: `e` -> settled set `ladder[0..e]` -> ladder bands and keys (A-12, A-15) -> rings and chips (A-06, A-07, A-10) -> queue rows (A-17); the arrow (A-08, A-09) hangs off the settled set once `b` is in it.
- INVARIANTS:
  - INV-01 no chip key in view A rises as `e` rises; per vertex the sequence is non increasing.
  - INV-02 in every queue row, each key shown is at least the key of the vertex its extraction settled: row 0 shows 2 and 4 against `s` at 0, row 1 shows 3 and 10 against `b` at 2, row 2 shows 8 and 13 against `a` at 3.
  - INV-03 no weight drawn in view A is negative; the only negative label in the file is view B's -2.
  - INV-04 ladder keys do not decrease down the ladder: 0 <= 2 <= 3 <= 8 <= 11.
  - INV-05 exactly `e + 1` ladder rows carry both a filled band and a distance text at state `e`.
  - INV-06 view B is state independent, and its contradiction value stays strictly below its final value: 2 < 3.
  - INV-07 every text node stays inside its panel frame with at least 12 units of clearance.
- SAMPLED STATES: `e` = 0 (datum, arrow hidden, `a` reads 4), `e` = 1 (first relaxation, struck 4 appears), `e` = 2 (`a` settles, `t` first appears at 13), `e` = 3 (`c` settles, `t` drops to 11), `e` = 4 (published frame, all five rows filled).
- SWEEP: every value `e` = 0 to 4, run by `verify.py --fig FIG-09-09 --sweep e=0..4`, first failing state reported by value.

## 10. Acceptance criteria

| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0909-01 | measure node centres and weight labels | each centre equals the canonical pair plus (0, 10) within 0.5 units; seven weights present | DOM assertion |
| REQ-FIG0909-02 | read the ladder rows in DOM order | five rows, order `s` 0, `b` 2, `a` 3, `c` 8, `t` 11, step labels 0 to 4, vertex ids at 18 and distances at 15 | DOM assertion |
| REQ-FIG0909-03 | inspect the arrow path and its label | one head, source `b`, target `a`, label text `2 + 1 = 3` | DOM assertion |
| REQ-FIG0909-04 | inspect the `a` chip at e = 1 and e = 4 | key 3 present at both, struck 4 present, strike is a 1.0 line | DOM assertion |
| REQ-FIG0909-05 | read the queue strip | three rows, strings equal those in the requirement, in that order | DOM assertion |
| REQ-FIG0909-06 | scan every weight label in A | no negative number; minimum is 1 | text scan |
| REQ-FIG0909-07 | inspect arcs and weight labels in B | three arcs with heads, weights 3, 4, -2, the -2 arc long dashed | DOM assertion |
| REQ-FIG0909-08 | inspect chip outlines | 3 solid success, 2 dashed warning, both readable in grayscale | grayscale check |
| REQ-FIG0909-09 | count prose strings in B | one string, equal to `settled 3 is not final`, at size 15 | text scan |
| REQ-FIG0909-10 | count structures in B | zero queue rows, zero ladder rows, zero step labels | DOM assertion |
| REQ-FIG0909-11 | read every font size attribute | set is a subset of 14, 15, 16, 18, none below 14 | DOM assertion |
| REQ-FIG0909-12 | inspect text fills and stroke width per role | no text on faint, no 1.0 stroke on a meaningful edge | contrast computation |
| REQ-FIG0909-13 | measure label lengths | every label at most 24 characters and 2 lines | text scan |
| REQ-FIG0909-14 | compare block bounding areas and fills | ladder is the tallest block in A, its area above every other block, filled rows on accent-soft | geometry check |
| REQ-FIG0909-15 | render e = 0 to 4 from one function | published frame equals the render at e = 4 frame for frame | state sweep |
| REQ-FIG0909-16 | run the sweep | INV-01 to INV-07 hold at every e, or the first failing e is reported | state sweep |
| REQ-FIG0909-17 | inspect caption and unit scale | caption names A as parent, unit scale equal in both views | non-author read |
| REQ-FIG0909-18 | read the caption and the alt text | `infinity` appears once in each, and `inf` appears only inside the drawing | text scan |

## 11. Open questions

- Q1: should the queue strip carry extraction 3 (`t` 11) as a fourth row, which would close the trace at the cost of 30 units of panel height? Owner: the requester, evidence: the paragraph length at the insertion point.
- Q2: closed in rev 2. The drawing keeps `inf` at 15 units and the caption and the alt text each spell `infinity` once, so the abbreviation is expanded outside the drawing and the 24 character label cap is still met.
- Q3: does view B need a third chip for vertex 0 at 0, to show the source, or does the arc weight 3 already imply it? Evidence: a non-author read of the finished view.

## 12. Revision history

| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | first draft | roster row FIG-09-09 |
| 2 | 2026-10-22 | state 0 fixed after extraction 0 with five entry chip arrays, ladder and chip distances to 15, panel frames to border 1.0, 9.3.4 anchor and caption added | audit round |
