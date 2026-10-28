# FIG-09-11: When a piece of the answer is final

status: draft   rev: 1   date: 2026-10-22   author: illustration spec agent

## 1. Summary

One sheet, three bands, one vertex. Band A holds the unweighted piece at the moment BFS first reaches `c` at layer 2, band B holds the same piece at the moment DFS closes the last branch below `c` at finish time 7, band C holds the weighted piece at the moment Dijkstra extracts `c` at 8. In all three bands `c` stands at x 620, wears the same ring and carries the same final chip 58 units below its centre, so the eye travels straight down one vertex and watches three different events make one kind of promise. MESSAGE = a vertex becomes trustworthy at three different events, and each algorithm's event has a name the reader can say.

## 2. Communicative intent

- AUDIENCE: a student who has read 9.3.2 to 9.3.4 and can run each listing by hand, and who believes the three algorithms are unrelated recipes with unrelated correctness arguments.
- INTENDED CHANGE: believe that BFS, DFS and Dijkstra answer one question, "when may this value be trusted", at three different events, and be able to name each event without the caption.
- READING CONTEXT: inside section 9.3.5, anchor section id `935-topological-order-and-cycle-detection`, after the paragraph ending "the next subsection transcribes all four into running code." Article column capped at 1120 px, light and dark, phone read in the site lightbox at 2x.
- REPRODUCTION: viewBox `0 0 1000 1048`, aspect 1000:1048, 1 unit = 1 CSS px at the 1000 unit reference width; displayed up to 1050 by 1100 px in the article column.
- LIFETIME: illustration system for the chapter, so palette, line grammar and node geometry are shared with FIG-09-01 to FIG-09-10.
- CAPTION: "BFS decides that a vertex's distance is final the first time it is reached, DFS decides that a vertex is final when its last branch closes, and Dijkstra decides that a vertex is final when it leaves the priority queue." The caption then names the three moments (first reach at layer 2, close at finish 7, extraction at 8), says that `c` is the same vertex in all three bands, and that the events differ while the claim does not. That sentence stays in the caption and never enters the SVG.
- ALT TEXT: three stacked bands over the same five vertex graph, with `c` ringed and carrying a chip with a solid rim and a dot in each band, reading `d=2` in the BFS band, `f=7` in the DFS band and `d=8` in the Dijkstra band; and every band names its algorithm, its event and its value, never a colour as the only carrier.
- ASSUMPTIONS: 1. three bands on one sheet, band index as the state, 0 to 2, default 0 (confirmed by the assignment). 2. the canonical coordinates with one translation per band, (+170, 0), (+170, 316) and (+170, 632), so `c` sits at x 620 three times (confirmed, BRIEFING section 3 allows a single translation). 3. `c` is the marked vertex in all three bands (confirmed by the assignment). 4. the BFS event is the enqueue that writes `d=2`, which is the chapter's Listing 9.1 invariant "every vertex in the queue already holds its final dist value" and the 9.6.3 sentence, while FIG-09-07 shows the same value at dequeue; the two agree because the write happens once (corrected, collected as Q1). 5. the node budget is the 380 ceiling claimed for a multi-band sheet (corrected, collected as Q2). 6. floors 30, 39 and 41 come from the section 6 inventory (confirmed).

## 3. Goals and non-goals

- GOAL-1: the reader can name the event in each band after one pass, because each band prints the event in two lines and the ring prints its short name, and leaves with the chapter's question attached to three concrete moments.
- GOAL-2: the reader can see that the marked vertex is one vertex at one x, not three examples, without reading the caption.
- GOAL-3: the reader can say which value became final in each band, because exactly one chip per band carries the final role.
- GOAL-4: the reader can check the Dijkstra arithmetic `8+3=11` against two drawn weights.
- NON-GOAL-1: no priority queue internals, no heap shape, no extract-min trace (FIG-09-09 owns the ladder).
- NON-GOAL-2: no queue strip and no layer bands (FIG-09-07), no interval timeline (FIG-09-08).
- NON-GOAL-3: no second start vertex, no second graph, no unreachable vertex.
- NON-GOAL-4: no ranking, no cost comparison between the algorithms, no "faster" or "better".
- NON-GOAL-5: no code, and no sentence of the chapter inside the drawing.

