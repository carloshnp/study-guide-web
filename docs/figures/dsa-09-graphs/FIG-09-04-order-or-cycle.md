# FIG-09-04: Order or cycle
status: draft   rev: 2   date: 2026-10-22   author: figure spec subagent, dsa chapter 9

## 1. Summary
Two views of one five vertex directed graph, drawn on the canonical coordinates of the chapter. View A draws the five arcs `s` to `a`, `s` to `b`, `b` to `c`, `a` to `c`, `c` to `t`, then presents two order rails, `s b a c t` and `s a b c t`, at the same size and with the same treatment, each carrying its own column of checks against the same five arcs. View B adds the single arc `t` to `s`, routes it below the node row, marks the loop it closes, and puts the possibility of any order out with a prohibition glyph and a worded verdict. The beat is that a topological order is what survives a check, so two listings can both survive it, and one added arc can remove every listing at once.
MESSAGE = a listing that passes every arc is a topological order, more than one listing can pass, and one arc that closes a cycle removes all of them together.

## 2. Communicative intent
- AUDIENCE: a student revising chapter 9, fluent in the pseudocode of 9.3 and in adjacency lists. Prior belief: the order an algorithm prints is the order, so a second listing must be a mistake.
- INTENDED CHANGE: understand that a topological order is a constraint that a listing either satisfies or fails, not a canonical sequence, and that these five arcs admit two listings which are equally valid (chapter 9.2.2).
- READING CONTEXT: chapter 9.2.2, anchor section `922-orderings-when-the-edges-point-forward`, after "The order matters in practice because it is the sequence in which work may safely proceed: t may be processed only after c, and c only after both a and b." Article column capped at 1120 CSS px; light and dark themes; phone read in the site lightbox at 2x zoom.
- REPRODUCTION: viewBox 0 0 1000 940, aspect 1000:940 (1.06:1), displayed up to 1050 CSS px wide, screen only.
- LIFETIME: illustration system for the chapter; the canonical coordinates outlive this figure.
- ASSUMPTIONS: 1. one sheet, two stacked views, confirmed by BRIEFING section 6. 2. The connected piece only, `u`, `v` and `w` omitted, confirmed by the PLAN roster row. 3. The arcs and both orders are the verified set of BRIEFING section 2, confirmed. 4. Static figure, no state variable, confirmed by the assignment. 5. English labels inside the drawing, confirmed by the PLAN decisions table.

## 3. Goals and non-goals
- GOAL-1: a reader can check either rail against the five arcs and count five passes, without reading the prose.
- GOAL-2: a reader can name the two positions the rails exchange and say why the exchange is allowed: no arc joins `a` and `b`.
- GOAL-3: a reader can point at the arc `t` to `s` in view B and name the cycle it closes.
- GOAL-4: a reader leaves without a preferred order: no mark, label, hue, size or position favours `s b a c t` over `s a b c t`.
- NON-GOAL-1: naming which order DFS produces, which section 9.3.3 and FIG-09-10 own.
- NON-GOAL-2: the procedure that produces either order, DFS prepending or a queue of in degrees.
- NON-GOAL-3: strongly connected components, which the chapter names once and never works.
- NON-GOAL-4: edge weights. Orderings ignore cost and FIG-09-05 owns weights.

