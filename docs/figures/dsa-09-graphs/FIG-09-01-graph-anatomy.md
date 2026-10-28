# FIG-09-01: What a graph records

status: draft   rev: 1   date: 2026-10-22   author: illustration spec agent

## 1. Summary

One sheet in three bands. Band A draws the connected piece of the sample graph at the canonical coordinates with a degree chip beside every vertex. Band B draws the same five vertices and every one of A's seven edges as an oriented arc, one arc per edge, and gives `c` both an in-degree and an out-degree. Band C puts one weight on one edge and shows `w` alone, degree zero, with no line touching it. Each band declares its scale in its own label: A at 1.00, B at 0.75, C at 0.70. The sheet is the vocabulary of 9.1.1 as a picture to point at, before any algorithm appears.

MESSAGE = a graph records which vertices exist, which pairs are joined, in which direction, and at what cost, and a vertex with no edge is still a vertex.

## 2. Communicative intent

- AUDIENCE: a student revising for an exam, who has met arrays, stacks and queues, and who reads "graph" as "a picture of dots and arrows" without a name for any part.
- INTENDED CHANGE: understand. After the figure the reader can name vertex, edge, arc, degree, in-degree, out-degree, weight and isolated vertex, and can point at each one.
- READING CONTEXT: chapter 9.1.1, anchor section `911-what-a-graph-records`, after "A graph with no edges at all is called an empty graph, and its vertices are isolated.", in a column capped at 1120 px, light and dark, on a phone read in the site lightbox at 2x zoom. Neighbours on the page: the 9.1.1 definition paragraph above, FIG-09-02 below.
- REPRODUCTION: 1000 by 900 units, aspect 10:9, displayed up to 1050 CSS px wide, screen only.
- LIFETIME: the chapter's illustration system, not one talk.
- ASSUMPTIONS:
  1. The connected piece carries seven edges. The PLAN row said six in revision 1 and revision 2 corrects the row to seven, which the briefing edge set and the degrees agree with: s 2, a 4, b 3, c 3, t 2 sum to 14, twice seven.
  2. Coordinates are inherited from BRIEFING section 3; confirmed, and views B and C apply one uniform scale to them rather than a new layout. Each band states its factor in its own label: A 1.00, B 0.75, C 0.70.
  3. The directed view orients all seven edges of view A, one arc per edge: s to a, s to b, b to a, a to c, b to c, c to t, a to t. The chapter's five example arcs of 9.2.2 are the subset it shares, and `c` still takes in 2 and gives out 1, so no callout number moves (chapter 9.2.2).
  4. Type keeps its declared size in every view, so a reduced view never falls below 14 units; confirmed, BRIEFING section 4.
  5. The weight chip carries 4 on the edge `{s,a}`, the first weight 9.2.3 lists; confirmed, chapter 9.2.3.
  6. Canvas height 900 and a node budget of 380 are local: the briefing gives a ceiling for one view and for two panels, and this sheet carries three bands.

## 3. Goals and non-goals

- GOAL-1: a reader counts five vertices and seven edges in view A and reads five degrees off the chips without returning to the prose.
- GOAL-2: a reader points at `c` in view B and says which number is entering and which is leaving, and points at an arrowhead to name an arc.
- GOAL-3: a reader says what the 4 on the edge is, and that `w` has degree zero because no line reaches it.
- GOAL-4: the five vertices and the seven edges read as one layout across A and B, every edge still present as an arc, so the directed view is recognized as the same object with direction added.
- NON-GOAL-1: no cost of an adjacency list or an adjacency matrix, no space or query claim (FIG-09-02 owns the container trade).
- NON-GOAL-2: no components, no boundary, no membership block, no maximality (FIG-09-03).
- NON-GOAL-3: no cycle, and no arc that closes one (FIG-09-04).
- NON-GOAL-4: no distance value, no settled state, no traversal order, no relaxation (FIG-09-05, FIG-09-07, FIG-09-09).
- NON-GOAL-5: no pseudocode and no cost class.

## 4. Constraints

