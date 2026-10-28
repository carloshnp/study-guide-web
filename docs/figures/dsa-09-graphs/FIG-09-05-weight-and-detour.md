# FIG-09-05: The cheaper route is not the shorter one
status: draft   rev: 2   date: 2026-10-22   author: illustration-spec agent, chapter 9 roster

## 1. Summary
The worked example of 9.2.3 drawn twice on one sheet. View A is the connected piece with its seven weights, the shortest path tree from `s` in the success role, a distance label at every vertex, and the running sum written on the route itself: 2 at `b`, 2 + 1 = 3 at `a`, then +5 and +3 along the way to `t`. View B is the two costs that leave `a`, drawn as two bars on one scale, 468 units for 13 and 396 for 11, so the addition is read as length. The bars are the largest marks on the sheet, because cost is a sum and the sum is the message, and the direct edge is only the most tempting single term of that sum.
MESSAGE = cost is a sum over edges, so the route with three edges beats the route with one.

## 2. Communicative intent
- AUDIENCE: a student revising for an exam, can read pseudocode, has met heaps, currently believes the single edge to a vertex is the cheap way to reach it.
- INTENDED CHANGE: believe that path cost is a sum, and add the weights instead of counting the edges.
- READING CONTEXT: chapter 9.2.3, anchor section `923-paths-distance-and-the-worked-example`, after "This is the whole reason a shortest path algorithm cannot simply prefer long edges or short edges: cost is a sum, and the cheapest route is the one whose sum is smallest." Article column capped at 1120 px, light and dark themes, phone read in the lightbox at 2x.
- REPRODUCTION: viewBox `0 0 1000 560`, aspect 25:14, displayed up to 1050 CSS px wide.
- LIFETIME: illustration system for the chapter, so palette and canonical coordinates outlive this figure.
- ASSUMPTIONS:
  1. The sample graph is undirected and carries the seven weights listed in BRIEFING section 2. Confirmed.
  2. `d(a)` is 3 through `b`, not 4 through `s`, per the settle order s, b, a, c, t. Confirmed.
  3. Only the connected piece appears, `u`, `v` and `w` absent, and both views share one unit scale on one sheet. Confirmed by 9.2.3 and BRIEFING section 4.

## 3. Goals and non-goals
- GOAL-1: the reader locates the seven weights on the drawn edges without a legend.
- GOAL-2: the reader reproduces 2 + 1 = 3 on the tree, then 3 + 5 + 3 = 11 and 3 + 10 = 13 against the bars, from the labels alone.
- GOAL-3: the reader names `a` to `t` as the tempting route and the reason it loses.
- GOAL-4: the reader reads the tree from the success edges and the distance labels together.
- NON-GOAL-1: running Dijkstra. No extraction order ladder, that is FIG-09-09.
- NON-GOAL-2: a second graph. Every number comes from the chapter's own sample.
- NON-GOAL-3: the unweighted BFS distances. FIG-09-07 owns them, and this sheet would contradict them by shape.
- NON-GOAL-4: the path `s`, `a`, `t`. It is a path, not a prefix of the route from `a`, and drawing it invites the wrong sum.

## 4. Constraints
- canvas: viewBox 0 0 1000 560; view A in y 40 to 340, view B in y 360 to 540; 1 unit = 1 CSS px at the 1000-unit reference width
- node budget: 380 live elements for a two-panel sheet; this inventory lists 55
- palette budget: nine of the chapter's roles used here, no new hue
- typography: Montserrat, vertex ids 18, weights and callouts 15, panel labels 16 semibold, notes 14, minimum 14
- text split: prose stays in the markdown; in-SVG labels are vertex ids, weights, `d` values and callouts, 24 characters and 2 lines at most
- convention: flat schematic, one sheet, one projection, no perspective
- time appetite: one spec, one build pass, one audit; no state machinery
- detail: full
- element floor: per view in the section 6 view map; the harness fails a view below its floor
- boundaries: Always state the weights as BRIEFING section 2 gives them / Ask first before dropping a view or changing the canvas width / Never derive a coordinate from a state, never encode a meaning in hue alone, never draw 4 + 10 = 14

Claim status for every number this sheet asserts:

