# FIG-09-02: Two representations, two costs
status: draft   rev: 2   date: 2026-10-22   author: illustration-spec agent

## 1. Summary

The sheet stores the whole sample graph twice, as an adjacency list of eight key rows and as an adjacency matrix of eight rows by eight columns, with a bottom strip setting the two containers against each other on space and on query. Both views carry the same eight vertices, `s` `a` `b` `c` `t` `u` `v` `w`, in the same order, so every number the strip prints is countable on the panel above it: the list holds 16 entries, the grid holds 64 cells, 16 of those cells carry a mark and 48 carry nothing.

MESSAGE = the list pays once per edge end, the matrix pays for every pair, and the 16 cells that record an edge are bought with 48 that record nothing.

## 2. Communicative intent

- AUDIENCE: a student revising for an exam, who can read pseudocode, has met stacks, queues and heaps in chapters 4 and 5, and has read section 9.1.1 once.
- INTENDED CHANGE: from "two ways to store a graph, pick either" to "each container is a cost curve, and the matrix's cost is quadratic in a quantity the edges never use".
- READING CONTEXT: chapter 9.1.1, anchor section `911-what-a-graph-records`, after the paragraph ending "...both appear in the Dasgupta, Papadimitriou, Vazirani text beside the decompositions that use them.", in a column capped at 1120 px, light and dark, phone read in the site lightbox at 2x zoom.
- REPRODUCTION: 1000 unit flat schematic at 1000 by 780, rebuilt from the inventory in section 6, no external asset and no photograph.
- LIFETIME: illustration system for the chapter
- ASSUMPTIONS: 1. Both views and the strip count the whole sample graph, V 8 and E 8, so the arithmetic is 2E = 16 entries, 2E = 16 filled cells, V times V = 64 cells and 64 minus 16 = 48 empty, fixed once in section 6; the five vertex piece is not drawn and no count describes it. 2. The neighbour order inside each row is the chapter's adjacency order, given in the brief of this revision. 3. O(V+E), O(V squared) and the O(1) join test are chapter 9.1.1; the list answering a join test by scanning one row is derived from the adjacency list definition and logged in section 4. 4. Type sizes are the chapter's, nothing below 14 canvas units. 5. The 1000 vertex graph of exercise 2 is out of scope, as PLAN.md open question 2 decides.

## 3. Goals and non-goals

- GOAL-1 The reader can count the list's 16 entries and the grid's 16 marks on the sheet and see that both count the same eight edges.
- GOAL-2 The reader can point at one filled cell and at its mirror and say that the same edge is stored twice, once in each half.
- GOAL-3 The reader can say that the grid spends 48 cells on pairs that are not edges, against a list that spends nothing on them.
- GOAL-4 The reader can say which container answers a join test in one cell and which must scan a row.
- NON-GOAL-1 No traversal state: BFS, DFS and Dijkstra belong to FIG-09-07 to FIG-09-09.
- NON-GOAL-2 No weight is drawn or claimed; weights belong to FIG-09-05 and FIG-09-09.
- NON-GOAL-3 No petgraph family comparison; that argument is a table, not this sheet.
- NON-GOAL-4 No directed graph, so no in-degree and out-degree count appears.

## 4. Constraints

- canvas: viewBox `0 0 1000 780`, aspect 1000:780, three views on one sheet.
- node budget: 380 live nodes, the two panel allowance of BRIEFING section 4 taken as the cap for this three view sheet; the inventory sums to 162.
- palette budget: the palette rows in section 5 are the only paints; no hue is added, and no hue carries a count.
- typography: Montserrat, self hosted; vertex id 18, panel label 16 semibold, value and callout 15, note 14.
- text split: prose stays in the chapter markdown; in-SVG labels are vertex ids, the printed counts, the two asymptotes and one to three word notes, 24 characters maximum, 2 lines maximum.
- convention: flat schematic, one sheet, one projection, no perspective and no depth.
- time appetite: half a day for the build and one review pass.
- detail: full
- element floor: 43 in A, 101 in B, 18 in C, read from the inventory in section 6.
- boundaries: this file only; no edit under `content/`, `web/`, `pipeline/`, `data/`, and no other spec.
- coordinates: no vertex is drawn, so the canonical node table of BRIEFING section 3 supplies only the vertex order `s`, `a`, `b`, `c`, `t`, `u`, `v`, `w`; the two panel boxes and the strip are placed here (A 32 to 432, B 458 to 968, both y 56 to 580, strip 32 to 968 from y 610 to 740).
- claim status: 8 vertices, 8 edges, degrees s 2, a 4, b 3, c 3, t 2, u 1, v 1, w 0, sum of degrees 16, neighbour lists of 2, 4, 3, 3, 2, 1, 1, 0, all `verified` from BRIEFING section 2.
- claim status: 2E = 16 entries, V squared = 64 cells, 16 filled cells, 64 minus 16 = 48 empty cells, `derived`, arithmetic stated once in section 6.
- claim status: O(V+E) space, O(V squared) space and the O(1) join test are `chapter`, section 9.1.1; the list answering the join test by scanning the row of one endpoint, so O(degree), is `derived` from that section's definition, named as the operation.

