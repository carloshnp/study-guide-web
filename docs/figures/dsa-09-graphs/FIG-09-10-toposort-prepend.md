# FIG-09-10: Toposort by prepending
status: draft   rev: 2   date: 2026-10-22   author: figure spec agent

## 1. Summary
Two views of one procedure. View A runs TOPOSORT on the acyclic graph, and its dominant part is a list that grows by insertion at the left: one row per finish event, row r holding the list after r prepends, so the reader sees `t`, then `c t`, then `a c t`, then `b a c t`, then the final order `s b a c t`. A check strip beside the list tests all five arcs against the positions the final row prints, and every arc passes because the vertex that finishes last lands leftmost. View B adds the arc `t` to `s` to the same five vertices at the same coordinates and stops where the search stops: the arc meets an active vertex, the active set is the current path `s a c t`, the reported cycle is `s a c t s`, and no order is produced.

MESSAGE = the order comes from where each finished vertex is inserted, and the cycle comes from the same visit, so one procedure produces both outcomes.

## 2. Communicative intent
- AUDIENCE: a student revising for an exam, who can read Listing 9.4, knows DFS and the colour array from section 9.3.3, and believes a topological order is a separate algorithm.
- INTENDED CHANGE: believe that prepending on finish is the whole ordering argument, and be able to say which arc reports a cycle and why no order exists then.
- READING CONTEXT: inside section 9.3.5, `935-topological-order-and-cycle-detection`, after the sentence that closes the specification half of the chapter; column of 66ch, read in light and dark, on a phone in the site lightbox at 2x.
- REPRODUCTION: viewBox 0 0 1000 1140, aspect 1000:1140 (width : height), 1 unit = 1 CSS px at the 1000 unit reference width; displayed up to 1050 CSS px wide, which makes the sheet 1197 px tall, 117 px more than a 1080 px viewport, so the reader scrolls once between the end of A and the cycle in B; the height is kept because the five list rows at a pitch of 48, the five row check table and view B's active set column do not fit under 1000 units without dropping the check strip or the active set column, and both are protected by the boundaries line of section 4.
- LIFETIME: illustration system for the chapter, not one talk.
- ASSUMPTIONS: 1. the five arcs and the order `s b a c t` are the chapter's own and verified (confirmed, briefing section 2). 2. View A visits `a` before `b`, which is what makes `b` finish after `a` and land left of it (confirmed, recomputed: finish order `t`, `c`, `a`, `b`, `s`). 3. Both views scan the out-neighbours of `s` in the order `s:[a,b]`, so the search reaches the back arc along `s a c t` and view B reports `s a c t s` (confirmed, briefing section 2, which fixes the cycle per neighbour order and forbids mixing the two orders on one sheet). 4. Two panels only, since a third would read as a third algorithm (confirmed, roster).

## 3. Goals and non-goals
- GOAL-1: the reader can point at any row of view A and say which vertex had just finished and why it entered at the left edge.
- GOAL-2: the reader can check one arc against the digits of the final row and reach the verdict the check strip prints.
- GOAL-3: the reader can name the arc that closes the cycle in view B and the four vertices the active set holds when it closes.
- GOAL-4: the reader leaves knowing that a reported cycle and a produced order are two exits of one visit, not two algorithms.
- NON-GOAL-1: Kahn's algorithm, which the chapter does not present.
- NON-GOAL-2: the discover and finish intervals of 9.3.3, which FIG-09-08 owns.
- NON-GOAL-3: the O(V + E) cost argument, prose with no geometry.
- NON-GOAL-4: a proof that the order is valid; the figure shows the check, and the listing carries the induction.

