# FIG-09-06: Anatomy of a specification
status: draft   rev: 2   date: 2026-10-22   author: figure spec agent

## 1. Summary
Two views of one argument. View A draws a specification as a gate with a cycle in it: precondition at the top, loop body as a closed ring in the middle, postcondition at the bottom, a cost block hanging off the right of the postcondition, an entry arrow carrying the invariant into the ring, a pass arrow carrying it round the ring, an exit arrow reading the loop condition together with the invariant, and one short arrow handing the guarantee over to its price. View B instantiates the same three parts with the BFS contract of Listing 9.1 in three lines, so the shape is the argument and BFS is one filling of it. The full invariant sentence lives in the caption, because a sentence that long inside the drawing would compete with the ring for attention.

MESSAGE = an invariant is the claim the loop body keeps true, so the entry fact and the preservation fact together carry it to the exit.

## 2. Communicative intent
- AUDIENCE: a student revising for an exam, who reads pseudocode, has met stacks and queues in chapters 4 and 5, and can recite what BFS does but not why it is correct.
- INTENDED CHANGE: believe that correctness is a two step induction over the loop body, and be able to name the four things a specification states, in order, on a blank page.
- READING CONTEXT: chapter 9.3.1, anchor section `931-reading-an-invariant`, after "Once the loop ends, the loop condition and the invariant combine to yield the postcondition. This is the same shape that the invariant drills of chapter 2 used, applied now to graph traversals." Column capped at 1120 px, light and dark, phone in the lightbox.
- REPRODUCTION: viewBox 0 0 1000 620, aspect 1.61 to 1, displayed up to 1050 CSS px wide.
- LIFETIME: illustration system for the chapter, not one talk.
- CAPTION (HTML, below the figure): "Anatomy of a specification. A precondition holds on entry; the loop body preserves the invariant on every pass; the exit combines the loop condition with the invariant to yield the postcondition. For breadth-first search from `s`, Listing 9.1 states the invariant as: the queue contains exactly the vertices with dist equal to d, followed by those with dist equal to d + 1, and every vertex in the queue already holds its final dist value."
- ASSUMPTIONS: 1. the three part names are the chapter's own words (confirmed, 9.3.1); 2. the drawing is schematic, not a flowchart of the listing (confirmed, briefing section 4); 3. no vertex or edge appears, so the canonical coordinates of briefing section 3 are unused (confirmed, the subject is the shape of a contract); 4. the full invariant goes in the caption (confirmed, roster row forbidden list).

## 3. Goals and non-goals
- GOAL-1: the reader points at the entry arrow, the pass arrow, the exit arrow and the short arrow into the cost block, and says what each one establishes.
- GOAL-2: the reader sees the loop body as a cycle that returns to itself, not as a step in a line.
- GOAL-3: the reader maps each of the three parts onto the BFS contract in view B, line for line, and finds the cost of BFS in the fourth block beside the postcondition.
- NON-GOAL-1: what a queue is, which FIG-09-07 owns.
- NON-GOAL-2: proving one algorithm correct; the figure shows the shape of the proof and the chapter works the instances.
- NON-GOAL-3: deriving any of the three costs. The cost block states the three values the chapter gives and shows no summation, because the derivation is prose and FIG-09-05 owns the arithmetic of one route.
- NON-GOAL-4: a second algorithm beside BFS, which would imply the shape differs per algorithm.