- canvas: viewBox `0 0 1000 900`, aspect 10:9; band A y 0 to 430, band B y 430 to 690, band C y 690 to 900; unit scale 1 unit = 1 CSS px at the 1000-unit reference width.
- coordinates: inherited from BRIEFING section 3, no redraw. View A is that table translated by (0, 40), factor 1.00. View B maps (x, y) to (80 + 0.75(x - 110), 500 + 0.75(y - 100)), factor 0.75. View C maps (x, y) to (130 + 0.70(x - 110), 740 + 0.70(y - 100)), factor 0.70; each is one uniform scale of the same table, a similarity and not a redraw. Node radius follows that scale: 22 in A, 16.5 in B, 15.4 in C. Every mapped coordinate is a constant in the source, not a runtime value.
- scale declaration: the three factors are 1.00, 0.75 and 0.70, stated here and repeated in the band label of the band they apply to, so no reader has to infer a scale from a diameter.
- node budget: 380 live elements for the sheet, which the inventory sits well below.
- palette budget: the four roles in section 5, no hue added.
- typography: Montserrat; 18 vertex id, 15 chip, 16 semibold panel label, 14 note, in all three views, nothing below 14.
- text split: prose in the chapter markdown; in-SVG labels are vertex ids, bare numbers, and labels of at most 24 characters on at most 2 lines.
- convention: flat schematic, one projection for the sheet.
- time appetite: one spec plus one build pass; the sheet asserts the edge count 7, the five degrees, the two counts on `c`, the weight 4 and the degree 0, and no other chapter number. The factors 1.00, 0.75 and 0.70 are drawing constants, not chapter claims.
- detail: full
- element floor: per view, in the section 6 view map.
- claim status: edge set and degrees verified (BRIEFING section 2); the seven arcs of view B derived, one per edge, with the chapter's five arcs of 9.2.2 as the subset (chapter 9.2.2); in-degree and out-degree of `c` derived, counted from those seven arcs; weight 4 chapter (9.2.3); position and degree of `w` verified (BRIEFING sections 2 and 3).
- boundaries: Always draw the seven edges, state the five degrees, and keep type at its declared size. Ask first before dropping a view or changing the canvas height. Never show a cycle, a component boundary, a distance value, or a representation cost.

## 5. Visual system lock

- projection: flat schematic, one sheet, one projection, declared once. No perspective, no isometric, no mixed view.
- line grammar: node outline 3.2; edge, arc and leader 1.6 (ratio 2:1 to the outline); chip border and band rule 1.0 hairline; arrowhead filled triangle 14 long and 10 wide, on arcs only, never on a leader; long dash 6 4 unused here.
- palette table, four roles, light in `:root` and dark in `.dark`, no raw hex inside the drawing:

  | NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
  |---|---|---|---|---|
  | ink | #15181e | #e8eaef | structure and primary text | vertex ids, degree and weight values, node outlines, panel labels |
  | muted | #5c6470 | #a3abba | meaningful secondary | edges, arcs, arrowheads, notes |
  | border | #e7eaf0 | #262b36 | decorative separation | chip borders, band rules |
  | card | #ffffff | #15181e | panel fill | node fill, chip fill, sheet ground |

- value plan: card is the ground, ink the darkest value, muted the only mid value, border the faintest. The strongest junction is a 3.2 ink outline against card, 17.78 light and 14.77 dark, and it sits on the discs of view A, the only band drawn at the reference factor 1.00, which holds five of the eight discs against five in B and three in C. No accent, success, warning, wash or accent-soft appears: no vertex is active, settled or contradicted here.
- scale discipline: A is 1.00, B 0.75, C 0.70, and each factor is printed in that band's own label. No requirement compares a length drawn in one band with a length drawn in another: the only cross band numbers are the factors themselves and counts of discs and chips. A and B are compared by shape and by which pairs are joined, never by measured distance, so they are not held to one factor.
- light: flat, no light source declared, no shadow, no gradient, no texture.
- detail floor: no meaningful mark below 1.0 units of stroke; no type below 14.
- style reference: none exists, no frame has been rendered; the chapter lock in BRIEFING sections 3 to 5 is the style source.