| claim | claim status | source |
|---|---|---|
| weights 4, 2, 1, 5, 8, 3, 10 on {s,a}, {s,b}, {a,b}, {a,c}, {b,c}, {c,t}, {a,t} | verified | BRIEFING section 2 |
| `d(s)` 0, `d(b)` 2, `d(a)` 3, `d(c)` 8, `d(t)` 11 | verified | BRIEFING section 2 |
| the tree edges are {s,b}, {a,b}, {a,c}, {c,t} | verified | BRIEFING section 2, route s, b, a, c, t |
| settle order s 0, b 2, a 3, c 8, t 11 | verified | BRIEFING section 2 |
| from `a` at 3: the direct edge gives 3 + 10 = 13, the route through `c` gives 3 + 5 + 3 = 11 | derived | addition on the two verified rows above |
| the route s, b, a, c, t costs 2 + 1 + 5 + 3 = 11 | verified | BRIEFING section 2, chapter 9.2.3 |

## 5. Visual system lock
- projection: flat schematic, one per sheet, inherited from the chapter lock
- line grammar: outline 3.2 for node circles only. Every edge, the route rail and each bar outline 1.6, the 2:1 ratio to the outline, so no single edge is heavier than another. Hairline 1.0 in `border` for the separators inside a bar, and 1.0 in `muted` for the two bar end rules, which witness a measurement and so may not take an aid role. Arrowheads filled triangles 14 long and 10 wide, on the route rail alone, because the graph is undirected and no other mark here is a flow. No long dash anywhere, because nothing in this sheet is hidden
- palette, roles not swatches:

| NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
|---|---|---|---|---|
| ink | #15181e | #e8eaef | structure and primary text | vertex ids, weights, `d` values, panel labels |
| muted | #5c6470 | #a3abba | meaningful secondary | the two off-tree edges, route labels, the two bar end rules |
| border | #e7eaf0 | #262b36 | decorative separation | the two bar separators |
| card | #ffffff | #15181e | panel fill | node fill, label halos |
| accent | #1d4ed8 | #7aa2ff | active, examined | the route rail along the tree |
| accent-soft | #eef3fe | #16213c | active wash | bar fills in view B |
| accent-ink | #14357f | #c7d6ff | text on accent-soft | segment weights inside the bars |
| success | #157347 | #4ade80 | final, settled | the four tree edges, the `= 11` total |
| warning | #b42318 | #f87171 | contradiction | the `a` to `t` edge, the `= 13` total |

- not used: faint, because 3.13 against card marks an aid and every mark on this sheet carries a claim, so the two bar end rules move to muted; wash, because no row here is striped.
- value plan: three foundation values, card, accent-soft and border, with ink as the darkest text value; the strongest light and dark junction sits in view B, where the accent-soft fill of the 468 unit bar meets its 1.6 warning outline, and that is where the eye lands first
- light: flat, no light source declared, no shadow, no gradient; depth here is temporal (wanted, rejected), never spatial
- detail floor: no stroke below 1.0 unit and no text below 14 units at the 1000-unit reference width
- style reference: BRIEFING section 5 until FIG-09-03 is drawn, then FIG-09-03 for node, edge and weight grammar

## 6. Content inventory
Two views. View A makes the tree, its running sum and the rejected edge visible; view B makes the two sums addable as length. Each row below is one live element, and each view map floor is the count in the matching block.

| view | job in the argument | depends on | element floor |
|---|---|---|---|
| A | show that the tree reaches every vertex, and that the direct edge to `t` is not on it | none | 34 |
| B | show both costs from the same 3, so the longer route is the smaller sum | A | 12 |