## 4. Constraints

- canvas: viewBox `0 0 1000 1048`, aspect 1000:1048, 1 unit = 1 CSS px at the 1000 unit reference width, declared local; three bands, tops at y 52, 368 and 684, each 920 by 292 with a 24 unit gap and one pitch of 316; 40 units of margin left and right, 52 above band A, 24 below the footer; one unit scale for all three bands, so no band is a detail of another and no requirement compares lengths across scales.
- node budget: 380 live marks, the multi-panel ceiling of BRIEFING section 4 claimed for a three band sheet; the inventory reaches 113.
- palette budget: the eight role rows of the section 5 table, no hue added, no raw hex inside the drawing.
- typography: Montserrat, self-hosted by the site. Canvas units: vertex id 18, band name 16 semibold, values, weights, ring labels and event lines 15, footer note 14. Nothing below 14.
- text split: prose lives in the caption. In SVG labels are vertex ids, single values `d=2`, `f=7`, weights, one to three word event names, and four gutter lines per band of at most 24 characters.
- convention: flat schematic, one projection, declared once in section 5.
- time appetite: the three bands are one graph placed three times, so the build time goes to the `c` furniture and to the seven weight labels of band C.
- detail: full
- element floor: band A 30, band B 39, band C 41, counted from the section 6 inventory.
- boundaries: Always state values from BRIEFING section 2 and the replayed traces; Ask first before dropping a band, a weight or the footer note; Never a number with no ledger row, nor an em dash or en dash.
- claim status: distances `d(s)` 0, `d(b)` 2, `d(a)` 3, `d(c)` 8, `d(t)` 11 and the settle order `s`, `b`, `a`, `c`, `t` (verified, BRIEFING section 2). the seven weights 4, 2, 1, 5, 8, 3, 10 (verified, section 2). DFS times discover `c` 4 and finish `c` 7, finish `t` 6, parent chain `s` `a` `b` `c` `t` (verified, section 2, recomputed). the event that writes `d=2`, namely the dequeue of `a` at which `c` and `t` are reached and the queue becomes `b c t` (derived, Listing 9.1 replayed on the adjacency order of section 2). layer 2 is `{c, t}` (derived, same replay). `8+3=11` (derived, `d(c)` plus the weight of `{c,t}`). band, ring, chip and weight coordinates (local, declared in sections 8 and 9). No claim in this file is unsourced.

## 5. Visual system lock

- projection: flat schematic, one per sheet, no perspective, no isometric.
- line grammar: outline 3.2, edge, connector and annotation 1.6, hairline and panel frame 1.0, ratio 2:1 between outline and edge. A panel frame is 1.0 in border, never 3.2. A chip is 1.6 in muted and takes a state only with a fill, a dot or a label beside it. One arrowhead on the sheet, a filled triangle 14 long and 10 wide, on the relaxation flow; no leader carries a head and no dashed line appears here, because nothing on the sheet is hidden or secondary.

| NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
|---|---|---|---|---|
| ink | #15181e | #e8eaef | structure and primary text | vertex ids, values, weights, band names, gutter lines |
| muted | #5c6470 | #a3abba | meaningful secondary | edges, unfocused rims, unfocused event lines, footer |
| border | #e7eaf0 | #262b36 | decorative separation | the three band frames |
| card | #ffffff | #15181e | panel fill | band base, chips, plate |
| accent | #1d4ed8 | #7aa2ff | active, current | marked ring, ring label, active path, relaxation flow, focused rim |
| accent-soft | #eef3fe | #16213c | active wash | active path underlay, focused plate fill |
| accent-ink | #14357f | #c7d6ff | text on accent-soft | the focused band letter |
| success | #157347 | #4ade80 | final, settled, verified | the one final chip per band and its dot |