## 6. Content inventory

View map, one row per band, floor taken from the count column of the inventory below.

| view | job in the argument | depends on | element floor |
|---|---|---|---|
| A | undirected incidence and degree, the vocabulary the rest of the sheet reuses | none | 24 |
| B | the same five vertices with all seven edges oriented, and one vertex carrying both degree numbers | A | 22 |
| C | a number on an edge, and a vertex that no edge reaches | A | 12 |

Element inventory. `count` is the live nodes the row draws (circles, lines, paths, text); arrowheads are marker definitions and are not counted. The row `C-10` is one band label set on two lines, 15 and 20 characters, so the band keeps one label and no line runs past the cap.

| ID | element | count | job in the argument | must show | label | convention |
|---|---|---|---|---|---|---|
| A-01 | node discs | 5 | hold vertex identity and give every edge two visible ends | radius 22, card fill, 3.2 ink outline, at s (110,250) a (280,140) b (280,340) c (450,250) t (620,250) | none | circle |
| A-02 | vertex ids | 5 | name each vertex as the prose names it | 18 units ink, centred in A-01 | s a b c t | text, middle anchor |
| A-03 | edges | 7 | carry incidence, which pairs are joined | {s,a} {s,b} {a,b} {a,c} {b,c} {c,t} {a,t}, 1.6 muted, clipped at the disc outline | none | line, centre to centre |
| A-04 | degree chips | 5 | separate a degree from a vertex id and from a weight | 56 by 26 box, 1.0 border, card fill, near edge 14 units outside the outline, s left, a above, b and c below, t right | none | rect, square corner |
| A-05 | degree values | 5 | state each degree as a number | 15 units ink, s 2 a 4 b 3 c 3 t 2 | deg 2, deg 4, deg 3, deg 3, deg 2 | text, centred in A-04 |
| A-06 | panel label | 1 | name the band for the caption, and declare its factor | 16 semibold ink at (40, 42) | A undirected piece, 1.00 | text, start anchor |
| B-01 | node discs | 5 | show the same five vertices at the reduced scale | radius 16.5, card fill, 3.2 ink outline, at s (80,582.5) a (207.5,500) b (207.5,650) c (335,582.5) t (462.5,582.5) | none | circle |
| B-02 | vertex ids | 5 | keep the identity recognizable across A and B | 18 units ink, centred in B-01 | s a b c t | text, middle anchor |
| B-03 | arcs | 7 | carry direction, the whole difference from A, one arc per edge of A | s to a, s to b, b to a, a to c, b to c, c to t, a to t; 1.6 muted; filled 14 by 10 head at the target outline; no cycle | none | path, arrow marker |
| B-04 | in-degree chip | 1 | put the entering count on the vertex that receives most | 56 by 26 box, 1.0 border, card fill, 14 units above the c outline at (335, 539) | none | rect, square corner |
| B-05 | in-degree value | 1 | state the count of arcs entering c | 15 units ink | in 2 | text, centred in B-04 |
| B-06 | out-degree chip | 1 | put the leaving count beside the same vertex | 56 by 26 box, 1.0 border, card fill, 14 units below the c outline at (335, 626) | none | rect, square corner |
| B-07 | out-degree value | 1 | state the count of arcs leaving c | 15 units ink | out 1 | text, centred in B-06 |
| B-08 | panel label | 1 | name the band, and declare its factor | 16 semibold ink at (40, 474) | B directed arcs, 0.75 | text, start anchor |
| C-01 | node discs | 3 | hold the two ends of the weighted edge, and w | radius 15.4, card fill, 3.2 ink outline, at s (130,817) a (249,740) w (704,817) | none | circle |
| C-02 | vertex ids | 3 | name the two ends and the isolated vertex | 18 units ink, centred in C-01 | s a w | text, middle anchor |
| C-03 | edge segments | 2 | draw the one weighted edge with a gap for its value | 1.6 muted, from each disc outline to 6 units short of C-04 along the edge | none | line |
| C-04 | weight capsule | 1 | mark the number as a weight, not a distance label | 48 by 26, rx 13, 1.0 border, card fill, centred at (189.5, 778.5) on the edge | none | rect, rounded |
| C-05 | weight value | 1 | state the weight as a bare number, as the chapter does | 15 units ink | 4 | text, centred in C-04 |
| C-06 | w degree chip | 1 | give the isolated vertex its degree | 56 by 26 box, 1.0 border, card fill, 14 units above the w outline at (704, 774.6) | none | rect, square corner |
| C-07 | w degree value | 1 | say the number is a degree and that it is zero | 15 units ink | deg 0 | text, centred in C-06 |
| C-08 | edge note | 1 | stop the reader reading 4 as the drawn length of the edge | 14 units muted, start anchor at (196, 806) | weight, not a length | text |
| C-09 | w note | 1 | say why nothing is drawn between w and the edge | 14 units muted, middle anchor at (704, 852) | degree 0, no edge | text |
| C-10 | panel label, two lines | 2 | name the band and its factor across two short lines | 16 semibold ink at (40, 712) and (40, 728), 16 unit lead | two lines: C weighted edge, then and isolated w, 0.70 | text, start anchor, two lines |