## 4. Constraints
- canvas: viewBox 0 0 1000 620; aspect 1.61 to 1; 1 unit = 1 CSS px at the 1000 unit reference width, local.
- node budget: 380 live nodes for a two panel sheet; the inventory totals well under it.
- palette budget: roles from briefing section 5 only, no new hue, no raw hex inside the drawing; light hexes in `:root`, dark hexes in `.dark`.
- typography: Montserrat, self-hosted; sizes in canvas units 18, 16 semibold, 15, 14 only.
- text split: prose stays in the chapter; in-SVG text is a part name, a flow label or one BFS line, at most 24 characters and at most 2 lines per label.
- convention: flat schematic, one projection, one sheet.
- time appetite: one revision after first render; the cost is in deciding the arrows, and that is done here.
- detail: full
- element floor: view A 18, view B 14, as written in the view map.
- boundaries: Always, use the three part names verbatim and keep both induction arrows. Ask first, dropping the pass arrow or the BFS view. Never, put the Listing 9.1 sentence inside the SVG, or draw the three parts as a straight sequence.
- claim status: the three named parts, the two step induction, and the exit combine are `chapter`, 9.3.1; the BFS pre, invariant and post are `chapter`, 9.3.2 Listing 9.1, and each in-SVG line is a shortening of it, the full text living in the caption.
- claim status: the 24 character limit, the type sizes, the stroke weights and the contrast ratios are `verified`, briefing sections 4 and 5, recomputed from the palette hexes.
- claim status: the enclosed areas in section 8 are `derived` from this spec's own coordinates, pi times 108 times 80 for the ring, 200 times 58 for a part box and 160 times 70 for the cost block. The three costs `O(V+E)`, `O(V+E)` and `O((V+E) log V)` are `chapter`, 9.3.1 to 9.3.4, the values the listings state.

## 5. Visual system lock
- projection: flat schematic, one per sheet, declared once; no isometric, no perspective.
- line grammar: outline 3.2 (the three part boxes and the ring); connector and annotation 1.6, ratio 2 to 1; panel frame 1.0 in `border`, since a frame separates the two views and outlines no subject; hairline 1.0 (row rules in view B); hidden or secondary 6 4 long dash, used only for the two tick arrows in view B, which also differ in length and end point and carry `muted`, so the pattern says secondary while the role still carries the meaning; arrowheads are filled triangles 14 long and 10 wide, on flow only, never on a leader.
- palette table, roles only:

  | NAME | HEX (light) | HEX (dark) | ROLE | USED FOR |
  |---|---|---|---|---|
  | ink | #15181e | #e8eaef | structure and primary text | part outlines, ring outline, part names, panel letters |
  | muted | #5c6470 | #a3abba | meaningful secondary | entry arrow, pass labels, BFS lines, flow labels |
  | faint | #8a92a0 | #7b8496 | aids only, never text | row rules in view B, which tie a line to a chip and assert nothing |
  | border | #e7eaf0 | #262b36 | decorative separation | panel frames |
  | card | #ffffff | #15181e | panel fill | panel background, part box fill |
  | wash | #f5f7fa | #111522 | code and table zebra | reserved, unused here |
  | accent | #1d4ed8 | #7aa2ff | active, current, examined | the pass arc, the ring direction heads |
  | accent-soft | #eef3fe | #16213c | active wash | the ring interior, the only large fill |
  | accent-ink | #14357f | #c7d6ff | text on accent-soft | the invariant labels inside the ring |
  | success | #157347 | #4ade80 | final, settled, verified | exit arrow, postcondition outline |

- value plan: three foundation values (card, accent-soft, ink) with wash and border as separation aids; the strongest light and dark junction sits on the ring, where the accent-soft interior meets the 3.2 ink outline.
- light: flat, no light source, no shadow, no gradient; depth here is temporal.
- detail floor: nothing meaningful below 14 units of type or 1.0 units of stroke.
- style reference: none rendered yet; the source is briefing section 5, and FIG-09-03 will be the first sheet to carry it.

## 6. Content inventory
View map. The floor is asserted by the harness, not estimated.

| view | job in the argument | depends on | element floor |
|---|---|---|---|
| A | the shape of a correctness argument: three parts named, a body that closes on itself, two induction arrows, one exit, and the price beside the exit | none | 18 |
| B | the same shape filled with the BFS contract of Listing 9.1, in three lines, with the cost it shares stated in view A | A | 14 |

Element inventory. Coordinates are canvas units on the 1000 by 620 sheet; view A occupies x 30 to 580, view B x 610 to 970, both y 70 to 565. Every coordinate below is placed.