## 5. Visual system lock

- projection: flat schematic, front on, one sheet, no depth, no shadow.
- line grammar: panel frame 1.0 in `border`, never 3.2, because a frame separates and does not outline a subject; no 3.2 outline appears at all, because no vertex is drawn; cell rule and table rule 1.0 in `border`; half divider 1.0 in `muted`, solid, never dashed; leader and text connector 1.6 in `muted`; filled cell mark 1.6 in `ink`; no chip is used; no arrowhead, because nothing flows.
- dash: no dashed stroke appears on this sheet. The dash meaning "secondary or not counted" is therefore unused, and every element is either labelled or distinguished by position, so nothing asks the reader to infer a meaning from a stroke pattern.
- palette: role names only, light hex in `:root`, dark hex in `.dark`, no raw hex inside the drawing.

| NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
|---|---|---|---|---|
| ink | #15181e | #e8eaef | structure and primary text | key text, neighbour text, panel labels, axis headers, filled cell mark, printed counts |
| muted | #5c6470 | #a3abba | meaningful secondary | degree values, half divider, notes, leaders, source tag |
| border | #e7eaf0 | #262b36 | decorative separation | panel frames, cell rules, row rules, strip rules |
| card | #ffffff | #15181e | panel fill | panel background and empty cell fill |
| wash | #f5f7fa | #111522 | table zebra | key rows 2, 4, 6 and 8 of the list |
| accent-soft | #eef3fe | #16213c | active wash | the space column band of the strip |
| accent-ink | #14357f | #c7d6ff | text on accent-soft | the space header and the two printed space values |

- value plan: three foundation values (card, wash, accent-soft) plus ink as the darkest text value; the strongest junction sits on the boundary between a filled cell and an empty neighbour inside the grid, named in section 8.
- light: flat, no light source declared, no shadow, no gradient.
- detail floor: stroke 1.0 and type 14, nothing below either.
- style reference: the chapter's other sheets and the geometry in BRIEFING section 3; no icon set, no texture.
- hue rule (BRIEFING section 5): faint and border carry no text and no meaningful edge, so a filled against an empty cell is carried by the presence of a 1.6 ink mark and by position, never by fill, and no count is printed in a state colour.

## 6. Content inventory

The counted graph, stated once: V 8, E 8. The adjacency list writes one entry per edge end, so 2E = 16 entries, and the rows hold 2, 4, 3, 3, 2, 1, 1, 0 of them. The adjacency matrix writes one cell per ordered pair, so V times V = 8 times 8 = 64 cells; 16 of those record an edge, and 64 minus 16 = 48 record none. The list's 16 entries and the grid's 16 marks are the same sixteen edge ends, which is why the pair the strip prints is countable in both panels. No other pair appears on the sheet.

| view | job | dominant | element floor |
|---|---|---|---|
| A | the adjacency list of the eight vertices, eight key rows with neighbour lists, the `w` row empty | no | 43 |
| B | the adjacency matrix as an eight by eight grid, 16 filled cells mirrored | yes | 101 |
| C | the cost strip, space against query for both containers | no | 18 |