## 4. Constraints
- canvas: viewBox `0 0 1000 940`, aspect 1000:940, 1 unit = 1 CSS px at the 1000 unit reference width; view A panel 30,20 to 970,560; view B panel 30,590 to 970,920. Rail chips run from x 190 to x 678 in two rows, y 416 to 460 and y 482 to 526; the check table runs from x 720 to x 950; the rim of node `t` stops at x 682, so the table clears the graph by 38 units and clears the rail by 42, and no two groups share x.
- node budget: 110 live marks against the 380 ceiling for a two panel sheet, counted per instance in section 6.
- palette budget: 8 roles from the locked table plus no new hue.
- typography: Montserrat. Vertex id and rail letter 18, panel label 16 semibold, header, arc key, rail label and verdict 15, position index and note 14. Nothing below 14.
- text split: prose stays in the chapter markdown. The drawing carries vertex ids of one character, position indices of one digit, arc keys of three short tokens, and no label longer than 23 characters on one line.
- convention: flat schematic, one sheet, one projection; the graph is drawn in the sheet plane, no isometric, no perspective.
- coordinates: the five vertices are inherited from the canonical table in BRIEFING section 3. View A draws the five vertices at the canonical table coordinates with no translation; view B draws the same five at canonical x with y +505. Every offset is that single translation, not a redraw, so a reader who has seen FIG-09-03 meets the same shape here. The earlier +40/+50 and +40/+530 values were stale: +50 puts b's rim through rail one and +530 puts the back arc through b's circle.
- time appetite: one build pass and one audit pass. Above that the sheet is overbuilt for a 200 word beat.
- detail: full
- element floor: 26 in view A and 18 in view B, from the PLAN roster. The inventory reaches 80 in A and 30 in B, so a floor here is a minimum the harness asserts and not the target.
- claim status: the five arcs and the two valid orders are verified, BRIEFING section 2. The cycle view B reports, `s a c t s`, is verified with the neighbour order `s:[a,b]`, and the sheet states that order once so a reader can recompute the report; the other closed cycle that the added arc creates is not drawn, because one sheet states one order. The absence of any other arc is verified with the same list. That no arc joins `a` and `b` in either direction is derived from that list, which is the only arc set in the figure.
- boundaries: Always run the audit and count marks before reporting. Ask first before dropping a rail, an order column, or the prohibition glyph. Never assert a topological order without its five checks, never let hue carry a meaning alone, never draw one rail heavier than the other.

## 5. Visual system lock
- projection: flat schematic, one per sheet, declared once.
- line grammar: outline 3.2 on node circles and the prohibition circle. Edge, connector and annotation 1.6, ratio 2:1 to the outline. Panel frame 1.0 in `border`, because a frame separates a view and never outlines a subject. Rail chip 1.6 in `muted`, because no chip on this sheet encodes a state and a 3.2 rim is reserved for a chip that does. Hairline 1.0 on the one rule under the check header. Secondary connector 1.6 long dash 6 4, used only on the two exchange connectors, which the note "no arc joins a and b" labels. Arrowheads a filled triangle 14 long and 10 wide, on directed arcs only, never on a leader. No centreline and no cutting plane in this chapter.
- palette table, roles only, both themes under the same names:

| NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
|---|---|---|---|---|
| ink | #15181e | #e8eaef | structure and primary text | vertex ids, headers, arc keys, rail labels, verdict text |
| muted | #5c6470 | #a3abba | meaningful secondary | the two arcs off the cycle, notes, exchange connectors |
| border | #e7eaf0 | #262b36 | decorative separation | the two panel frames, the check header rule |
| card | #ffffff | #15181e | panel fill | panel and node fill |
| accent-soft | #eef3fe | #16213c | active wash | the ten rail chips, the only tinted field on the sheet |
| accent-ink | #14357f | #c7d6ff | text on accent-soft | rail letters and position indices |
| success | #157347 | #4ade80 | final, verified | the ten check ticks and the two rail verdicts |
| warning | #b42318 | #f87171 | contradiction | the three cycle arcs, the back arc, the cycle label, the prohibition glyph |

- not used: accent, because no vertex is current on a static sheet; faint, because 3.13 against card cannot carry text and nothing on this sheet is a mere aid; wash, because there is no zebra row. Each absence is a decision, not an omission.
- value plan: three foundation values, card, accent-soft and ink, with ink the darkest text. The rails hold the only tinted field and the only text set on a tint, accent-ink on accent-soft at 10.23 light and 11.0 dark, which is where the sheet's strongest junction on a tint sits. Hue never travels alone: every warning mark also carries a dash, a shape or a word.
- light: flat, no light source, no shadow, no gradient. Depth on this sheet is temporal: the sheet before the arc `t` to `s`, and after it.
- detail floor: 14 units of type and 1.0 unit of rule. At the 1050 px display width the scale is 1.05, so 14 units is 14.7 CSS px and 1 unit is 1.05 CSS px; nothing meaningful sits below either.
- style reference: none yet. No rendered frame exists in this phase; the line grammar above and the role rows are the reference until G1 thumbnails supply one frame.
- contrast, quoted from BRIEFING section 5: ink on card 17.78 light and 14.77 dark; muted on card 5.98 and 7.7; accent-ink on accent-soft 10.23 and 11.0; success on card 5.87 and 10.2; warning on card 6.57 and 6.43. Faint on card is 3.13 and is excluded from text for that reason.