## 4. Constraints
- canvas: viewBox 0 0 1000 1140; aspect 1000:1140 (width : height); 1 unit = 1 CSS px at the 1000 unit reference width, declared local; the height is a decision, declared, and REQ-FIG0910-16 carries its cost.
- node budget: 380 live nodes for a two-panel sheet; the inventory totals well under it.
- palette budget: roles from briefing section 5 only, no new hue, no literal hex inside the drawing; light hexes in `:root`, dark hexes in `.dark`.
- typography: Montserrat, self-hosted; sizes in canvas units 18, 16 semibold, 15, 14 only.
- text split: prose stays in the chapter; in-SVG text is a vertex id, a position digit or a two word label, at most 24 characters and at most 2 lines per label.
- convention: flat schematic, one projection, one sheet.
- time appetite: one revision after the first render; the cost is the list geometry, and the formulas in section 9b settle it.
- detail: full
- element floor: view A 28, view B 18, as written in the view map.
- boundaries: Always, keep the five arcs and the final order `s b a c t` verbatim, and keep the list as the growing element of view A. Ask first, dropping the check strip or the active set column, or changing the canvas width. Never, draw the cycle on a graph other than the traversed one, add Kahn's algorithm, or carry a meaning in a colour alone.
- claim status: the arcs `s` to `a`, `s` to `b`, `b` to `c`, `a` to `c`, `c` to `t`, the order `s b a c t` and the cycle `s a c t s` are `verified`, briefing section 2, which pairs that cycle with the neighbour order `s:[a,b]`.
- claim status: the finish order `t`, `c`, `a`, `b`, `s` and the digits 1 to 5 are `derived`, by running Listing 9.4 on those arcs with the neighbour order `s:[a,b]`, the adjacency order the briefing gives for this graph; the coordinates are `verified`, briefing section 3, translated by one offset per panel.

## 5. Visual system lock
- projection: flat schematic, one per sheet, declared once; no isometric, no perspective.
- line grammar: outline 3.2 on node rims and on a cell rim only when the rim encodes a state; panel frame 1.0 in border, never 3.2, because a frame separates and does not outline a subject; edge, connector and annotation 1.6, ratio 2 to 1; hairline 1.0 (check table rules); arrowheads are filled triangles 14 long and 10 wide, on directed arcs and flow pointers only, never on a leader.
- palette table, roles only:

  | NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
  |---|---|---|---|---|
  | ink | #15181e | #e8eaef | structure and primary text | node rims, vertex ids, row labels, check cells |
  | muted | #5c6470 | #a3abba | meaningful secondary | DAG arcs, older cell rims, headers, position digits |
  | faint | #8a92a0 | #7b8496 | aids only, never text | check table rules |
  | border | #e7eaf0 | #262b36 | decorative separation | panel frames |
  | card | #ffffff | #15181e | panel fill | panel and cell backgrounds |
  | wash | #f5f7fa | #111522 | code and table zebra | alternate check rows, finish badges |
  | accent | #1d4ed8 | #7aa2ff | active, current, examined | newest cell rim, path arcs, active rims |
  | accent-soft | #eef3fe | #16213c | active wash | newest cell fill, active set chips |
  | accent-ink | #14357f | #c7d6ff | text on accent-soft | ids in the newest cell and the chips |
  | success | #157347 | #4ade80 | final, settled, verified | finish badges, pass ticks, final row rim |
  | warning | #b42318 | #f87171 | contradiction, breakage | the arc `t` to `s`, the reported cycle |

- value plan: three foundation values (card, accent-soft, ink) with wash and border as separation aids; the strongest light and dark junction sits on the newest cell of the list, where the accent-soft fill meets its 3.2 accent rim, because that cell is the mechanism.
- light: flat, no light source, no shadow, no gradient; depth here is temporal, one state per finish event.
- detail floor: nothing meaningful below 14 units of type or 1.0 units of stroke.
- style reference: none rendered yet; the style source is briefing section 5.

## 6. Content inventory
View map. The floor is asserted by the harness, not estimated.

| view | job in the argument | depends on | element floor |
|---|---|---|---|
| A | the list grows by insertion at the left, and every arc of the finished graph lands left to right | none | 28 |
| B | the same visit meets an active vertex and reports a cycle instead of an order | A | 18 |

Element inventory. Canvas units on the 1000 by 1140 sheet. The count column gives live nodes per row; rows are grouped by element class.