- value plan: card, accent-soft and ink are the three foundation values. The strongest junction on the sheet is the success rim of a final chip against card, repeated three times on one vertical line, and that line is the dominant element named in section 8.
- contrast, quoted from BRIEFING section 5 so a builder cannot substitute a guess: ink on card 17.78 light and 14.77 dark; muted on card 5.98 and 7.7; accent on card 6.7 and 7.14; accent-ink on accent-soft 10.23 and 11.0; success on card 5.87 and 10.2; border on card 1.21 and 1.25. Consequences applied here: every value and every gutter line sits in ink or muted, the footer note sits in muted at 14, and border carries the three frames only, never a stroke that means something.
- light: flat, no light source, no shadow, no gradient. Depth on this sheet is temporal, not spatial.
- detail floor: no meaningful mark below 1.0 units, no text below 14, no dot below radius 4.
- style reference: FIG-09-09 owns the weighted piece and FIG-09-07 owns the BFS band vocabulary; this sheet reuses both and adds only the register through `c`.

## 6. Content inventory

| view | job in the argument | depends on | element floor |
|---|---|---|---|
| A | BFS reaches `c` at layer 2 and its distance is written once, so the value is final at the enqueue | none | 30 |
| B | DFS closes the last branch under `c` at time 7, so `c` is final when the recursion returns | A, same piece | 39 |
| C | Dijkstra extracts `c` at 8 with `b` at 2 and `a` at 3 already final, so the value is final when it leaves the queue | A, weighted piece | 41 |

The count column gives live marks per class. Layout: band tops 52, 368, 684; nodes at the section 3 coordinates translated by (+170, 0), (+170, 316), (+170, 632).