| ID | element | job in the argument | must show | label | budget |
|---|---|---|---|---|---|
| A-01 | node `s` | the source every distance is measured from | circle r 22 at 110, 210, ink outline, card fill | `s` centred, 18 | circle 3.2 |
| A-02 | node `a` | the vertex both routes leave | circle r 22 at 280, 100 | `a` centred, 18 | circle 3.2 |
| A-03 | node `b` | the first tree step, the reason `d(a)` is 3 | circle r 22 at 280, 300 | `b` centred, 18 | circle 3.2 |
| A-04 | node `c` | the detour that makes the cheaper route | circle r 22 at 450, 210 | `c` centred, 18 | circle 3.2 |
| A-05 | node `t` | the target of both routes, where 13 meets 11 | circle r 22 at 620, 210 | `t` centred, 18 | circle 3.2 |
| A-06 | edge {s,a} | the first hop the tree refuses, 4 against 2 | straight line 110,210 to 280,100, muted | weight 4 | line 1.6 |
| A-07 | edge {s,b} | first tree edge, `d(b)` 2 | line 110,210 to 280,300, success | weight 2 | line 1.6 |
| A-08 | edge {a,b} | second tree edge, 2 + 1 = 3 is `d(a)` | line 280,300 to 280,100, success | weight 1 | line 1.6 |
| A-09 | edge {a,c} | third tree edge, 3 + 5 = 8 is `d(c)` | line 280,100 to 450,210, success | weight 5 | line 1.6 |
| A-10 | edge {b,c} | the other off-tree edge, 8 is never used | line 280,300 to 450,210, muted | weight 8 | line 1.6 |
| A-11 | edge {c,t} | last tree edge, 8 + 3 = 11 is `d(t)` | line 450,210 to 620,210, success | weight 3 | line 1.6 |
| A-12 | edge {a,t} | the rejected route: one edge, total 13 | line 280,100 to 620,210, warning, no arrowhead, because the graph is undirected | weight 10 | line 1.6 |
| A-13 | weight of {s,a} | prices the hop the tree refuses | text 15 ink, 16 units outside triangle s a b | 4 | text 15 |
| A-14 | weight of {s,b} | prices the first tree step | text 15 ink, 16 units above the midpoint, clear of the rail | 2 | text 15 |
| A-15 | weight of {a,b} | prices the step that makes `d(a)` 3 | text 15 ink, 16 units right of the midpoint | 1 | text 15 |
| A-16 | weight of {a,c} | prices the detour into `c` | text 15 ink, 16 units below the midpoint | 5 | text 15 |
| A-17 | weight of {b,c} | prices the edge nobody should use | text 15 ink, 16 units below the midpoint | 8 | text 15 |
| A-18 | weight of {c,t} | prices the last step of the cheap route | text 15 ink, 16 units below the midpoint | 3 | text 15 |
| A-19 | weight of {a,t} | prices the route the reader wants | text 15 ink, 16 units below the chord midpoint | 10 | text 15 |
| A-20 | id `s` | names the source | text inside A-01, ink, card halo | `s` | text 18 |
| A-21 | id `a` | names the branching vertex | text inside A-02, ink, card halo | `a` | text 18 |
| A-22 | id `b` | names the first tree step | text inside A-03, ink, card halo | `b` | text 18 |
| A-23 | id `c` | names the detour vertex | text inside A-04, ink, card halo | `c` | text 18 |
| A-24 | id `t` | names the target | text inside A-05, ink, card halo | `t` | text 18 |
| A-25 | distance at `s` | the datum of every cost | text 15 ink, 30 units right of A-01, off the rail start | `d=0` | text 15 |
| A-26 | distance at `b` | 2 is `d(b)` and the first settle after `s` | text 15 ink, 30 units right of A-03 | `d=2` | text 15 |
| A-27 | distance at `a` | 3 is `d(a)` through `b`, not 4 through `s` | text 15 ink, 30 units above right of A-02, above the chord | `d=3` | text 15 |
| A-28 | distance at `c` | 8 is `d(c)` by way of `a` | text 15 ink, 34 units below A-04, clear of the rail | `d=8` | text 15 |
| A-29 | distance at `t` | 11 is the cost of the whole route | text 15 ink, 30 units above A-05 | `d=11` | text 15 |
| A-30 | route rail | the route the reader should take, s to t through b, a, c | path offset 8 units outside the graph, 30 units clear of the `s` and `t` centres (22 of node radius plus 8 of offset), accent, the only arrowhead on the sheet, at `t` | none | line 1.6 |
| A-31 | total callout | names the cost of the rejected edge from `a` | text 15 warning, 24 units above the chord midpoint | `= 13` | text 15 |
| A-32 | panel label A | tells the reader which question this view answers | text 16 semibold at 110, 40 | `A  the tree from s` | text 16 |
| A-33 | note | fixes what a `d` value is, so no reader takes 3 for a weight | text 14 ink at 110, 60 | `d = cost from s` | text 14 |
| A-34 | rejected tag | carries the contradiction without relying on hue | text 14 warning, 30 units right of A-31 | `rejected` | text 14 |
| A-35 | running sum at `b` | the first term of the addition, on the vertex that fixes `d(a)` | text 15 ink at 208,306, below the `s` to `b` edge | `2` | text 15 |
| A-36 | running sum at `a` | the sum after two edges, 2 + 1 | text 15 ink, centred 215,80, above the `s` to `a` edge and below the panel label | `2+1=3` | text 15 |
| A-37 | running sum step | the third term, added on the way to `c` | text 15 ink, centred 365,139, 16 units above the arc midpoint, opposite the weight | `+5` | text 15 |
| A-38 | running sum step | the fourth term, added on the way to `t` | text 15 ink, centred 535,186, 16 units above the midpoint, opposite the weight | `+3` | text 15 |
| B-01 | panel label B | names the comparison the bars make | text 16 semibold at 110, 372 | `B  from a, two costs` | text 16 |
| B-02 | left route label | names the route the reader expects | text 15 muted at 110, 394 | `direct edge a to t` | text 15 |
| B-03 | right route label | names the route the tree uses | text 15 success at 110, 456 | `through c to t` | text 15 |
| B-04 | left bar | carries the total 13 as a length, the largest mark on the sheet | rect 110,404 to 578,436, accent-soft fill, warning outline 1.6 | none | rect 1.6 |
| B-05 | left separator | splits 3 from 10 without a second stroke role | hairline at x 218, y 404 to 436, border | none | hairline 1.0 |
| B-06 | left first term | the shared starting cost `d(a)` | text 15 accent-ink centred in 110 to 218 | `3` | text 15 |
| B-07 | left second term | the direct edge weight | text 15 accent-ink centred in 218 to 578 | `10` | text 15 |
| B-08 | left total | states the sum the bar draws | text 15 warning, left anchored at 588, 10 units past the bar | `= 13` | text 15 |
| B-09 | left end rule | witnesses where the 13 bar stops, in a role that may carry a measurement | muted vertical at x 578, y 400 to 440 | none | hairline 1.0 |
| B-10 | right bar | carries the total 11 as a length, 72 units shorter | rect 110,466 to 506,498, accent-soft fill, success outline 1.6 | none | rect 1.6 |
| B-11 | right separator one | splits 3 from 5 | hairline at x 218, y 466 to 498, border | none | hairline 1.0 |
| B-12 | right separator two | splits 5 from 3, giving three edges | hairline at x 398, y 466 to 498, border | none | hairline 1.0 |
| B-13 | right first term | the same starting cost as the left bar | text 15 accent-ink centred in 110 to 218 | `3` | text 15 |
| B-14 | right second term | the detour weight into `c` | text 15 accent-ink centred in 218 to 398 | `5` | text 15 |
| B-15 | right third term | the last hop to `t` | text 15 accent-ink centred in 398 to 506 | `3` | text 15 |
| B-16 | right total | states the sum the bar draws, and it is the smaller one | text 15 success, left anchored at 516, 10 units past the bar | `= 11` | text 15 |
| B-17 | right end rule | witnesses that the 11 bar stops before the 13 bar | muted vertical at x 506, y 462 to 502 | none | hairline 1.0 |