## 6. Content inventory
Two views on one sheet. The view map fixes the job of each view and the minimum count the harness asserts. The inventory fixes every mark, its role and its label. A repeated mark is one row with a quantity, and the harness counts the quantity per instance. A mark without a job is deleted, not shrunk.

| view | job in the argument | depends on | element floor |
|---|---|---|---|
| A | five arcs admit two listings, and both pass, shown as two columns of ticks against one arc key | none | 26 |
| B | one arc more closes the loop `s a c t s`, no listing survives, so an order exists exactly when no cycle does | A | 18 |

| ID | element | view | job in the argument | must show | qty | role |
|---|---|---|---|---|---|---|
| A-01 | panel frame | A | bounds view A | rect 30,20 to 970,560 | 1 | border 1.0 |
| A-02 | panel label | A | names the view in three words | text "A  two valid orders" at 56,60 | 1 | ink 16 semibold |
| A-03 | node | A | the five vertices, at canonical positions | circles r 22 at s 150,260; a 320,150; b 320,350; c 490,260; t 660,260 | 5 | card fill, ink 3.2 |
| A-04 | vertex id | A | identifies the vertex | one character centred on its node | 5 | ink 18 |
| A-05 | arc | A | the constraints both orders must satisfy | five 1.6 lines with the trims of section 9 | 5 | muted 1.6 |
| A-06 | arrowhead | A | gives each arc its direction | filled triangle 14 by 10 at the head | 5 | muted |
| A-07 | note | A | states why the exchange is allowed | text "no arc joins a and b" at 150,404 | 1 | muted 14 |
| A-08 | check header | A | keys the two tick columns to the two rails | "arc", "order 1", "order 2" at y 150 | 3 | ink 15 |
| A-09 | header rule | A | separates key from ticks with a hairline | line 720,162 to 950,162 | 1 | border 1.0 |
| A-10 | arc key | A | names each arc once for both columns | "s to a", "s to b", "b to c", "a to c", "c to t", left anchored at x 730 | 5 | ink 15 |
| A-11 | tick | A | the per arc result of the check | drawn path 14 by 10 in the order's column | 10 | success |
| A-12 | rail label | A | names the rail, matching its column header | "order 1", "order 2" at x 60, on the chip row centre | 2 | ink 15 |
| A-13 | rail chip | A | holds one position of one order | rounded rect 88 by 44, gap 12, first at x 190, last chip closing at x 678; rail one at y 416 to 460, rail two at y 482 to 526 | 10 | accent-soft, muted 1.6 |
| A-14 | position index | A | makes the check reproducible by the reader | digit 1 to 5 at the chip's top left | 10 | accent-ink 14 |
| A-15 | rail letter | A | states which vertex holds that position | one character centred in the chip | 10 | accent-ink 18 |
| A-16 | verdict tick | A | closes the column with its result | path 16 by 12 under the last key row, centred 858,370 and 926,370 | 2 | success |
| A-17 | verdict word | A | words the result that the ticks show | "passes" centred 858,396 and 926,396, at the foot of its own column | 2 | success 15 |
| A-18 | exchange connector | A | shows the two positions that swap | 6 4 dashed lines a2 to a3 and b3 to b2 | 2 | muted 1.6 |
| B-01 | panel frame | B | bounds view B | rect 30,590 to 970,920 | 1 | border 1.0 |
| B-02 | panel label | B | names the view's one change | text "B  the arc t to s" at 56,618 | 1 | ink 16 semibold |
| B-03 | node | B | the same five vertices, same translation | canonical table plus x 0, y +505 | 5 | card fill, ink 3.2 |
| B-04 | vertex id | B | identifies the vertex | one character centred on its node | 5 | ink 18 |
| B-05 | arc on the cycle | B | the three arcs the loop runs through | s to a, a to c, c to t | 3 | warning 1.6 |
| B-06 | arc off the cycle | B | shows `b` is outside the loop | s to b, b to c | 2 | muted 1.6 |
| B-07 | arrowhead | B | gives each arc its direction | filled triangle 14 by 10, role of its arc | 6 | muted or warning |
| B-08 | back arc | B | the one arc added in this view | t 660,764 down, left at y 895, up to s 150,764 | 1 | warning 1.6, corners r 12 |
| B-09 | cycle label | B | names the loop the added arc closes | "cycle s a c t s" at 734,676 | 1 | warning 15 |
| B-10 | added arc label | B | marks the one new constraint | "new arc t to s" at 700,812 | 1 | warning 15 |
| B-11 | prohibition circle | B | marks the order as refused, by shape | circle r 12 at 714,636 | 1 | warning 3.2 |
| B-12 | prohibition diagonal | B | completes the refusal glyph | line through the circle at 45 degrees | 1 | warning 1.6 |
| B-13 | verdict text | B | words the refusal | "no order exists" at 738,642 | 1 | ink 15 |
| B-14 | neighbour order note | B | states the order the traversal used, so the reported cycle can be recomputed | "neighbour order s:[a,b]" at 760,618 | 1 | muted 14 |