| ID | element | job in the argument | must show | count | label | convention |
|---|---|---|---|---|---|---|
| A-01 | band A frame | separates the first moment from the other two | rect 40,52 920 by 292, 1.0 border, card fill | 1 | none | flat |
| A-02 | letter plate and letter | carries the state, the band being read | rect 30 by 30, r 6, at 60,92; focused: accent-soft fill, 1.6 accent rim, accent-ink letter | 2 | A | flat |
| A-03 | band name | names the algorithm of this moment | 16 semibold ink at 102,112 | 1 | BFS | flat |
| A-04 | gutter lines | state the graph, the event and the claim | 15 at x 60, baselines 146, 174, 202, 230 | 4 | unweighted / layer 2, at enqueue / final at first reach / d=2 written once | flat |
| A-05 | edges | the seven edges of the unweighted piece | 1.6 muted, straight, no head | 7 | none | flat |
| A-06 | node circles and ids | the five vertices and their names | r 22, 3.2 ink, card fill; ids 18 ink centred | 10 | s a b c t | flat |
| A-07 | marked ring | the vertex this band is about | r 26, 3.2 accent, no fill, centred on `c` at 620,210 | 1 | none | flat |
| A-08 | ring label | names the event at the ring | 15 accent, right aligned at 588,214, 6 left of the ring | 1 | first reach | flat |
| A-09 | final chip and dot | the value that becomes trusted here | rect 46 by 26, r 6, centre 620,268, 3.2 success rim, card fill; dot r 4 success at 606,268 | 2 | none | flat |
| A-10 | final chip value | the distance written at the enqueue | 15 ink centred at 626,277 | 1 | d=2 | flat |
| B-01 | band B frame | separates the second moment | rect 40,368 920 by 292, 1.0 border, card fill | 1 | none | flat |
| B-02 | letter plate and letter | the band being read | rect 30 by 30 at 60,408, as A-02 | 2 | B | flat |
| B-03 | band name | names the algorithm of this moment | 16 semibold ink at 102,428 | 1 | DFS | flat |
| B-04 | gutter lines | state the event and the claim | 15 at x 60, baselines 462, 490, 518, 546 | 4 | unweighted / at last close / final when the last / branch closes | flat |
| B-05 | edges | the same seven edges, no weight | 1.6 muted, no head | 7 | none | flat |
| B-06 | active path | the path the recursion is on | 6 units accent-soft underlay plus 1.6 accent over it, on `s` `a`, `a` `b`, `b` `c`, no head | 6 | none | flat |
| B-07 | node circles and ids | the five vertices and their names | r 22, 3.2 ink, card fill; ids 18 ink centred | 10 | s a b c t | flat |
| B-08 | marked ring | the vertex closing now | r 26, 3.2 accent, at 620,526 | 1 | none | flat |
| B-09 | ring label | names the event at the ring | 15 accent, right aligned at 588,530, 6 left of the ring | 1 | last branch | flat |
| B-10 | final chip and dot | the finish time, in the final role | rect 46 by 26 at 620,584, 3.2 success rim; dot r 4 at 606,584 | 2 | none | flat |
| B-11 | final chip value | the finish time | 15 ink centred at 626,593 | 1 | f=7 | flat |
| B-12 | plain values | one interval, two values, neither a verdict | 15 ink, no rim: `d=4` at 668,566 and `f=6` at 790,564 | 2 | d=4 f=6 | flat |
| B-13 | path label | names the accent run | 15 accent at 365,518, inside the `s` `a` `b` triangle | 1 | active path | flat |
| C-01 | band C frame | separates the third moment | rect 40,684 920 by 292, 1.0 border, card fill | 1 | none | flat |
| C-02 | letter plate and letter | the band being read | rect 30 by 30 at 60,724, as A-02 | 2 | C | flat |
| C-03 | band name | names the algorithm of this moment | 16 semibold ink at 102,744 | 1 | Dijkstra | flat |
| C-04 | gutter lines | state the event and the claim | 15 at x 60, baselines 778, 806, 834, 862 | 4 | weighted / at extract-min / final when it leaves / the queue at 8 | flat |
| C-05 | weighted edges | the same seven edges, now weighted | 1.6 muted, no head | 7 | none | flat |
| C-06 | weight labels | the numbers the arithmetic reads | 15 ink, each 16 to 24 units from its edge midpoint on the side the sheet leaves open: 356,774 / 372,873 / 434,832 / 526,800 / 542,901 / 660,826 / 625,772 | 7 | 4 2 1 5 8 3 10 | flat |
| C-07 | node circles and ids | the five vertices and their names | r 22, 3.2 ink, card fill; ids 18 ink centred | 10 | s a b c t | flat |
| C-08 | marked ring | the vertex leaving the queue | r 26, 3.2 accent, at 620,842 | 1 | none | flat |
| C-09 | ring label | names the event at the ring | 15 accent, right aligned at 588,846, 6 left of the ring | 1 | extracted | flat |
| C-10 | final chip and dot | the settled distance, in the final role | rect 46 by 26 at 620,900, 3.2 success rim; dot r 4 at 606,900 | 2 | none | flat |
| C-11 | final chip value | the settled distance | 15 ink centred at 626,909 | 1 | d=8 | flat |
| C-12 | neighbour values | already final before `c` leaves | 15 ink, no rim: `d=3` at 500,724 and `d=2` at 500,940 | 2 | d=3 d=2 | flat |
| C-13 | relaxation flow | what the extraction is for | path 690,850 to 746,850, 1.6 accent, head 14 by 10 at the `t` end, 8 below the `c` to `t` edge and 22 left of `t` | 1 | none | flat |
| C-14 | relaxation arithmetic | the value the edge lowers | 15 ink centred at 700,872, below the flow | 1 | 8+3=11 | flat |

Footer, outside the three bands: `events differ,` at 60,1004 and `the claim does not` at 60,1024, both 14 muted, and `c in all three bands` right aligned at 940,1014, 14 muted. View A reaches 30 live marks, B 39, C 41; with the three footer texts the sheet reaches 113.

## 7. Requirements