| ID | element | job in the argument | must show | budget | label | convention |
|---|---|---|---|---|---|---|
| A-PANEL | frame rect 30,70 550 by 495 | separates the generic view | border 1.0, card fill | 1 | none | flat |
| A-LETTER | text at 48,98 | names the view | "A", 16 semibold, ink | 1 | A | flat |
| A-SUB | text at 68,98 | names what the view is | "generic shape", 14, muted | 1 | generic shape | flat |
| A-PRE | rect 150,112 200 by 58, radius 10 | the entry fact as a container | ink 3.2, card fill | 1 | none | flat |
| A-PRE-NAME | text centre 250,141 | names part one | "precondition", 16 semibold | 1 | precondition | flat |
| A-PRE-NOTE | text centre 250,161 | says what it is | "the caller supplies it", 14, muted | 1 | the caller supplies it | flat |
| A-ENTRY | line 250,170 to 250,223, head at 223 | induction fact one, true before the loop | muted 1.6, head 14 by 10 | 1 | none | flat |
| A-ENTRY-L | text start 262,192 | states the fact | "true at entry", 15, muted | 1 | true at entry | flat |
| A-RING | ellipse centre 250,305 rx 108 ry 80 | the loop body as a closed cycle | ink 3.2, accent-soft fill | 1 | none | flat |
| A-INV-NAME | text centre 250,296 | names part two inside the body | "loop invariant", 16 semibold | 1 | loop invariant | flat |
| A-INV-NOTE | text centre 250,318 | says what it is | "true after each pass", 14 | 1 | true after each pass | flat |
| A-PASS | arc 250,225 to 358,305 clockwise | induction fact two, preserved by the body | accent 1.6 | 1 | none | flat |
| A-PASS-H | head at 358,305, down the tangent | direction of one pass | accent, 14 by 10 | 1 | none | flat |
| A-PASS-L1 | text start 374,262 | states the fact | "preserved by", 15, muted | 1 | preserved by | flat |
| A-PASS-L2 | text start 374,282 | completes the fact | "each iteration", 15, muted | 1 | each iteration | flat |
| A-CYCLE-H | head at 142,305, up the tangent | closes the cycle on the far side | accent, 14 by 10 | 1 | none | flat |
| A-EXIT | line 250,385 to 250,448, head at 448 | combines exit condition with invariant | success 1.6, head 14 by 10 | 1 | none | flat |
| A-EXIT-L1 | text start 264,404 | the exit condition | "loop condition false", 15, ink | 1 | loop condition false | flat |
| A-EXIT-L2 | text start 264,424 | second half of the combine | "and invariant held", 15, ink | 1 | and invariant held | flat |
| A-POST | rect 150,448 200 by 58, square | the claim now available | success 3.2, card fill | 1 | none | flat |
| A-POST-NAME | text centre 250,477 | names part three | "postcondition", 16 semibold | 1 | postcondition | flat |
| A-POST-NOTE | text centre 250,497 | says what it is | "the guarantee on return", 14 | 1 | the guarantee on return | flat |
| A-COST | rect 410,440 160 by 70, radius 10 | the fourth part, what the work costs | muted 1.6, card fill | 1 | none | flat |
| A-COST-L1 | text centre 490,462 | cost of Listing 9.1, BFS | "O(V+E)", 14, muted | 1 | O(V+E) | flat |
| A-COST-L2 | text centre 490,482 | cost of Listing 9.2, DFS | "O(V+E)", 14, muted | 1 | O(V+E) | flat |
| A-COST-L3 | text centre 490,502 | cost of Listing 9.3, Dijkstra | "O((V+E) log V)", 14, muted | 1 | O((V+E) log V) | flat |
| A-COST-A | arrow 350,474 to 410,474, head at 410 | the guarantee hands over to the price | muted 1.6, head 14 by 10 | 1 | none | flat |
| A-COST-L | text centre 490,428 | names the fourth part, above its block | "the work it costs", 15, muted | 1 | the work it costs | flat |
| B-PANEL | frame rect 610,70 360 by 495 | separates the instance | border 1.0, card fill | 1 | none | flat |
| B-LETTER | text at 628,98 | names the view | "B", 16 semibold, ink | 1 | B | flat |
| B-SUB | text at 648,98 | names what the view is | "BFS instance", 14, muted | 1 | BFS instance | flat |
| B-RULE1 | hairline 636,250 to 944,250 | ties a line to a chip | faint 1.0 | 1 | none | flat |
| B-RULE2 | hairline 636,370 to 944,370 | ties a line to a chip | faint 1.0 | 1 | none | flat |
| B-RULE3 | hairline 636,490 to 944,490 | ties a line to a chip | faint 1.0 | 1 | none | flat |
| B-CHIP-PRE | rounded rect 646,187 26 by 26 | repeats the entry silhouette | ink 1.6, radius 6 | 1 | none | flat |
| B-PRE-LINE | text start 688,204 | BFS precondition, shortened | "adjacency lists, s in G", 15 | 1 | adjacency lists, s in G | flat |
| B-CHIP-INV | ellipse centre 659,320 rx 20 ry 20 | repeats the cycle silhouette | accent 1.6 | 1 | none | flat |
| B-INV-H1 | head at 659,300, tangent right | the chip is a cycle | accent, 14 by 10 | 1 | none | flat |
| B-INV-H2 | head at 659,340, tangent left | the chip is a cycle | accent, 14 by 10 | 1 | none | flat |
| B-INV-LINE | text start 688,324 | BFS invariant, shortened | "queue holds d then d+1", 15 | 1 | queue holds d then d+1 | flat |
| B-CHIP-POST | square rect 646,427 26 by 26 | repeats the exit silhouette | success 1.6 | 1 | none | flat |
| B-POST-LINE | text start 688,444 | BFS postcondition, shortened | "dist final, parent set", 15 | 1 | dist final, parent set | flat |
| B-ENTRY | long dash 659,216 to 659,294, head at 294 | the entry fact in the instance, secondary by pattern not by role | muted 1.6, head 14 by 10 | 1 | none | flat |
| B-EXIT | long dash 659,346 to 659,440, head at 440 | the exit combine in the instance, secondary by pattern not by role | muted 1.6, head 14 by 10 | 1 | none | flat |