## 7. Requirements

- REQ-FIG0901-01 [MUST-STANDARD] View A draws exactly seven edges, {s,a} {s,b} {a,b} {a,c} {b,c} {c,t} {a,t}, and no other edge (source: BRIEFING section 2, edge set E).
- REQ-FIG0901-02 [MUST-STANDARD] Every vertex in view A carries a chip outside the disc reading s 2, a 4, b 3, c 3, t 2 (source: BRIEFING section 2, degrees).
- REQ-FIG0901-03 [MUST-STANDARD] View B draws seven arcs, one for every edge of view A: s to a, s to b, b to a, a to c, b to c, c to t, a to t, each ending in a filled triangle 14 by 10 at the target outline, and no arc closes a cycle (source: BRIEFING section 2, edge set; chapter 9.2.2 for the five arcs it shares).
- REQ-FIG0901-04 [MUST-STANDARD] In view B, c alone carries both counts, in 2 above the disc and out 1 below it, each in its own chip (source: the seven arcs of view B, counted: in 2 from a and b, out 1 to t).
- REQ-FIG0901-05 [MUST-STANDARD] View C places one capsule reading 4 on the edge {s,a} and no number on any other edge (source: chapter 9.2.3; BRIEFING section 2, weights).
- REQ-FIG0901-06 [MUST-STANDARD] View C draws w at its canonical mapped position with a chip reading deg 0, and no line, path or arc within 14 units of its disc (source: BRIEFING sections 2 and 3; chapter 9.2.1).
- REQ-FIG0901-07 [MUST-STANDARD] Every number is carried by a shape and a label as well as by position: the weight is a rounded capsule on the edge, a degree is a square box outside the disc, and each holds its own text (source: WCAG 1.4.1; BRIEFING section 5, hue doubled by shape or label).
- REQ-FIG0901-08 [MUST-STANDARD] Text is ink on card at 17.78 light and 14.77 dark; edges, arcs and notes are muted on card at 5.98 and 7.7; border carries no edge and faint appears nowhere (source: WCAG 1.4.3 and 1.4.11; BRIEFING section 5 verified ratios).
- REQ-FIG0901-09 [MUST-STANDARD] Type is 18 for vertex ids, 15 for chip values, 16 for panel labels and 14 for notes in all three views, the reduced views changing geometry only (source: BRIEFING section 4, no exceptions).
- REQ-FIG0901-10 [MUST-LOCAL] Views B and C derive their geometry from the canonical table by the constants 0.75 and 0.70, never by a redrawn layout, and each band label prints its own factor, 1.00 in A, 0.75 in B, 0.70 in C (why: one graph, one layout, so bands are compared by shape and never by a measured distance).
- REQ-FIG0901-11 [MUST-LOCAL] View A is the dominant element: it is the only band at the reference factor 1.00, it carries five of the eight discs at the canonical radius 22, and it is the band the reading path enters first (why: the roster makes the undirected piece dominant).
- REQ-FIG0901-12 [MUST-LOCAL] No accent, success, warning, wash or accent-soft role appears in any band (why: no vertex is active, final or contradicted, and those roles belong to FIG-09-07 and FIG-09-09).
- REQ-FIG0901-13 [MUST-LOCAL] No boundary, enclosure, membership label or group frame is drawn in any band, and w is separated from the weighted edge by empty space alone (why: components belong to FIG-09-03).
- REQ-FIG0901-14 [MUST-STANDARD] In-SVG labels stay at or under 24 characters and 2 lines, and no sentence of prose appears inside the SVG (source: BRIEFING section 4, text split).
- REQ-FIG0901-15 [SHOULD] Every chip keeps at least 10 units of gap from any disc outline, edge or other chip (cost: one bounds assertion in the harness).
- REQ-FIG0901-16 [SHOULD] Two 1.0 border rules at y 430 and y 690 spanning x 40 to 960 separate the bands, and each band is labelled A, B, C at its top left (cost: two rules and one label per band; benefit: a caption can name a band).