| ID | view | element | paint role | count |
|---|---|---|---|---|
| A-01 | A | panel frame, 1.0 | border | 1 |
| A-02 | A | panel label "Adjacency list" | ink | 1 |
| A-03 | A | header rule under the panel label | border | 1 |
| A-04 | A | column header "degree" | muted | 1 |
| A-05 | A | key text, one per row: `s` `a` `b` `c` `t` `u` `v` `w` | ink | 8 |
| A-06 | A | neighbour list text, one per row, rows 1 to 7 | ink | 7 |
| A-07 | A | empty bracket pair on the `w` row, two strokes, no text | muted | 2 |
| A-08 | A | degree value at the row's right end | muted | 8 |
| A-09 | A | row rule under each row | border | 8 |
| A-10 | A | zebra wash on rows 2, 4, 6 and 8 | wash | 4 |
| A-11 | A | note "one row per vertex" | muted | 1 |
| A-12 | A | leader from the note to the `w` row | muted | 1 |
| B-01 | B | panel frame, 1.0 | border | 1 |
| B-02 | B | panel label "Adjacency matrix" | ink | 1 |
| B-03 | B | axis header text, eight down the left and eight across the top | ink | 16 |
| B-04 | B | grid cell, card fill with a 1.0 border rule, 48 empty and 16 filled | border | 64 |
| B-05 | B | filled cell mark, 1.6 ink square inset in the cell | ink | 16 |
| B-06 | B | half divider, 1.0 solid `muted`, corner to corner | muted | 1 |
| B-07 | B | count "16 filled, 48 empty" | ink | 1 |
| B-08 | B | note "one edge, two cells" | muted | 1 |
| C-01 | C | strip rule above the headers | border | 1 |
| C-02 | C | strip rule between the two rows | border | 1 |
| C-03 | C | space column band, one rect behind both space cells | accent-soft | 1 |
| C-04 | C | column header "space" | accent-ink | 1 |
| C-05 | C | column header "asymptote" | ink | 1 |
| C-06 | C | column header "query" | ink | 1 |
| C-07 | C | row label "list" | ink | 1 |
| C-08 | C | row label "matrix" | ink | 1 |
| C-09 | C | space value "16 entries" | accent-ink | 1 |
| C-10 | C | space value "64 cells" | accent-ink | 1 |
| C-11 | C | asymptotic "O(V+E)" | ink | 1 |
| C-12 | C | asymptotic "O(V" with a raised 2 tspan | ink | 2 |
| C-13 | C | query value "scan one row, O(degree)" | ink | 1 |
| C-14 | C | query value "one cell, O(1)" | ink | 1 |
| C-15 | C | graph label "sample graph, 8 vertices" | muted | 1 |
| C-16 | C | source tag "9.1.1" | muted | 1 |
| C-17 | C | leader from the graph label to the space band | muted | 1 |

Counts per view from the rows above: A 43, B 101, C 18, total 162. The inventory holds 37 rows over three views, and every printed number on the sheet is countable in it: the 16 entries are the ids printed inside the seven filled text nodes of A-06, with A-07 counting none, and the 64 cells and 16 marks are B-04 and B-05.

## 7. Requirements

- REQ-FIG0902-01 [MUST-STANDARD] View A shows eight key rows, one per vertex, in the order `s`, `a`, `b`, `c`, `t`, `u`, `v`, `w`, and each row holds the neighbours of its vertex in the chapter's adjacency order (source: chapter 9.1.1, adjacency list definition; order from BRIEFING section 3).
- REQ-FIG0902-02 [MUST-STANDARD] Each row holds exactly its vertex's degree, so the rows hold 2, 4, 3, 3, 2, 1, 1 and 0 entries, which is 16 in all for eight edges, and every entry is an edge of the sample graph (source: BRIEFING section 2, verified degrees summing to 16).
- REQ-FIG0902-03 [MUST-STANDARD] The `w` row prints its neighbour slot as an empty bracket pair with no ids, so the isolated vertex sits in the list with nothing stored beside it (source: BRIEFING section 2, `w` degree 0; BRIEFING section 1, the isolated vertex is part of the argument).
- REQ-FIG0902-04 [MUST-STANDARD] View B is one grid of 64 cells with eight headers down the left and eight across the top, both in the order of view A (source: chapter 9.1.1, V by V table; V 8).
- REQ-FIG0902-05 [MUST-STANDARD] Exactly 16 cells carry a 1.6 ink mark and the other 48 carry the 1.0 rule alone, and every filled cell has a filled mirror across the divider, so the grid is symmetric (source: verified edge list of BRIEFING section 2, 2E = 16).
- REQ-FIG0902-06 [MUST-STANDARD] The count printed beside the grid reads "16 filled, 48 empty" and both figures equal what the drawn grid shows when counted (source: arithmetic stated in section 6).
- REQ-FIG0902-07 [MUST-STANDARD] No cell fill or stroke varies with degree, distance or count; the halves are told apart by position and by the divider, never by a ramp of hue or value (source: PLAN.md forbidden list, no heat map; BRIEFING section 5 hue rule).
- REQ-FIG0902-08 [MUST-LOCAL] The divider is one solid 1.0 `muted` hairline from the grid's top left corner to its bottom right corner, continuous across eight cells in the only diagonal direction on the sheet, so it is told apart from the 1.0 `border` cell rules by span, direction and value, and it carries no dash (source: BRIEFING section 5, a dash must carry a label or a distinct geometry).
- REQ-FIG0902-09 [MUST-STANDARD] View C prints 16 entries against 64 cells, both counted on the whole sample graph, which the label "sample graph, 8 vertices" names beside the pair (source: BRIEFING section 2, V + E = 16 and V squared = 64 on 8 vertices and 8 edges).
- REQ-FIG0902-10 [MUST-STANDARD] The same strip prints O(V+E) against O(V squared) credited to 9.1.1, and no printed pair mixes a count from this graph with a count from another graph (source: chapter 9.1.1).
- REQ-FIG0902-11 [MUST-STANDARD] The query side prints O(degree) for the list, naming the scan of one row as the operation, and O(1) for the matrix, naming the one cell as the operation (source: chapter 9.1.1 for O(1); O(degree) follows from the list definition).
- REQ-FIG0902-12 [MUST-STANDARD] No type is below 14 canvas units, every paint is a role from section 5, both panel frames are 1.0 in `border`, and no count is printed in a state colour (source: BRIEFING sections 4 and 5).