## 7. Requirements
- REQ-FIG0906-01 [MUST-STANDARD] The three part names appear verbatim as "precondition", "loop invariant" and "postcondition", one text node each (source: chapter 9.3.1).
- REQ-FIG0906-02 [MUST-STANDARD] The loop body is a closed ellipse path whose two tangent arrowheads put its direction of travel on the drawing, and the three parts cannot be read as a straight left to right sequence (source: roster row FIG-09-06, forbidden list).
- REQ-FIG0906-03 [MUST-LOCAL] Two arrows carry the induction: A-ENTRY from the precondition to the ring labelled "true at entry", and A-PASS on the ring labelled "preserved by" and "each iteration" (why: the induction is the whole claim).
- REQ-FIG0906-04 [MUST-LOCAL] One exit arrow, A-EXIT, leaves the ring and lands on the postcondition, and its two labels state both halves of the combine, "loop condition false" and "and invariant held" (why: one half alone is a weaker claim than the chapter's conjunction).
- REQ-FIG0906-05 [MUST-STANDARD] No in-SVG label exceeds 24 characters or 2 lines, and the count is checked in the inventory row, not after render (source: briefing section 4, text split).
- REQ-FIG0906-06 [MUST-STANDARD] The Listing 9.1 invariant sentence appears in no text node and appears once, in the caption of section 2 (source: roster row forbidden list; chapter 9.3.2).
- REQ-FIG0906-07 [MUST-LOCAL] View B carries the BFS contract in exactly three contract lines, "adjacency lists, s in G", "queue holds d then d+1" and "dist final, parent set", one per part, and no fourth contract line; the panel letter and sub label are chrome, not contract (why: three lines is the roster limit, and a fourth turns the instance into prose).
- REQ-FIG0906-08 [MUST-STANDARD] Type is 18, 16 semibold, 15 or 14 canvas units, and the smallest is 14, so nothing renders below the chapter's note size (source: briefing section 4).
- REQ-FIG0906-09 [MUST-STANDARD] Outlines are 3.2 on the three part boxes and the ring, connectors 1.6, a ratio of 2 to 1, and the cost block takes 1.6 because it is the price of the work and not a part of the gate; arrowheads are filled triangles 14 long and 10 wide on flow arcs only (source: briefing section 5, line grammar).
- REQ-FIG0906-10 [MUST-STANDARD] Every stroke and fill resolves to a palette role variable in both themes, with no literal hex in the drawing source (source: briefing section 5, palette rule).
- REQ-FIG0906-11 [MUST-STANDARD] No meaning is carried by hue alone: the precondition is a rounded box, the postcondition a square box, the body a ring, the cost block a lighter box off the gate axis, the pass arc the only accent stroke, and every coloured element also carries a label (source: WCAG 1.4.1; briefing section 5).
- REQ-FIG0906-12 [MUST-STANDARD] Text meets 4.5 to 1 and meaningful strokes meet 3 to 1 against their surface, on the verified ratios: ink on card 17.78 light and 14.77 dark, accent-ink on accent-soft 10.23 and 11.0, muted on card 5.98 and 7.7, success on card 5.87 and 10.2, accent on accent-soft 6.7 and 7.14; faint at 3.13 light carries no text (source: WCAG 1.4.3, 1.4.11; briefing section 5).
- REQ-FIG0906-13 [MUST-LOCAL] The ring is the dominant element: the largest enclosed area on the sheet, the only accent-soft fill, and the element whose interior holds the second part name (why: the invariant belongs to the body).
- REQ-FIG0906-14 [MUST-STANDARD] Each view reaches its element floor, A 18 and B 14, counted as live DOM nodes under the view group (source: briefing section 4, element floors).
- REQ-FIG0906-15 [MUST-LOCAL] The fourth part is a cost block at 410,440, 160 by 70, in a 1.6 `muted` outline rather than a 3.2 one, off the gate axis at the right, holding three lines at 14 units, `O(V+E)`, `O(V+E)` and `O((V+E) log V)` in the order of Listings 9.1, 9.2 and 9.3, with one short arrow from the postcondition to it labelled "the work it costs", so the sheet reads as one cycle, one exit and one price and never as four boxes in a row (why: 9.3 says a specification earns the name only if it states four things, and the cost is the fourth).

## 8. Composition plan
- DOMINANT: the ring in view A, 27,143 square units of enclosed area against 11,600 for a part box and 11,200 for the cost block, and the only accent-soft fill on the sheet.
- FOCAL MECHANISM: value contrast, where the accent-soft interior meets the 3.2 ink outline; size, the largest closed shape; isolation, 55 units of empty band above the ring and 63 below it, so the body sits in a band of its own.
- HIERARCHY: three levels. The ring interior labels; the three part names and the three cost values; the flow labels and the BFS lines.
- READING PATH: precondition, down the entry arrow into the ring, once clockwise round the ring, out the exit arrow to the postcondition, then right along the short arrow to the cost block, then right again to view B and down its three lines. The path is a spiral with a price tag at its end, and that is the point.
- BALANCE: symmetrical about x 250 in the gate, both part boxes 200 wide; asymmetrical on the sheet, because the cost block hangs off that axis at the right and view B is narrower and quieter.
- FRAMING: no crop, both panels closed by their 1.0 frames, one unit scale throughout.
- NEGATIVE SPACE: the 55 units above the ring and the 63 units below it separate the body from the two part boxes and stay empty; the 60 units between the postcondition and the cost block carry one arrow and nothing else.
- GROUPING: 20 units between a label and its arrow, 55 units between the ring and the precondition, 63 between the ring and the postcondition, so proximity says which label belongs to which arrow and which box is a gate part.

## 9. Build contract
- steps: 4, one idea each. 0: both panel frames, the three part boxes and their names. 1: the ring with its interior labels. 2: the entry arrow, the pass arc with its two labels, the far arrowhead. 3: the exit arrow with its two labels, then the cost block with its short arrow and its label, then view B chips, rules and three lines.
- interaction: none. The reading task is one pass and every fact is on the sheet.
- animation: none. The cycle is drawn as a cycle; motion would restate it.
- ids and classes: DOM ids equal the inventory IDs, prefixed `VIZ-`; one class per role (`r-ink`, `r-muted`, `r-faint`, `r-border`, `r-card`, `r-accent`, `r-accent-soft`, `r-accent-ink`, `r-success`) and one per part (`p-pre`, `p-inv`, `p-post`, `p-cost`).
- verification hooks: `?theme=dark`, `?view=A`, `?view=B`, `?audit=1` for the node count.
- commands: audit with `python3 ~/.hermes/skills/svg/illustration-spec/scripts/check_spec.py docs/figures/dsa-09-graphs/FIG-09-06-spec-anatomy.md`; render and count once the chapter figure harness exists, which is open question 1.

## 9b. Mechanism and state model
- STATE: none: every coordinate is placed, nothing is derived
- DATUM: not applicable, no derived coordinate
- DERIVED: none: the ring, both heads on it and both part boxes come from the inventory coordinates, so no state can move one without the others.
- INV-01 The part boxes stay in the order of the argument, precondition above the ring and postcondition below it.
- INV-02 Exactly one arrow leaves the ring, and it terminates on the postcondition outline.
- INV-03 No label exceeds 24 characters or 2 lines, in either view.
- INV-04 No text node overlaps an arrowhead or a stroke.
- FUTURE STATE: a pass counter, integer 0 to 3, default 0, that a later interactive revision would drive: it lights the ring interior on pass 0 to show the invariant established at entry, then steps the three BFS lines in view B through the queue of Listing 9.1 one line per pass, holding INV-01 to INV-04 at every value.

## 10. Acceptance criteria
| REQ | test | pass condition | method |
|---|---|---|---|
| REQ-FIG0906-01 | read the part name text nodes | three matches, one per part | DOM assertion |
| REQ-FIG0906-02 | inspect A-RING and count heads | one closed ellipse path, two tangent heads, no straight sequence between the parts | DOM assertion |
| REQ-FIG0906-03 | read the labels on A-ENTRY and A-PASS | both arrows present, labels match the inventory | non-author read |
| REQ-FIG0906-04 | follow A-EXIT to its end point | one arrow ring to A-POST, two labels, both halves stated | non-author read |
| REQ-FIG0906-05 | measure every text node | no label over 24 characters or 2 lines | character count per node |
| REQ-FIG0906-06 | search the SVG for the caption sentence | zero matches inside, one in the caption | DOM assertion |
| REQ-FIG0906-07 | count contract lines in view B | three lines, 23, 22 and 22 characters, no fourth | DOM assertion |
| REQ-FIG0906-08 | read every font-size attribute | values drawn from 18, 16, 15, 14 | DOM assertion |
| REQ-FIG0906-09 | read stroke widths and head geometry | 3.2 outlines, 1.6 connectors, heads 14 by 10, no head on a leader | DOM assertion |
| REQ-FIG0906-10 | inspect fill and stroke values | every value is a var() reference, zero literal hex | DOM assertion |
| REQ-FIG0906-11 | strip hue, then re-read each coloured element | silhouette or label still separates every role | grayscale render |
| REQ-FIG0906-12 | compute contrast from the theme tokens in both themes | every pair at or above 4.5 to 1 for text, 3 to 1 for strokes | contrast computation |
| REQ-FIG0906-13 | compare enclosed areas and fills | ring largest, and the only accent-soft fill | DOM assertion |
| REQ-FIG0906-14 | count live nodes per view with querySelectorAll("*") | A at least 18, B at least 14 | element count |
| REQ-FIG0906-15 | read the cost block, its outline, its three lines and its arrow | block at 410,440, outline 1.6 muted, three lines at 14 in listing order, one arrow leaving A-POST, label present | DOM assertion and non-author read |

## 11. Open questions
- Q1: which harness renders and counts chapter figures, and with what flags. Evidence: a figure render script in the chapter pipeline, or a decision that the harness lands with the first build.
- Q2: whether the panel sub label survives review or the caption carries it. Evidence: a non-author read at 390 px, where two extra lines compete with the part names.
- Q3: whether the pass arc should also show the loop condition being tested before each pass, which needs a fourth label and breaks the 24 character budget. Evidence: a revision of 9.3.1 that adds the test as a step.

## 12. Revision history
| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | Spec written: view A the gate and cycle, view B the BFS instance | First pass for FIG-09-06 |
| 2 | 2026-10-22 | View A gains the cost block and its arrow, the gate shifts to x 250 to make room for it, the ring bands read 55 above and 63 below, the two induction arrows in view B move from faint to muted, two text centres are corrected to 141 and 477, panel frames state 1.0 | Audit round one: 9.3 names four things a specification states and the figure named three |