## 7. Requirements
- REQ-FIG0905-01 [MUST-STANDARD] Type is Montserrat at 18 units for vertex ids, 15 for weights, distance labels and totals, 16 semibold for panel labels and 14 for notes, no text below 14, no label over 24 characters or 2 lines, and every label anchored on an edge or node carries a 2-unit card halo so a line passing behind it stays out of the counters. (source: BRIEFING section 4)
- REQ-FIG0905-02 [MUST-STANDARD] Text is ink, muted, success or warning on card, at 17.78, 5.98, 5.87 and 6.57 in light and 14.77, 7.7, 10.2 and 6.43 in dark, or accent-ink on accent-soft at 10.23 and 11.0, and no text sits on faint at 3.13 or on border at 1.21. (source: BRIEFING section 5, WCAG 1.4.3)
- REQ-FIG0905-03 [MUST-STANDARD] Every meaningful stroke reaches 3:1 against its surface, so edges use muted at 5.98 and 7.7 or success at 5.87 and 10.2 or warning at 6.57 and 6.43, never faint and never border. (source: BRIEFING section 5, WCAG 1.4.11)
- REQ-FIG0905-04 [MUST-STANDARD] The seven weights appear once each, on their own edge: 4 on {s,a}, 2 on {s,b}, 1 on {a,b}, 5 on {a,c}, 8 on {b,c}, 3 on {c,t}, 10 on {a,t}, with no edge carrying two numbers. (source: BRIEFING section 2, chapter 9.2.3)
- REQ-FIG0905-05 [MUST-STANDARD] The distance labels read `d=0` at `s`, `d=2` at `b`, `d=3` at `a`, `d=8` at `c`, `d=11` at `t`, and each sits within 48 units of its node centre. (source: BRIEFING section 2)
- REQ-FIG0905-06 [MUST-STANDARD] View B pairs 3 + 10 = 13 against 3 + 5 + 3 = 11, both leading terms the same 3 for `d(a)`, and shows no third total. (source: claim status rows in section 4)
- REQ-FIG0905-07 [MUST-LOCAL] The path `s`, `a`, `t` appears in neither view and no label states 4 + 10 = 14, because `d(a)` is 3 through `b` and the two framings would disagree. (why: BRIEFING section 2 trap)
- REQ-FIG0905-08 [MUST-LOCAL] The edge `a` to `t` is drawn at 1.6 like every other edge, in warning hue, with no arrowhead, because the graph is undirected and arrowheads belong to the route rail; it carries the callout `= 13` and the tag `rejected` beside it, and it is the heaviest single edge mark on the sheet rather than the longest mark, since the route rail is longer. It agrees with FIG-09-09, which draws the same edge at 1.6 muted with no head. (why: the sum is the message and the rejected edge is one term of it)
- REQ-FIG0905-09 [MUST-LOCAL] The four tree edges {s,b}, {a,b}, {a,c}, {c,t} carry success and the two off-tree edges {s,a}, {b,c} carry muted, so tree membership is visible with the distance labels ignored. (why: the tree is what view A owes the reader)
- REQ-FIG0905-10 [MUST-LOCAL] Node centres are the canonical values from BRIEFING section 3 with no translation in view A, radius 22, so a reader who has seen FIG-09-03 navigates this sheet without relearning it. (why: shared geometry across the chapter)
- REQ-FIG0905-11 [MUST-LOCAL] Each hue meaning is also carried by shape or label: warning by the tag and the `= 13`, since no arrowhead marks it now, success by the rail offset and the tree topology, accent-soft by the segment numbers, so both themes and colour-blind readers keep every claim. (source: WCAG 1.4.1)
- REQ-FIG0905-12 [SHOULD] View B draws cost as length at 36 units per cost unit, so the 13 bar runs 468 units, the 11 bar 396, and the 13 bar ends 72 units right of the 11 bar, which is the 2 cost unit difference; the edge count reads from the number of segments. (cost: five lengths placed by hand, stated in section 9b)
- REQ-FIG0905-13 [MUST-LOCAL] The running sum is written on the tree at 15 units, `2` at `b`, `2+1=3` at `a`, `+5` on the arc `a` to `c` and `+3` on the arc `c` to `t`, four text nodes, each on the far side of its arc from the edge weight, so the addition is read along the route and view B only fixes its scale. (why: cost is a sum over edges, and the sum belongs where the edges are)