## 8. Composition plan

- dominant: the matrix grid, 384 by 384 at x 560 to 944 and y 126 to 510, whose 64 cells and 16 marks outrank the eight list rows by area and by repetition.
- focal mechanism: the junction where a filled cell's 1.6 ink mark ends against the card of the same cell, read along the 1.0 divider towards its mirror.
- hierarchy: grid marks first, then the two space values in accent-ink, then the list rows, then the notes and the degree values in muted.
- reading path: the panel labels at the top, down the eight list rows to the empty `w` row, across to the grid, along the divider to the mirrored half, out at the strip's pair.
- balance: the sheet is asymmetric by design, the grid panel 510 wide against the list panel 400, and the full width strip below acts as the tie.
- framing: two framed panels on the top band, one unframed strip on the bottom band, with 30 units of empty sheet between the bands.
- negative space: 48 of the 64 grid cells stay empty and read as the argument; the margin outside the three views stays empty so the grid keeps its weight.
- grouping: proximity binds each header to its grid, the zebra binds alternate rows, and the leader binds "sample graph, 8 vertices" to the pair it counts.

## 9. Build contract

Steps, in order:

1. Set the viewBox and the sheet; place panel A at 32 to 432 and panel B at 458 to 968, both from y 56 to 580, and the strip band at 32 to 968 from y 610 to 740.
2. Build view A: eight rows of 48 units from y 124, key column at x 56, neighbour column at x 130, degree value right aligned at x 404, "degree" header at y 114, row rule at each row's bottom edge from x 56 to 408.
3. Fill the eight rows in the stated order: `s` a b, `a` s b c t, `b` s a c, `c` a b t, `t` a c, `u` v, `v` u, `w` nothing. The `w` slot gets the empty bracket pair and the degree 0.
4. Build view B: axis headers at y 116 across the top and right aligned at x 546 down the left, grid 384 by 384 at x 560 to 944 and y 126 to 510, cell 48.
5. Mark the 16 cells for the eight edges in both halves: `{s,a}`, `{s,b}`, `{a,b}`, `{a,c}`, `{b,c}`, `{c,t}`, `{a,t}`, `{u,v}`. The `w` row and the `w` column stay empty, and so do all eight cells of the diagonal.
6. Draw the divider from the grid's top left corner to its bottom right corner, 1.0, solid, in `muted`; print "16 filled, 48 empty" at x 482 and "one edge, two cells" at x 700, both on the band under the grid.
7. Build view C: headers at y 630, band rect from y 640 to 726 at x 236 to 424, list row baseline 666, matrix row baseline 710, space values at x 250, asymptotes at x 470, query values at x 660, graph label at x 56 and source tag at x 940 on the header line.
8. Route every paint through a CSS custom property set in `:root` and in `.dark`; no raw hex in the drawing.
9. Run the audit and the DOM checks below, then hand the sheet to a non-author read.