## 7. Requirements
- REQ-FIG0904-01 [MUST-STANDARD] View A draws exactly the five arcs `s` to `a`, `s` to `b`, `b` to `c`, `a` to `c`, `c` to `t`, each a 1.6 muted line running from a point 24 units out from the tail centre to a point 24 units out from the head centre, each with a filled arrowhead 14 long and 10 wide (source: BRIEFING section 2 arc list, verified).
- REQ-FIG0904-02 [MUST-LOCAL] Both rails use the same chip size 88 by 44, the same 1.6 `muted` rim, the same 18 unit letter and the same verdict mark, so no reader can rank them, and no chip takes a 3.2 rim because no chip carries a state (why: the plan makes the two rails jointly dominant and the briefing reserves the heavy chip rim for a state).
- REQ-FIG0904-03 [MUST-STANDARD] Rail one reads `s b a c t` at positions 1 to 5 and rail two reads `s a b c t` at positions 1 to 5, with the position printed inside each chip at 14 units (source: BRIEFING section 2, both orders verified).
- REQ-FIG0904-04 [MUST-LOCAL] The check key lists the five arcs in the order of REQ-FIG0904-01 and each order column carries five ticks, one per key row, so the check is per arc and never a total, and view B states the neighbour order `s:[a,b]` exactly once so the reported cycle can be recomputed (why: the plan forbids an order asserted without the arc check, and a reported cycle without its neighbour order).
- REQ-FIG0904-05 [MUST-STANDARD] No meaning is carried by hue alone. A tick is a drawn 14 by 10 path, not a coloured dot; the added arc carries the words "new arc t to s"; the refused order carries a prohibition glyph, a 3.2 circle with a 1.6 diagonal, plus the words "no order exists" (source: WCAG 1.4.1).
- REQ-FIG0904-06 [MUST-STANDARD] Every text role meets 4.5:1 against its surface on the quoted pairs: ink on card 17.78 and 14.77, muted on card 5.98 and 7.7, accent-ink on accent-soft 10.23 and 11.0, success on card 5.87 and 10.2, warning on card 6.57 and 6.43 (source: WCAG 1.4.3 and BRIEFING section 5).
- REQ-FIG0904-07 [MUST-STANDARD] Type sizes are 18 for vertex ids and rail letters, 16 semibold for panel labels, 15 for headers, arc keys, rail labels and verdicts, and 14 for position indices and notes, with no size below 14 (source: BRIEFING section 4).
- REQ-FIG0904-08 [MUST-LOCAL] The arc `t` to `s` leaves `t` downwards, runs at y 895 and enters `s` from below with a 24 unit trim, crossing no node and no other arc, because the canonical row puts `s`, `c` and `t` on one line and a straight back arc would pass through `c` (why: geometry, BRIEFING section 3).
- REQ-FIG0904-09 [MUST-LOCAL] The exchange between the rails is two 6 4 dashed connectors from the `a` chips and the `b` chips, crossing between the rows, with the note "no arc joins a and b" in the band above rail one (why: the exchange is the only difference between the two orders and one fact makes it legal).
- REQ-FIG0904-10 [MUST-LOCAL] No label, hue, size or position ranks the rails: both verdicts read "passes", the columns are headed "order 1" and "order 2", and the drawing never applies the words correct, preferred, canonical or first to either rail.
- REQ-FIG0904-11 [MUST-LOCAL] View B keeps the five arcs and adds one, keeps `s` to `b` and `b` to `c` muted and turns `s` to `a`, `a` to `c` and `c` to `t` warning, so the three warning arcs plus the back arc trace the loop `s a c t s`, and view B carries no rails, so the absent rail is the argument (why: an order that fails has nothing to show).
- REQ-FIG0904-12 [SHOULD] Every in figure label is 24 characters or fewer on one line, and only the note "no arc joins a and b" and the note "neighbour order s:[a,b]" run past 20 characters (cost: two strings must be abbreviated and the caption carries the rest).