## 8. Composition plan
- DOMINANT: the two bars in view B, 468 and 396 units long and 32 deep, the largest enclosed marks on the sheet and the only place two lengths are compared.
- FOCAL MECHANISM: length, two bars leaving one left edge, so the 72 unit difference is the claim; repetition, four running sum labels on the route in view A, each an intermediate of the same addition; isolation, the bars sit in their own band with empty sheet above and below.
- HIERARCHY: three levels. The two bars and their totals; the route rail with its running sum; the seven weights, the five distance labels and the note.
- READING PATH: entry at `s` on the left, along the rail to `b` reading 2, then 2 + 1 = 3 at `a`, then +5 and +3 into `t`, then left and down to view B, ending at the 13 bar against the 11 bar, whose difference is the 72 units between their two ends.
- BALANCE: asymmetrical. The graph mass sits left of centre in the upper band, and the two bars run right from the same x 110 below it, so the lower band carries the weight that the upper band spends.
- FRAMING: no crop, no border. The graph occupies y 40 to 340, the arithmetic band y 360 to 540, and view B starts at the same x 110 as the graph so every length is read from one edge.
- NEGATIVE SPACE: the band between the `a` to `t` edge and the `c` to `t` edge keeps the rejected route from touching the tree; the 72 units between the two bar ends stay empty, so the difference is the one gap the reader is given.
- GROUPING: each running sum label sits 16 units off its arc and each edge weight 16 units off the other side, so the two annotation sets never share a side; each bar term is centred in its own segment, so a term belongs to the length it prices.