| ID | element | job in the argument | must show | count | label | convention |
|---|---|---|---|---|---|---|
| CAP | two texts 48,26 and 48,46 | one label over both panels | 16 semibold, ink | 2 | one VISIT procedure / two outcomes | flat |
| A-PANEL | frame rect 24,64 w 952 h 660 | separates the order view | border 1.0, card fill | 1 | none | flat |
| A-LETTER | text 48,92 | names the view | "A", 16 semibold, ink | 1 | A | flat |
| A-NODE | five circles r 22 at the canonical coordinates offset +40,+34 | the five vertices of the DAG | ink 3.2, card fill | 5 | s a b c t | flat |
| A-ARC | five straight arcs, heads on the target rim | the arcs the order must respect | muted 1.6, head 14 by 10 | 5 | none | flat |
| A-FIN | five circles r 12 at vertex +24,-24 plus five texts | the finish index of each vertex | success 3.2 ring, wash fill, 14 ink | 10 | none | flat |
| A-ROW-L | five texts at 56, row centres | names the finish event behind each row | 15, ink | 5 | 1 t to 5 s | flat |
| A-HEAD | text 56,404 | names the left column | 14, muted | 1 | finish order | flat |
| A-CELL | fifteen rects w 72 h 44, radius 8 | the list at each stage | newest: accent-soft fill, accent 3.2 rim; older: card fill, muted 1.6 rim | 15 | none | flat |
| A-CELL-T | fifteen texts, centred | the ids in the list | 18 ink, accent-ink in the newest cell | 15 | none | flat |
| A-POS | five texts top right inside the final row | the position the check reads | 14, muted | 5 | none | flat |
| A-INS | five lines with heads from the row label to the left slot, plus one text | the insertion, entering at the left | muted 1.6, head 14 by 10; the word "prepend" 14 muted | 6 | prepend | flat |
| A-TBL | six hairlines x 600 to 940 and four header texts y 404 | the check table frame | faint 1.0, headers 14 muted | 10 | arc, from, to, forward | flat |
| A-TBL-R | twenty cell texts in five rows | one arc checked per row | 15 ink, wash zebra on rows 2 and 4 | 20 | none | flat |
| A-TICK | five tick paths in the check column | the verdict per arc | success 1.6 | 5 | none | flat |
| A-NOTE | text 600,672 | totals the check | 14, muted | 1 | 5 of 5 arcs forward | flat |
| B-PANEL | frame rect 24,744 w 952 h 360 | separates the cycle view | border 1.0, card fill | 1 | none | flat |
| B-LETTER | text 48,772 | names the view | "B", 16 semibold, ink | 1 | B | flat |
| B-NODE | five circles r 22, canonical coordinates offset +40,+710 | the same graph, not a second one | ink 3.2; accent 3.2 on the four active rims | 5 | s a b c t | flat |
| B-ARC | five DAG arcs plus t to s as an orthogonal route under the graph at y 1078, 3 segments | the path, and the arc that closes it | accent 1.6 on path arcs; warning 1.6 on t to s | 6 | none | flat |
| B-SET | four chips w 64 h 36 at x 730 plus four texts | the active set, in path order `s`, `a`, `c`, `t` | accent 3.2 rim, accent-soft fill, 18 accent-ink | 8 | `s a c t` | flat |
| B-BRACE | one brace path x 812 plus two texts | ties the chips into one object and names it | muted 1.6; 15 muted | 3 | active set is / the current path | flat |
| B-ORD | text 730,1024 | the order when the cycle is found | 14, muted | 1 | order empty | flat |
| B-CYC | text 730,1052 | the reported cycle | 16 semibold, warning | 1 | cycle s a c t s | flat |
| B-LBL | text 404,1056 | names the back arc | 15, warning | 1 | back arc t to s | flat |