- interaction: none, static sheet, no hover, no focus target.
- animation: none, the sheet has one state.
- ids and classes: `#fig-09-02`, `.panel`, `.key`, `.row`, `.cell-plain`, `.cell-marked`, `.divider`, `.pair`, `.asym`, `.note`.
- verification hooks: `data-graph="sample-8"`, `data-vertices="8"`, `data-count-list="16"`, `data-count-matrix="64"`, `data-cells="64"`, `data-filled="16"`, `data-empty="48"`, so a DOM assertion reads back the numbers the strip prints.
- commands: `python3 /home/carloshnp/.hermes/skills/svg/illustration-spec/scripts/check_spec.py /home/carloshnp/study-site/docs/figures/dsa-09-graphs/FIG-09-02-representations.md`, then `grep -nP "[\x{2013}\x{2014}]"` on the built SVG, then the element count per view against the floors.

## 9b. Mechanism and state model

- STATE: none: every coordinate is placed, nothing is derived at render time.
- DATUM: the eight vertex row order, taken once from BRIEFING section 3 and shared by view A's keys, view B's two axes and the strip's label.
- INV-01 The grid holds 64 cells at every build, eight per row and eight per column, and its two axes name the same eight vertices, in the same order, as view A.
- INV-02 The filled cells number twice the eight edges, 16, every filled cell has a filled mirror across the divider, and the empty cells number 48.
- INV-03 The list's entries and the grid's marks count the same sixteen edge ends, so no printed pair can mix a count from one graph with a count from another.
- INV-04 No number is printed on the sheet that the drawn inventory does not supply: the strip's 16 is the count of neighbour ids inside A-06 with A-07 contributing none, and its 64 is the count of cell rects in B-04.
- FUTURE STATE: a later revision may print the row length of one vertex beside the list, which would put degree into the query column; the space pair stays as it is.

## 10. Acceptance criteria

| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0902-01 | key rows and their order | eight rows, `s` `a` `b` `c` `t` `u` `v` `w` top to bottom | DOM assertion |
| REQ-FIG0902-02 | entries against the degree list | rows hold 2, 4, 3, 3, 2, 1, 1, 0, 16 in all, each an edge | element count and set comparison |
| REQ-FIG0902-03 | the `w` row | empty bracket pair, no ids, degree 0 | DOM assertion |
| REQ-FIG0902-04 | grid geometry | eight by eight cells, 64 in total, headers on both axes | element count |
| REQ-FIG0902-05 | marks and mirroring | 16 filled, 48 empty, symmetric across the divider | element count and DOM assertion |
| REQ-FIG0902-06 | printed grid count | text reads 16 filled, 48 empty, both equal the drawn counts | non-author read and element count |
| REQ-FIG0902-07 | cell states | two states only, no fill varies with degree or count | DOM assertion on fill roles |
| REQ-FIG0902-08 | divider | one solid 1.0 hairline, corner to corner, no dashed stroke anywhere | DOM assertion on stroke width and dash attributes |
| REQ-FIG0902-09 | printed space pair and its label | 16 and 64 printed, "sample graph, 8 vertices" beside them | non-author read |
| REQ-FIG0902-10 | asymptotic pair | O(V+E) and O(V squared) printed with the 9.1.1 credit, no mixed pair | non-author read |
| REQ-FIG0902-11 | query column | O(degree) with the scan named, O(1) with the one cell named | non-author read |
| REQ-FIG0902-12 | type, palette and frames | no size below 14, every paint a role, frames at 1.0, no count in a state colour | contrast computation |

## 11. Open questions

- Q1 Does the degree column in view A risk reading as the list's own cost, so that a reader compares 4 against 8 instead of entries against cells? Evidence that settles it: a non-author read of the built sheet, asking what the rightmost column of the list counts.
- Q2 Should the matrix print its row sums along the margin, which would show the degree of each vertex a second time and make the symmetry countable from either axis? Evidence: the chapter author's decision on whether degree belongs on the grid.
- Q3 The revision fixes both views on the whole graph; if a later figure needs the five vertex piece for a traversal, that figure inherits the piece and this sheet does not return to it.

## 12. Revision history

| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | First spec: three views, five vertex piece, cost pair on the whole sample graph | FIG-09-02 row of PLAN.md |
| 2 | 2026-10-22 | Both views redrawn on the whole eight vertex graph, 16 entries against 64 cells, 16 filled and 48 empty, stale piece counts removed, anchor id and 1.0 frames added | every printed number must be countable on the sheet |