## 9. Build contract
- steps: 6. 0: place the five nodes and their ids. 1: draw the seven edges with their weights. 2: recolour the four tree edges to success. 3: place the five distance labels, then the four running sum labels on the route. 4: draw the route rail, then the `a` to `t` edge with no head, the 13 and the tag. 5: place view B, both bars at 36 units per cost unit, their terms, both totals and both end rules.
- interaction and animation: none; the reader checks the sums by addition, and a timeline would delay the one comparison the sheet makes.
- ids and classes: DOM ids equal inventory ids with the `VIZ-` prefix; one class per palette role, named for the role and never for the hue.
- verification hooks: none. One state, one sheet, nothing to force by query param.
- commands: build to `docs/figures/dsa-09-graphs/FIG-09-05.svg`, serve with `python3 -m http.server` from the repo root, run `check_spec.py` on this file before build and `svg-verify` after.

## 9b. Mechanism and state model
- STATE: none: every coordinate is placed, nothing is derived from a state variable
- DATUM: not applicable, no derived coordinate
- DERIVED: none: the bar segment lengths 108, 360, 108, 180 and 108 were fixed at authoring against a declared 36 units per cost unit scale, not computed at render
- INV-01: the seven weight labels read 4, 2, 1, 5, 8, 3 and 10 once each, and no edge carries two numbers
- INV-02: the left bar spans 468 units and the right bar 396, so the drawn difference is 72 units, which is 2 cost units at the declared 36 units per cost unit
- INV-03: no label exceeds 24 characters, no label box overlaps a node circle, and the route rail keeps 30 units clear of the centres of `s` and `t`
- INV-04: no drawn total other than 11 and 13 appears, and no text node reads 14
- FUTURE STATE: a second worked example turns this section into a step index over the settle order; view A would then need a true state model, and nothing on this sheet moves before that revision

## 10. Acceptance criteria
| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0905-01 | computed sizes and label lengths per text node | 18, 15, 16, 14 only, longest label 20 characters, halo on every anchored label, no label wraps | DOM assertion |
| REQ-FIG0905-02 | contrast of each text fill against its backing surface | at least 4.5:1, and no text on faint or border | contrast computation |
| REQ-FIG0905-03 | contrast of each stroke against card in both themes | at least 3:1, no faint or border stroke carries meaning | contrast computation |
| REQ-FIG0905-04 | read the seven edges against the weight table | one number per edge, values 4, 2, 1, 5, 8, 3, 10 in the stated positions | element count plus non-author read |
| REQ-FIG0905-05 | read the five distance labels and their offsets | `d=0`, `d=2`, `d=3`, `d=8`, `d=11`, each within 48 units of its node centre | DOM assertion |
| REQ-FIG0905-06 | add each bar term as drawn | left sums to 13, right sums to 11, both lead with 3 | element count plus non-author read |
| REQ-FIG0905-07 | text search of the built SVG and screenshot read | no `s a t` sequence and no `14` inside any text node | DOM assertion |
| REQ-FIG0905-08 | measure stroke widths, count heads and read the warning marks | `a` to `t` at 1.6 with no head, the only warning edge, tag and `= 13` present, the route rail carrying the sheet's only head | DOM assertion |
| REQ-FIG0905-09 | count success edges with the labels hidden | exactly 4 tree edges in success, 2 off-tree edges in muted | DOM assertion |
| REQ-FIG0905-10 | compare node centres against BRIEFING section 3 | five centres match exactly, radius 22 on each | DOM assertion |
| REQ-FIG0905-11 | desaturate the sheet and read it again | the rejected route, the tree and the two totals stay identifiable | state sweep in grayscale |
| REQ-FIG0905-12 | measure bar extents | left bar 468 units, right bar 396, both from x 110, ends 72 apart | element count |
| REQ-FIG0905-13 | read the four running sum labels along the route | `2`, `2+1=3`, `+5`, `+3` in that order from `s` to `t`, each at 15 units and opposite its weight | DOM assertion and non-author read |

## 11. Open questions
- Q1: whether the weight 4 on {s,a} should be drawn at all, since the tree ignores that edge. Kept, because a reader must be able to see that 4 is worse than 2 + 1. Evidence: a non-author read asking what `d(a)` is and why.
- Q2: whether view B should carry the difference line 13 - 11 = 2. Left out to keep one claim per view. Evidence: whether a reader states the gap of 2 without it.

## 12. Revision history
rev 1, 2026-10-22: initial spec, two views, 51 inventory rows, first pass against BRIEFING and the roster row.
rev 2, 2026-10-22: the bars widen to 36 units per cost unit and become the dominant pair, the running sum moves onto the tree at 15 units, the `a` to `t` edge returns to 1.6 with no head so it agrees with FIG-09-09, the bar end rules move from faint to muted, and the rail clearance reads 30 units in both places it is stated.