## 7. Requirements
- REQ-FIG0910-01 [MUST-STANDARD] View A draws the five arcs `s` to `a`, `s` to `b`, `b` to `c`, `a` to `c` and `c` to `t`, one each, and the final list reads `s b a c t` left to right (source: chapter 9.3.5; briefing section 2, verified).
- REQ-FIG0910-02 [MUST-STANDARD] Insertion happens at the left only: in every row the newest cell occupies the left slot at x 150 and each earlier cell sits one pitch of 80 further right, and no cell is ever inserted elsewhere (source: chapter 9.3.5 line 21, "prepend u to order").
- REQ-FIG0910-03 [MUST-LOCAL] Row r of the list shows the list after r finish events, the rows read top to bottom in the finish order `t`, `c`, `a`, `b`, `s`, and each row label carries the index of its event (why: the row order is the only place the finish sequence is stated).
- REQ-FIG0910-04 [MUST-STANDARD] The check table has exactly five rows, one per arc, each printing the positions the final row shows, and every row satisfies from less than to (source: chapter 9.3.5, the postcondition that each arc points from an earlier vertex to a later one).
- REQ-FIG0910-05 [MUST-LOCAL] View B draws the arc `t` to `s` onto the active vertex `s` of the same five vertex graph, with `s`'s out-neighbours scanned in the order `s:[a,b]` as in view A, reports the cycle `s a c t s`, and shows the order holding no vertex (why: the reported cycle and the empty order are one frame of one run, and one sheet uses one neighbour order).
- REQ-FIG0910-06 [MUST-STANDARD] One label at the top of the sheet states that both outcomes come from the same VISIT procedure, set in 16 semibold, and no panel carries a second statement of it (source: roster row FIG-09-10, must show).
- REQ-FIG0910-07 [MUST-LOCAL] View B reuses the canonical coordinates translated by +40,+710 at the same unit scale, so no vertex moves between views and view B is a state of the object view A traverses (why: a redrawn graph would read as a second example).
- REQ-FIG0910-08 [MUST-STANDARD] Kahn's algorithm and every other ordering method is absent: no queue, no indegree count and no second list appears anywhere on the sheet (source: roster row FIG-09-10, forbidden list; chapter 9.3.5).
- REQ-FIG0910-09 [MUST-STANDARD] Type is 18, 16 semibold, 15 or 14 canvas units, and the smallest is 14, so no label renders below the chapter's note size (source: briefing section 4).
- REQ-FIG0910-10 [MUST-STANDARD] Node rims are 3.2 and a cell rim is 3.2 only where the rim carries a state, panel frames are 1.0 in border, connectors are 1.6 and hairlines 1.0, a ratio of 2 to 1 between outline and connector, and every arrowhead is a filled triangle 14 long and 10 wide on a directed arc or a flow pointer only (source: briefing section 5, line grammar).
- REQ-FIG0910-11 [MUST-STANDARD] Text meets 4.5 to 1 and meaningful strokes meet 3 to 1 against their surface, at the verified ratios: ink on card 17.78 light and 14.77 dark, muted on card 5.98 and 7.7, accent on card 6.7 and 7.14, accent-ink on accent-soft 10.23 and 11.0, success on card 5.87 and 10.2, warning on card 6.57 and 6.43, and faint at 3.13 carries no text (source: WCAG 1.4.3, 1.4.11; briefing section 5).
- REQ-FIG0910-12 [MUST-STANDARD] No meaning rides on hue alone: the newest cell also carries the insertion arrow and the word "prepend", the active vertices are also named in the active set column, and the arc `t` to `s` is also the only orthogonal route on the sheet and carries its own label (source: WCAG 1.4.1).
- REQ-FIG0910-13 [MUST-LOCAL] Every cell position, badge index, position digit and check verdict is computed from the finish index by the formulas of section 9b, and no such element is placed per frame (why: six frames drawn by hand drift, and the drift is invisible in one frame).
- REQ-FIG0910-14 [MUST-STANDARD] Each view reaches its element floor, A 28 and B 18, counted as live nodes under the view group with `querySelectorAll("*")` (source: briefing section 4, element floors).
- REQ-FIG0910-15 [MUST-LOCAL] No in-SVG label exceeds 24 characters or 2 lines, and no sentence of the chapter appears inside the drawing (why: a sentence competes with the list, and the list is the dominant element).
- REQ-FIG0910-16 [MUST-LOCAL] The sheet stays 1140 units tall, which is 1197 px at the 1050 px display width and 117 px more than a 1080 px viewport, and the caption states that the reader scrolls once between A and B; the height is not reduced because the five list rows at a 48 pitch, the five row check table and view B's active set column do not fit inside 1000 units without dropping one of them, and the boundaries line forbids dropping either (why: a declared cost is checkable, an undeclared one breaks on the lecturer's laptop).