## 8. Composition plan

- DOMINANT: the five vertex piece in view A.
- FOCAL MECHANISM: factor (1.00 against 0.75 and 0.70, so the same piece fills more of its band in A and less in B at one proportion, never a distance the reader measures), ink mass (five 3.2 outlines at the reference radius, the densest dark stroke cluster on the sheet), and position (first band, entered at the left).
- HIERARCHY: three levels. Level 1 the piece and its degree chips in A. Level 2 the arcs and the two callouts on c in B. Level 3 the weight capsule and the isolated w in C.
- READING PATH: entry at A's s and its chip at the left margin, along the edges to c, right to t, down across the rule to B's arrowheads, then to C's capsule and last to w at the right.
- BALANCE: asymmetrical. A's mass sits from x 18 to 712; B's from x 64 to 479, leaving the right of band B empty; C's is split between the weighted edge with its note at x 114 to 340 and w with its chip and note at x 644 to 772.
- FRAMING: three stacked bands, no drawn frame, 40-unit side margins, band rules stopping at 960, no disc cropped.
- NEGATIVE SPACE: the void of about 300 units between the edge note and the w note in band C is the absence of an edge and is not filled. The right of band B is empty because the directed view has no vertex after t.
- GROUPING: a chip sits 14 units from its own disc and never closer to another element, so each number reads as belonging to one vertex.

## 9. Build contract

- steps: 5. 0: rules and the three panel labels, each printing its own factor. 1: view A, edges, discs, ids, chips. 2: view B, the seven arcs and the arrowhead marker, then the two callouts on c. 3: view C, the edge segments, the capsule, w and the two notes. 4: assert the ids, the counts and the gaps.
- interaction: none. A vocabulary sheet has no state to drive.
- animation: none. Nothing here is a transition, and a still frame carries every claim.
- ids and classes: DOM ids equal the inventory ids; one class per role, `node`, `edge`, `arc`, `chip`, `chip-value`, `note`, `panel-label`, `band-rule`; palette through CSS variables only.
- verification hooks: `?view=A|B|C&audit=1` renders one band and prints the live element count and the chip gap table, so a reviewer can check one band without the other two.
- commands: audit this spec with `python3 /home/carloshnp/.hermes/skills/svg/illustration-spec/scripts/check_spec.py /home/carloshnp/study-site/docs/figures/dsa-09-graphs/FIG-09-01-graph-anatomy.md`. Render and sweep commands do not exist yet: no build has started, and nothing is swept because no value varies.

## 9b. Mechanism and state model

- STATE: none: every coordinate is placed, nothing is derived
- DATUM: not applicable, no derived coordinate
- DERIVED: none. The two scale constants in section 4 are folded into the placed coordinates.
- CHAIN: none
- INVARIANTS:
  - INV-01 no coordinate is computed from a state
  - INV-02 no chip lands within 10 units of a disc outline, an edge or another chip, in any band
  - INV-03 no in-SVG label exceeds 24 characters or 2 lines