## 8. Composition plan
- DOMINANT: the two order rails, ten chips running from x 190 to x 678, the widest marks on the sheet and the only tinted field.
- FOCAL MECHANISM: size, two 88 by 44 chip rows against five 44 unit circles; detail density, thirty eight marks in the rails and their two connectors against twenty in the graph and nineteen in the check table; isolation, a note and a 42 unit band of empty sheet separate the rails from the check table, and 38 units separate that table from the graph.
- HIERARCHY: level 1 the rails; level 2 the graph and its arcs; level 3 the check key, the notes and the verdicts.
- READING PATH: entry at the graph's two out arcs, `s` to `a` and `s` to `b`; second, down into rail one and only then rail two, as a pair; third, right into the two columns of ticks; payoff at the prohibition glyph in view B, which is reached before the graph because it sits in open space.
- BALANCE: asymmetrical. The graph mass at the top left is answered by the check table at the top right and by the rails spanning the lower band, so no corner carries weight alone.
- FRAMING: two stacked panels, 30 units of margin, no crop; each panel label sits at the top left corner of its panel.
- NEGATIVE SPACE: the band between the graph and rail one carries the note; the open right side of view B carries the verdict, so the refusal is met without crossing a single arc.
- GROUPING: 12 between chips inside a rail, 66 between rails, 34 between key rows; the two exchange connectors are the only marks allowed to cross a group boundary, and the 42 unit band between the rail end at x 678 and the table at x 720 is held empty at every build.

## 9. Build contract
- steps: 6. 0: frame both panels and place the five vertices under each view's single translation. 1: draw the five arcs from the trims below, arrowheads last. 2: run the check on paper before drawing any tick: order 1 positions s 1, b 2, a 3, c 4, t 5, so 1 before 3, 1 before 2, 2 before 4, 3 before 4, 4 before 5, five passes; order 2 positions s 1, a 2, b 3, c 4, t 5, so 1 before 2, 1 before 3, 3 before 4, 2 before 4, 4 before 5, five passes. 3: build the key, the ten ticks and the two rails, and give the rails the labels of the columns. 4: add the two exchange connectors and the note. 5: add the back arc, the cycle label, the neighbour order note, the glyph and the verdict in view B.
- arc trims, 24 units from each centre along the arc: `s` to `a` 170.1,247.0 to 299.9,163.0; `s` to `b` 171.2,271.2 to 298.8,338.8; `b` to `c` 341.2,338.8 to 468.8,271.2; `a` to `c` 340.1,163.0 to 469.9,247.0; `c` to `t` 514,260 to 636,260.
- interaction: none. The sheet is a comparison of two fixed listings and a third fixed outcome.
- animation: none. Every relation the figure asserts is present in one frame, so a transition would add a state the reader has to hold.
- ids and classes: DOM ids are `VIZ-A-03-1` to `VIZ-A-03-5`, that is the inventory ID plus an instance index for a repeated row; one class per role, `role-ink`, `role-muted`, `role-accent-soft`, `role-accent-ink`, `role-success`, `role-warning`, `role-border`, and never a raw hex in the drawing.
- verification hooks: `?audit=1` counts live marks per panel and asserts 80 in A and 30 in B; `?theme=dark` re-renders the same sheet from the `.dark` block with no drawing change; `?grayscale=1` desaturates so the ticks, the dash and the glyph can be checked as shapes.
- commands: `python3 .hermes/skills/svg/illustration-spec/scripts/check_spec.py docs/figures/dsa-09-graphs/FIG-09-04-order-or-cycle.md` for this document; the build phase adds its own render and verify call, which this phase does not define.