## 8. Composition plan
- DOMINANT: the growing list in view A, five rows of up to five cells at a pitch of 80, 392 units wide and 236 tall, and the only place where a fill changes from row to row.
- FOCAL MECHANISM: value contrast, where the accent-soft newest cell meets its accent rim; isolation, the newest cell sits at the left edge with empty space to its left; detail density, 18 unit ids against 15 unit table text.
- HIERARCHY: three levels. The final row with its digits, then the newest cell of each row, then the check table and the view B set column.
- READING PATH: the caption, the graph and the badge on `t`, row 1 at the left slot, down the rows as each insertion pushes older cells right, the final row with digits 1 to 5, the check table, then view B and its cycle.
- BALANCE: asymmetrical. The list occupies x 150 to 542 and the check table x 600 to 940, 58 units apart, so the two columns read as one band.
- FRAMING: no crop; both panels closed by their frames; one unit scale on the sheet.
- NEGATIVE SPACE: the 48 unit band between the graph's lowest rim at y 356 and the list header at y 404 holds nothing, so the eye falls from the graph into row 1 without a break.
- GROUPING: rows 48 apart, cells inside a row 8 apart, so proximity is tighter inside a row than between rows, and the check table shares the row rhythm at 48.

## 9. Build contract
- steps: 4, one idea each. 0: both frames, the caption, the vertices and arcs of each view. 1: the empty list strip, the row labels and the column headers. 2: the six states of the list, the insertion arrows and the badges. 3: the check table and its ticks, then view B's active set column, the arc `t` to `s` and the cycle label.
- interaction: one step control over the finish index, six stops, because the argument is an insertion order and a single static frame shows one insertion only.
- animation: none by default; a reader who cannot step still gets the argument from the six rows being drawn at once.
- ids and classes: DOM ids equal the inventory IDs, prefixed `VIZ-`; one class per role (`r-ink`, `r-muted`, `r-faint`, `r-border`, `r-card`, `r-wash`, `r-accent`, `r-accent-soft`, `r-accent-ink`, `r-success`, `r-warning`), and one class per stage, `s-0` to `s-5`.
- verification hooks: `?state=0..5`, `?theme=dark`, `?view=A`, `?view=B`, `?audit=1`.
- commands: audit the spec with `python3 ~/.hermes/skills/svg/illustration-spec/scripts/check_spec.py docs/figures/dsa-09-graphs/FIG-09-10-toposort-prepend.md`; audit the chapter with `python3 docs/figures/dsa-09-graphs/verify_specs.py`; the render and sweep harness does not exist yet, which is open question 1.

## 9b. Mechanism and state model
- STATE: finish index `k`, integer, 0 to 5, step 1, default 0; one frame per finish event.
- STATE: `found` in view B, boolean, default false; when it is true the order holds no vertex.
- DATUM: `k` = 0 means no vertex has finished, so the list holds zero cells, no badge is drawn, all five vertices are unvisited, and the first badge at `k` = 1 belongs to `t`.
- DERIVED: `A-ROW-r` centre y = 432 + 48 (r - 1), visible for 1 <= r <= k.
- DERIVED: `A-CELL-k` left edge x = 150 + 80 (r - k) in row r, visible when k <= r, so a cell appears at 150 in its own row k and sits 80 further right in each later row; the rightmost cell, in row 5, starts at 470 and ends at 542.
- DERIVED: `A-CELL-T-k` drawn in accent-ink on accent-soft when k = r, in ink on card when k < r, which is the whole visible difference between newest and older.
- DERIVED: `A-FIN-v` index = 6 minus the position of v in the final row, so `t` 1, `c` 2, `a` 3, `b` 4, `s` 5; visible when that index <= k.
- DERIVED: `A-TBL-R-a` from = 6 - index(source), to = 6 - index(target), ticked when from < to; `A-NOTE` prints the count of ticked rows as "n of 5 arcs forward".
- DERIVED: `B-SET-i` chip top y = 812 + 48 (i - 1) for the i-th entry of the active path, and `B-CYC` prints the path from the target of the inspected arc round to its source and repeats that source at the end, so the arc `t` to `s` prints `s a c t s`.
- CHAIN: `k` -> row visibility -> cell x and cell role -> position digit -> from and to -> tick and note count; for view B, arc inspected -> active path -> chips -> cycle -> the order holding no vertex.
- INV-01 Every vertex enters the list exactly once: row r holds r distinct ids, and the final row holds the five ids `s`, `b`, `a`, `c`, `t` with no repeat.
- INV-02 Every arc of the finished graph points from an earlier to a later position: the pairs 1 to 3, 1 to 2, 2 to 4, 3 to 4 and 4 to 5 all satisfy from < to.
- INV-03 An arc to an active vertex never coexists with a complete order: whenever `found` is true, the order holds zero cells and view B draws no badge and no row.
- INV-04 The newest cell always occupies the left slot at x 150, no two cells in one row overlap, since the pitch of 80 exceeds the cell width of 72, and the rightmost cell edge on the sheet is 542.
- INV-05 No derived coordinate is NaN, and every cell, badge and text node stays inside its panel rect at every state.
- INV-06 The position digit of a cell equals 6 minus its finish index, so the check table can be read off the drawing without recomputation.
- SAMPLED STATES: `k` 0 for the datum; `k` 1 for the first insertion at the left edge; `k` 3 for mid growth, where two older cells have shifted twice; `k` 5 for the payoff, five cells and five ticked arcs; `found` true for the cycle frame of view B.
- SWEEP: every value of `k` from 0 to 5 and both values of `found`, driven by `?state=0..5` with `?audit=1`, asserting INV-01 to INV-06 at every state and reporting the first failing value; the harness path is open question 1.