- SAMPLED STATES: one, the drawn frame. A second sample would need a state that does not exist.
- SWEEP: not applicable, single state.
- FUTURE STATE: a later interactive revision would drive a hover or focus selection over one vertex, and the selected vertex's identity, its degree, and, in view B, its in-degree and out-degree would become the derived parts, while every disc, edge and chip stays placed.

## 10. Acceptance criteria

| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0901-01 | count of `line.edge` inside band A | exactly 7, endpoints matching the set | DOM assertion |
| REQ-FIG0901-02 | read the five A-05 text nodes | s 2, a 4, b 3, c 3, t 2 | non-author read |
| REQ-FIG0901-03 | count of `path.arc` and of marker ends | exactly 7 arcs, 7 heads, one arc per edge of A, no head on a leader | DOM assertion |
| REQ-FIG0901-04 | the two chips anchored on c | in 2 above, out 1 below, both on c only | DOM bounds test |
| REQ-FIG0901-05 | numbers drawn on edges in band C | one, the value 4, on {s,a} | DOM assertion |
| REQ-FIG0901-06 | elements within 14 units of the w disc | the disc, its id, its chip, the note, and no line | DOM bounds test |
| REQ-FIG0901-07 | shape and label pair for each number | 8 square chips and 1 rounded capsule, each with its own text | DOM assertion |
| REQ-FIG0901-08 | contrast of every text and stroke pair used | ratios at or above the briefing values, no faint or border as a stroke | contrast computation |
| REQ-FIG0901-09 | computed font size per class | 18, 15, 16, 14 only, in all three bands | DOM assertion |
| REQ-FIG0901-10 | mapped disc centres against the section 4 formulas, and the three band labels | the eight mapped centres (five in B, three in C) match to 0.1 unit, labels print 1.00, 0.75, 0.70 | geometry recompute |
| REQ-FIG0901-11 | factor, disc count and reading entry per band | A at 1.00 with five discs at radius 22 and entered first, B at 0.75, C at 0.70 | DOM assertion |
| REQ-FIG0901-12 | search for the five unused role variables | zero matches in the sheet | DOM assertion |
| REQ-FIG0901-13 | search for boundary, frame and membership marks | zero matches, w separated by space only | DOM assertion |
| REQ-FIG0901-14 | label lengths and line counts | every label at or under 24 characters and 2 lines | text measurement |
| REQ-FIG0901-15 | chip gap table from the harness hook | every gap at or above 10 units | bounds test |
| REQ-FIG0901-16 | the two band rules and three labels | rules at y 430 and 690 from x 40 to 960, labels A B C present | DOM assertion |

## 11. Open questions

- Q1 closed: the PLAN row said the piece had six edges in revision 1, and revision 2 corrects that row to seven, which the briefing edge set and the degree sum of 14 both confirm. The sheet draws seven and drops no edge, so no evidence is outstanding.
- Q2 closed: view B carried only the chapter's five arcs of 9.2.2 and now orients all seven edges of view A, one arc per edge, so the two bands share one edge set and no reader looks for `{a,b}` or `{a,t}`. FIG-09-04 keeps the five arcs, where the ordering argument needs no more.
- Q3: no rendered frame exists, so the two reduced factors are unverified by eye. Evidence: a G1 thumbnail at 10:9, where a 15.4 radius disc and an 18-unit id are checked for fit at factor 0.70.

## 12. Revision history

| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | First spec: three bands, four palette roles, sixteen requirements | G0 intake for FIG-09-01 |
| 2 | 2026-10-22 | View B orients all seven edges, floor 20 to 22; band labels print their factors 1.00, 0.75, 0.70; C-10 split to two lines; REQ-10 counts eight mapped centres; Q1 and Q2 closed | Audit: a directed view of a different edge set was not the same object, and three findings against the briefing |