- REQ-FIG0911-01 [MUST-STANDARD] One sheet 1000 units wide carries three bands A, B, C stacked in the chapter's order 9.3.2, 9.3.3, 9.3.4, each closed by a frame 1.0 in border on card, and no band is cropped. (source: BRIEFING section 4 canvas, section 5 panel frame 1.0)
- REQ-FIG0911-02 [MUST-STANDARD] Each band draws the five vertices at the BRIEFING section 3 coordinates translated by (+170, 0), (+170, 316) and (+170, 632), radius 22, id 18 centred, so `c` stands at x 620 in all three bands. (source: BRIEFING section 3, one translation per band)
- REQ-FIG0911-03 [MUST-STANDARD] Band A is BFS on the unweighted piece: `c` is first reached at layer 2, its chip reads `d=2` and takes the final role at the enqueue that writes the value, and the ring label reads `first reach`. (source: chapter 9.3.2 Listing 9.1 invariant and 9.6.3; derived by replay, `c` is reached when `a` is dequeued)
- REQ-FIG0911-04 [MUST-STANDARD] Band B is DFS on the same piece: `c` reads `d=4` above it and `f=7` in the final chip below it, `t` reads `f=6`, and the active path `s` `a` `b` `c` is drawn in accent over a 6 unit accent-soft underlay. (source: BRIEFING section 2 times, recomputed; parent chain s a b c t)
- REQ-FIG0911-05 [MUST-STANDARD] Band C is Dijkstra on the weighted piece with all seven weights at 15: `c` carries `d=8` in the final role, `a` carries `d=3`, `b` carries `d=2`, and one relaxation flow labelled `8+3=11` runs from `c` toward `t`. (source: BRIEFING section 2 weights, settle order and distances, recomputed)
- REQ-FIG0911-06 [MUST-LOCAL] Exactly one vertex per band carries the marked ring, the ring is on `c` in all three bands, and it is r 26 at 3.2 accent with no fill. (why: the vertical path through one vertex is the figure's argument)
- REQ-FIG0911-07 [MUST-LOCAL] Exactly one chip per band takes the final role, it is the chip of `c`, and that role is a 3.2 success rim plus a 4 unit success dot plus the gutter event line. (why: WCAG 1.4.1; BRIEFING section 5 chip rule, a chip takes 3.2 only when the state is also a dot or a label)
- REQ-FIG0911-08 [MUST-LOCAL] Every other value on the sheet is plain text at 15 in ink with no rim, so a value can be told from a verdict without reading the digits. (why: one finality event per band, and a second rim would claim a second)
- REQ-FIG0911-09 [MUST-STANDARD] Line grammar holds: outline 3.2, edge and connector 1.6, hairline and frame 1.0, chip 1.6 muted unless it carries state, one arrowhead 14 by 10 on the relaxation flow and none elsewhere. (source: BRIEFING section 5)
- REQ-FIG0911-10 [MUST-STANDARD] Type is 18 for ids, 16 semibold for band names, 15 for values, weights, ring labels and gutter lines, 14 for the footer, and nothing below 14. (source: BRIEFING section 4)
- REQ-FIG0911-11 [MUST-STANDARD] Text meets 4.5 to 1 and meaningful strokes 3 to 1 on card in both themes at the ratios quoted in section 5, no text sits on border, and border carries no stroke that means something. (source: WCAG 1.4.3, 1.4.11; BRIEFING section 5 verified contrast)
- REQ-FIG0911-12 [MUST-STANDARD] Values print as `d=` and `f=` at 15 units, without spaces, in the same notation in all three bands, and no value carries a unit. (source: BRIEFING section 4 distance notation; chapter 9.2.3)
- REQ-FIG0911-13 [MUST-LOCAL] The footer carries one note in exactly two lines, `events differ,` and `the claim does not`, at 14 in muted, and no third line extends the note. (why: the assignment fixes this note and its length)
- REQ-FIG0911-14 [MUST-LOCAL] Nothing on the sheet ranks the three algorithms: no ordinal on a band, no word of preference, no arrow between bands, and the three bands share one width, one node radius and one edge weight. (why: three events, not three scores)
- REQ-FIG0911-15 [MUST-LOCAL] Band A holds at least 30 live marks, band B at least 39 and band C at least 41, counted as descendants of each band group with `querySelectorAll("*")`. (why: floors set from the section 6 inventory)
- REQ-FIG0911-16 [MUST-STANDARD] Every role is a function of the band and the vertex, never of the state: the three states differ only in which letter plate is filled and which gutter lines sit at ink, and the chips, plain values, weights and path are identical across states. (source: section 9b DERIVED and INV-05)
- REQ-FIG0911-17 [MUST-STANDARD] INV-01 to INV-07 hold at each band index 0, 1 and 2, and the sweep reports the first failing index by value. (source: section 9b)
- REQ-FIG0911-18 [SHOULD] The caption carries the closing sentence of 9.6.3 verbatim and names the anchor section `935-topological-order-and-cycle-detection`, and no sentence of the chapter appears inside the drawing, at the cost of three caption lines. (why: that sentence is the figure's thesis and the sheet has no room for it)

## 8. Composition plan

- DOMINANT: the column through `c` at x 620, three rings from y 184 to 868 and three final chips on the same vertical, the only element repeated at the same x three times.
- FOCAL MECHANISM: alignment first, three `c` nodes on one vertical so the comparison needs no legend; value contrast second, the success rim of a chip against card, the strongest junction on the sheet; isolation third, 24 unit gaps and 40 unit margins hold the three moments apart, and the gutter column ends at 240 where the graph starts at 258.
- HIERARCHY: level 1 the three final chips, level 2 the marked rings and ring labels, level 3 the gutter lines, the weights and the plain values.
- READING PATH: plate A at 60,92, the four gutter lines of band A, the ring label `first reach`, the chip `d=2` below `c`, then straight down through band B's ring and chip and band C's ring and chip, then the footer note at 60,1004.
- BALANCE: asymmetric by mass. The graph runs x 258 to 812 and the gutter x 60 to 240; band C is heavier on the right because of the seven weights and the relaxation flow, and the footer note answers that mass at the bottom left while the register label closes the bottom right.
- FRAMING AND NEGATIVE SPACE: no crop, 40 units of margin left and right, 52 above band A, 24 below the footer; the 24 unit gaps carry no rule and the empty upper right of bands A and B keeps the eye on the `c` column, while the 148 units right of `t` stay empty except in band C, which makes the weighted band visibly the busiest of the three.
- GROUPING: bands 292 tall with 24 gaps, so the gap is a twelfth of a band; chips 58 from the centre of their vertex; weights 16 to 24 from their own edge; the ring and its label 6 apart, inside the `a` `b` `c` triangle.

## 9. Build contract

- steps: 5. 0: three frames, three plates with letters and names, the twelve gutter lines. 1: the fifteen node circles and their ids, the twenty one edges, in all three bands. 2: band C's seven weight labels. 3: the `c` furniture, three rings, three ring labels, three chips with values and dots. 4: band B's underlay, stroke and two plain values, band C's two plain values, the relaxation flow and its label, the footer note.
- interaction: a three position band control, default 0, because a reader who wants one moment at a time should not have to read three; the static sheet is complete without it.
- animation: none. The three moments are not a sequence, so a timeline would assert an order that does not exist.
- ids and classes: DOM ids equal the inventory IDs, grouped under `band-0`, `band-1`, `band-2`; classes `r-final`, `r-plain`, `r-marked`, `is-focus`.
- verification hooks: `?band=0` to `?band=2` forces a state, `&audit=1` prints the live count per band group and asserts INV-01 to INV-07 across all three bands at that state.
- commands: `python3 ~/.hermes/skills/svg/illustration-spec/scripts/check_spec.py docs/figures/dsa-09-graphs/FIG-09-11-when-final.md`; `python3 docs/figures/dsa-09-graphs/verify_specs.py`; `python3 pipeline/verify.py --fig FIG-09-11 --sweep band=0:2 --assert INV-01..INV-07`.

## 9b. Mechanism and state model

- STATE: `band`, the index of the band being read, integer 0 to 2, step 1, default 0. All three bands are always drawn; the state moves the reading focus and nothing else.
- DATUM: `band` 0 is BFS, the moment `c` is first reached at layer 2 and `d=2` is written at the enqueue, drawn at the section 3 coordinates with no vertical translation. The other two bands keep their own moments at every state, so the sheet never shows a partial graph.
- DERIVED, one formula per element class, with `k` the band index:
  - `role(c, k)`: k 0 final chip `d=2`; k 1 final chip `f=7` plus the plain value `d=4`; k 2 final chip `d=8`. The marked ring is on `c` at every k.
  - `plain(v, k)`: k 0 none; k 1 `t` reads `f=6`; k 2 `a` reads `d=3` and `b` reads `d=2`. Every plain value sits at 15 in ink with no rim.
  - `y` offset of a band: 316 times its index, so the three `c` centres are 210, 526 and 842.
  - `chip(c, k)`: centre at 620 and `c.y + 58`, so 268, 584 and 900, the same offset three times.
  - `plate(k)`: the plate of band k takes accent-soft and a 1.6 accent rim and its letter accent-ink; the other two keep card, a 1.6 muted rim and an ink letter.
  - `event lines(k)`: the gutter lines of band k sit at ink, the other two at muted; the text of a gutter line never changes with the state.
  - `weights(k)`: the seven labels exist only at k 2, at the midpoints named in C-06. `path(k)`: the underlay and the accent stroke exist only at k 1, on `{s,a}`, `{a,b}` and `{b,c}`.
- CHAIN: `band` -> focused plate and focused gutter rows; band index -> y translation -> node, edge, chip and label positions; the roles themselves hang off the vertex and the band, never off the state.
- INVARIANTS:
  - INV-01 Exactly one vertex per band carries the marked ring, it is `c` in all three, so the sheet draws three rings and all three are on `c`.
  - INV-02 Exactly one chip on the sheet takes the final role at each band, it is the chip of `c`, and no other chip exists anywhere, so the count of chips is three and each carries a success rim and a dot.
  - INV-03 The three final chips share x 620 and the offset `c.y + 58`, so their centres are collinear within 0.5 units and the reading path is vertical.
  - INV-04 The node and edge sets are identical in the three bands, fifteen node circles and twenty one edges on the sheet, and no band adds, drops or moves a vertex or an edge; band C adds seven weight labels and no edge.
  - INV-05 Every role is independent of the state: at `band` 0, 1 and 2 the chips, plain values, weights, path and ring positions are unchanged, and only the plate fill, the plate rim and the ink of the gutter lines differ.
  - INV-06 Every value label matches `d=` or `f=` plus digits at 15 units, every label is at most 24 characters over at most 2 lines, and no label leaves its band frame.
  - INV-07 No band draws a second start vertex, and no text on the sheet carries an ordinal or a comparison between the three algorithms.
- SAMPLED STATES: `band` 0, the datum, BFS focused, the frame the chapter publishes; `band` 1, DFS focused, the only band whose vertex carries two values, which is where the interval reading has to hold; `band` 2, Dijkstra focused, the only weighted band, where the arithmetic `8+3=11` and both neighbour values are visible at once.
- SWEEP: every value 0 to 2 by `verify.py --sweep band=0:2 --assert INV-01..INV-07`, which asserts the invariants across all three bands at each state and names the first failing state together with the invariant it broke.

## 10. Acceptance criteria

| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0911-01 | count band frames and compare their fills | three frames at y 52, 368, 684, each 920 by 292, stroke 1.0 border, card fill | DOM assertion |
| REQ-FIG0911-02 | compare node centres with the canonical table plus each translation | 15 of 15 within 0.5 units, `c` at x 620 three times | geometry assertion |
| REQ-FIG0911-03 | read band A's chip, ring label and gutter lines | `d=2` with a success rim and a dot, `first reach`, `layer 2, at enqueue` present | DOM assertion plus replay |
| REQ-FIG0911-04 | read band B's values and path | `d=4`, `f=7`, `f=6` present, three edges at 1.6 accent over a 6 unit accent-soft underlay | DOM assertion |
| REQ-FIG0911-05 | read band C's weights, values and flow | seven weights, `d=8` final, `d=3`, `d=2`, one head, label `8+3=11` | DOM assertion plus arithmetic replay |
| REQ-FIG0911-06 | count rings and their centres | three rings, r 26, 3.2 accent, all on `c` | DOM assertion |
| REQ-FIG0911-07 | count chips and read their roles | three chips, each 3.2 success, each with a r 4 dot | DOM assertion, both themes |
| REQ-FIG0911-08 | scan every value label for a rim | all plain values have no stroke and sit at 15 in ink | DOM assertion |
| REQ-FIG0911-09 | read every stroke width on the sheet | outlines 3.2, edges 1.6, frames 1.0, chips 1.6 muted or 3.2 with a dot, one head 14 by 10 | stroke dump |
| REQ-FIG0911-10 | read computed font sizes | the set is a subset of 14, 15, 16, 18, none below 14 | computed style dump |
| REQ-FIG0911-11 | compute each pair from the section 5 hexes | ink 17.78, muted 5.98, accent 6.7, success 5.87, accent-ink on accent-soft 10.23, all above threshold | contrast computation, both themes |
| REQ-FIG0911-12 | scan every value string | every value matches `d=` or `f=` plus digits, no spaces, no unit | text scan |
| REQ-FIG0911-13 | read the footer | exactly two note lines of 14 and 18 characters at 14 muted, no third line | text scan |
| REQ-FIG0911-14 | scan the sheet for ordinals and comparisons | zero ordinals on a band, zero comparative words, zero arrows between bands | non-author read plus text scan |
| REQ-FIG0911-15 | count descendants per band group | A at least 30, B at least 39, C at least 41 | `querySelectorAll("*").length` |
| REQ-FIG0911-16 | render `band` 0, 1 and 2 and diff the role elements | chips, plain values, weights and path identical in all three renders | state sweep, DOM diff |
| REQ-FIG0911-17 | run the sweep | INV-01 to INV-07 hold at every index, or the first failing index is reported | state sweep |
| REQ-FIG0911-18 | inspect the caption and the SVG text | caption carries the 9.6.3 sentence verbatim and the anchor id, no chapter sentence inside the SVG | non-author read, text scan |

## 11. Open questions

- Q1: the chapter fixes the BFS event twice, as the enqueue (Listing 9.1 invariant, "every vertex in the queue already holds its final dist value") and as the dequeue (9.3.2 prose), while 9.6.3 says "the first time it is reached". This sheet draws the first reach and prints `layer 2, at enqueue`; FIG-09-07, already written, draws the dequeue. Both are true because the value is written once, under the guard `dist[v] = infinity`, so nothing between the two events can change it. Evidence that settles the wording: the chapter author confirming that the caption sentence of 9.6.3 is the phrasing to teach, or a ruling that FIG-09-07's dequeue framing is the house line and this band should move to it.
- Q2: BRIEFING section 4 gives 220 live marks for a single view and 380 for a two panel figure, and this sheet has three bands. The sheet claims 380 and reaches 113, so the choice changes nothing at the current count, but the ceiling is claimed rather than inherited. Evidence that settles it: a ruling on the ceiling for three band sheets, which would also bind any later three band figure.
- Q3: bands A and C mark only `c` as final, so `a` at 3 and `b` at 2 print as plain values although Dijkstra has already settled them. Giving them the success rim would be truthful about Dijkstra and would break INV-02, the invariant that lets a reader see which value this band is about. Evidence that settles it: a non-author read of band C in both themes, and whether the caption says `a` and `b` were settled earlier.

## 12. Revision history

| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | first draft, three bands, band index state 0 to 2, floors 30, 39 and 41 | chapter 9 illustration plan, figure 11 of 11 |