## 10. Acceptance criteria
| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0910-01 | read the arc list and the final row | five named arcs once each, final row `s b a c t` | DOM assertion |
| REQ-FIG0910-02 | compute every cell x in every row from x = 150 + 80 (r - k) | newest at 150, pitch 80, rightmost edge 542, no other insertion point | state sweep |
| REQ-FIG0910-03 | read the five row labels top to bottom | `1 t`, `2 c`, `3 a`, `4 b`, `5 s` | DOM assertion |
| REQ-FIG0910-04 | parse the check table rows | five rows, positions equal to the final row digits, every pair from < to | DOM assertion |
| REQ-FIG0910-05 | read view B at the cycle frame | arc `t` to `s` on the active `s`, active chips `s` `a` `c` `t`, cycle `s a c t s`, order empty | non-author read |
| REQ-FIG0910-06 | count the top labels that mention VISIT | one label, two lines, 16 semibold | DOM assertion |
| REQ-FIG0910-07 | compare vertex coordinates across views | identical up to the declared offset, one unit scale | DOM assertion |
| REQ-FIG0910-08 | search the sheet for queue, indegree, second list | zero matches | DOM assertion |
| REQ-FIG0910-09 | read every font-size attribute | values drawn from 18, 16, 15, 14 | DOM assertion |
| REQ-FIG0910-10 | read stroke widths and head geometry | 3.2, 1.6, 1.0, heads 14 by 10, no head on a leader | DOM assertion |
| REQ-FIG0910-11 | compute contrast from the theme tokens in both themes | text at or above 4.5 to 1, strokes at or above 3 to 1 | contrast computation |
| REQ-FIG0910-12 | strip hue, then re-read each coloured element | arrow, column and label still identify every role | grayscale render, non-author read |
| REQ-FIG0910-13 | recompute each derived value from the formulas | every value matches the formula at all six states | state sweep |
| REQ-FIG0910-14 | count live nodes under each view group | A at least 28, B at least 18 | element count |
| REQ-FIG0910-15 | measure every text node | no label over 24 characters or 2 lines, no chapter sentence | script counting characters per node |
| REQ-FIG0910-16 | compute rendered height at 1050 width and read the caption | 1197 px, caption states one scroll, no panel tightened below 1000 units | geometry check |

## 11. Open questions
- Q1: which harness renders and sweeps chapter figures, and what are its flags. Evidence that settles it: the pipeline directory naming a figure render script.
- Q2: closed in rev 2. Both views scan `s`'s out-neighbours as `s:[a,b]`, so view B reaches the back arc along `s a c t` and reports `s a c t s`; the run with `s:[b,a]` is not drawn anywhere, since briefing section 2 forbids mixing the two orders on one sheet.
- Q3: whether the check table survives review or its five rows become five arcs over the final row. Evidence: a non-author read at 390 px.

## 12. Revision history
| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | Spec written for view A the growing list and its check, view B the back arc | First pass for FIG-09-10 |
| 2 | 2026-10-22 | cell formula corrected to x = 150 + 80 (r - k), view B moved to the one neighbour order `s:[a,b]` with cycle `s a c t s`, sheet height 1140 kept and its cost declared, panel frames set to border 1.0 | audit round |