## 9b. Mechanism and state model
- STATE: none: every coordinate is placed, nothing is derived
- DATUM: not applicable, no derived coordinate
- DERIVED: none. The five vertices come from the canonical table, untranslated in A and with y +505 in B, and the trims in section 9 are those coordinates measured once. Chips, ticks, labels and the back arc are placed.
- CHAIN: none: no mark depends on another mark's position.
- INVARIANTS: INV-01 both rails carry the same chip size, stroke, letter size and verdict mark at every build. INV-02 each order column carries exactly five ticks and each sits in the row of the arc it was computed for. INV-03 the arc `t` to `s` exists in view B only, and view A carries no mark that anticipates it. INV-04 no in figure label exceeds 24 characters and no type size is below 14. INV-05 the back arc crosses no node circle and no other arc.
- SAMPLED STATES: not applicable, the sheet carries one state; the two themes and the grayscale reduction are the sample, because each is a different rendering of the same geometry.
- SWEEP: none, one state. The harness asserts INV-01 to INV-05 once per build and reports the first violation by ID.
- FUTURE STATE: if a second sample graph is added, the rails keep their geometry and the check table gains one column pair per order, because the table is keyed by arcs and not by positions, so a new arc costs one row and not a redraw.

## 10. Acceptance criteria
| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0904-01 | count arcs and arrowheads in A, read each trim against section 9 | 5 arcs, 5 heads, every endpoint within 0.5 units of the trimmed pair | DOM assertion on path endpoints |
| REQ-FIG0904-02 | compare chip geometry, stroke and verdict marks across the rails | the two rails differ in letter and position only | attribute diff of the two chip groups |
| REQ-FIG0904-03 | read both rails left to right with their indices | s b a c t with 1 to 5, then s a b c t with 1 to 5 | text content assertion |
| REQ-FIG0904-04 | count ticks per column and match each to its key row | 5 and 5, each in the row of its arc | DOM assertion on tick x and y |
| REQ-FIG0904-05 | render in grayscale and read the three non colour carriers | tick paths, dashed connectors and the prohibition glyph all survive desaturation | screenshot in grayscale, non author read |
| REQ-FIG0904-06 | compute contrast per text role against its surface | every pair at or above 4.5:1, values from BRIEFING section 5 | contrast computation |
| REQ-FIG0904-07 | list every font size in the built sheet | the four permitted values only, none below 14 | DOM assertion on font size |
| REQ-FIG0904-08 | trace the back arc against node circles and arcs | no intersection, entry into s from below at 24 units | geometry check on path and circles |
| REQ-FIG0904-09 | count connectors and read the note | 2 dashed connectors between the rows, note present once | DOM assertion |
| REQ-FIG0904-10 | search the drawing for ranking words and for a heavier rail | no banned word, identical rail mass within 1 unit | text search and attribute diff |
| REQ-FIG0904-11 | compare arc roles between views and name the warning arcs | 5 arcs in B, 6 heads, `s` to `b` and `b` to `c` muted, `s` to `a`, `a` to `c` and `c` to `t` warning, no chips | DOM assertion on classes |
| REQ-FIG0904-12 | list label lengths | every label 24 characters or fewer, one line | string length assertion |

## 11. Open questions
- Q1: view B carries no rails. If a reviewer wants the failed check drawn as two columns of crossed ticks, the sheet grows about thirty marks and a second column pair becomes a new decision. Evidence: a non author read at G5, in the acceptance method of REQ-FIG0904-11.
- Q2: the position index inside each chip sits close to the letter at 1050 px. If it competes, the indices move to a row under the chips and view A grows 30 units. Evidence: one render at the 1000 unit reference width, read at 100 percent.

## 12. Revision history
| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | First spec: two views, two rails with per arc checks, the cycle marked by shape | The brief in PLAN and BRIEFING for FIG-09-04 |
| 2 | 2026-10-22 | The reported cycle is `s a c t s` under `s:[a,b]` and the panel states that order, chips shrink to 88 by 44 at a 1.6 rim, the check table moves to x 720 so no group overlaps, the 1050 px scale is corrected, the mark count in section 8 matches the inventory | Audit round one: the cycle must agree with FIG-09-10, and the rail overran the table by 54 units |
