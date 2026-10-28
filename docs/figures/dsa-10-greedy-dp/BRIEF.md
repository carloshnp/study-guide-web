# BRIEF: Chapter 10 Greedy and DP, Seedream figure set

Shared brief. Every writer reads this file in full before writing. Status: prompts written (prompts/) and images generated (renders/). The user confirmed the ASSUMPTIONS in PLAN.md and amendments A1 to A4.

Source: data/guides/programacao/dsa/guide.md, lines 4526 to 4965 (chapter 10). Anchor ids: content/guides/dsa/chapters/10-greedy-and-dp.json, sections[].id. Guide line numbers below are lines of guide.md.

## MESSAGE and audience

MESSAGE: Greedy and DP are two ways to commit to a choice, and each commitment needs a checkable argument.

AUDIENCE: an exam-revising student who has met stacks, queues, heaps (chapters 4 and 5) and graphs (chapter 9). Display: the study-site chapter page, one figure per H2 section, shown at text-column width.

## Facts table

Fact | Value | Status | Guide line
--- | --- | --- | ---
F01 Greedy choice, interval scheduling | Among compatible jobs take the earliest finish, then repeat | chapter | 4534
F02 Exchange argument | Swap optimal first job i for greedy job j; j finishes no later than i, so the solution stays feasible and the same size | chapter | 4536
F03 Stays-ahead | After k greedy choices the last finish is no later than the k-th finish of any compatible selection | chapter | 4540
F04 Weighted case | Earliest finish is not safe when jobs carry values | chapter | 4542
F05 DP properties | Optimal substructure and overlapping subproblems | chapter | 4550
F06 Weighted recurrence | OPT(0) = 0; OPT(j) = max(OPT(j-1), w_j + OPT(p(j))) | chapter | 4558 to 4559
F07 Six-job OPT row | 5, 6, 10, 14, 17, 17 | chapter | 4570 (not used in any prompt)
F08 Six-job greedy versus optimum | Greedy weight 16 (jobs 1, 3, 4, 6); optimum 17 (jobs 2, 5). Recomputed from the weights 5, 6, 5, 4, 11, 2 at lines 4568 and 4570; the sums 5+5+4+2 = 16 and 6+11 = 17 check out | derived | 4568 to 4572 (not used in any prompt)
F09 Knapsack recurrence | K(0, c) = 0; K(i, c) = K(i-1, c) if w_i exceeds c; otherwise max(K(i-1, c), v_i + K(i-1, c-w_i)) | chapter | 4582 to 4584
F10 Fill order | Every right-hand side reads the row above; the table fills row by row from the empty set downward, and each entry is final when written | chapter | 4588
F11 Capacity-5 example | Best value 7 from items 1 and 2 (not used in any prompt) | chapter | 4597
F12 Knapsack cost | O(nC) time and space; not polynomial in input size in the strict sense | chapter | 4599
F13 Greedy listing header | Carries the choice rule, the exchange argument and the measure | chapter | 4611 (listing 4613 to 4635)
F14 DP listing header | Carries the recurrence and the fill order instead of an exchange argument | chapter | 4641
F15 Reconstruction | Walk back from the last entry; when taking and skipping tie, take the skip branch | chapter | 4667
F16 Shared structure of the builds | Claims both builds fill a table; the greedy listing does not (see Conflicts C1) | chapter, conflicting | 4841
F17 Tabulation versus memoization | Tabulation computes all n+1 entries; memoization computes only reached states | chapter | 4880
F18 Visits on weighted scheduling | Every state is visited, because best(j) asks for best(j-1) | chapter | 4884
F19 Style rule | Fill the table when the recursion is dense; cache it when sparse | chapter | 4884
F20 Same answer | Memoized and tabulated builds both return 17 on the six jobs | chapter | 4875
F21 Drill rule | Three steps; no coding until the first two are done | chapter | 4894
F22 Exercises rule | A table filled by hand is the correctness argument | chapter | 4910
F23 Chapter message | Greedy and DP are two answers to one question about commitment; greedy commits early and needs an exchange or stays-ahead argument; DP delays commitment until the table shows every alternative | chapter | 4574, 4904
F24 Exit check | Four conditions to leave the chapter | chapter | 4902
F25 Audience background | Has met stacks, queues, heaps, graphs | unsourced (from the planning brief, not the guide); used only as audience context, never in a prompt | none

## Subject inventory

Subject | Job in the message | Must-show phrase | Label or no label
--- | --- | --- | ---
FIG-10-01 optimal job row | The solution before the swap | optimal solution | label
FIG-10-01 greedy job bar j | The earliest-finishing job, swapped in | job j | label
FIG-10-01 replaced job bar i | The job the swap removes | job i | label
FIG-10-01 remaining job bars | Unchanged rest of the solution | none | no label
FIG-10-01 swap arrow | The exchange step | exchange step | label
FIG-10-01 greedy caption | Names the accent bar | greedy choice | label
FIG-10-02 grid bands | Each band is an item row | none | no label
FIG-10-02 column axis | Capacity values | capacity c | label
FIG-10-02 row axis labels | Item rows | item i | label
FIG-10-02 highlighted cell | The entry being filled | K(i, c) | label
FIG-10-02 bracket over the row above | The only input to the highlighted cell | row above | label
FIG-10-03 header card | The listing as a whole | argument header | label
FIG-10-03 choice rule strip | First part of the header | Choice rule | label
FIG-10-03 exchange argument strip | Second part of the header | Exchange argument | label
FIG-10-03 measure strip | Third part of the header | Measure | label
FIG-10-03 listing body bars | The code below the header, not legible | listing body | label
FIG-10-04 top down call chain | Recursion of best(j) | best(j) | label
FIG-10-04 cache loop | Repeated calls reuse stored answers | cache | label
FIG-10-04 bottom up cell strip | Entries filled in order | none | no label
FIG-10-04 fill arrow | Direction of the fill | fill order | label
FIG-10-04 panel labels | Which side is which style | top down; bottom up | label
FIG-10-05 rule block | First gate | rule first | label
FIG-10-05 hand table block | Second gate | hand table | label
FIG-10-05 code block | Last gate, locked until the earlier gates pass | then code | label
FIG-10-05 gate arrows | Order between gates | none | no label
FIG-10-06 column headings | The exercise groups | Greedy arguments; Tables by hand; Memoized vs tabulated | label
FIG-10-06 column arrows | Order between groups | none | no label

## Identity blocks

None. The set is diagrams only: no product, no person, no identity block.

## Reference roles

None. Text-to-image path. Every roster row has 0 references.

## Palette by role (SUPERSEDED by A6 and A7; kept for the record, do not use)

- accent: the chosen or active element (greedy job, filled cell, open gate). One saturated hue.
- base: unchanged elements and the ground. Mid-tone neutral.
- warning: the replaced, rejected or locked element only. One contrasting hue, used for that role alone.
- Ground: mid-tone. No pure white fill and no pure black fill anywhere. The prompt names no background colour.
- Label ink: dark neutral, not pure black.
- No hex codes in any prompt.

## Convention (whole set)

- Camera: orthographic straight-on front view, no perspective, no tilt, no 3D.
- Light: none. Flat graphic design, no light source, no cast shadow (diagram rule).
- Style: flat vector-like graphic design, uniform stroke weight, sans-serif labels, rectangles, bars and arrows only. No gradient, no texture, no icons, no people.

## Closed visible-text list (whole set)

Every string below is English, in double quotes, 24 characters or fewer. No other text may appear in any figure. No digits appear in any string, so no figure shows a digit.

1. "exchange step"
2. "optimal solution"
3. "job i"
4. "job j"
5. "greedy choice"
6. "capacity c"
7. "item i"
8. "row above"
9. "K(i, c)"
10. "argument header"
11. "Choice rule"
12. "Exchange argument"
13. "Measure"
14. "listing body"
15. "top down"
16. "bottom up"
17. "best(j)"
18. "cache"
19. "fill order"
20. "rule first"
21. "hand table"
22. "then code"
23. "Greedy arguments"
24. "Tables by hand"
25. "Memoized vs tabulated"

## Layout rules

- Every figure is square. Positions are percentages of the square, counted from the left edge and from the top edge.
- Each closed string is drawn once per figure, at the position given for it. One exception: best(j) is drawn in each of its three boxes in FIG-10-04, as that layout requires (amendment A1).
- Figure titles are page headings. They are not drawn inside the figure.
- Per-figure layouts (identical to PLAN.md):

FIG-10-01 layout: "exchange step" label at left 8%, top 5%. "optimal solution" label at left 8%, top 12%. Row A: "job i" bar (warning role) at left 8% to 30%, top 20% to 32%; unlabelled base bars at left 36% to 60% and left 66% to 92%, same band. Downward arrow (base role) at left 19%, from top 36% to top 46%. Row B: "job j" bar (accent role) at left 8% to 22%, top 54% to 66%; unlabelled base bars at left 36% to 60% and left 66% to 92%, same band. "greedy choice" label at left 8%, top 72%. Ground from top 80% to 92% holds no text.

FIG-10-02 layout: "capacity c" label centred above the grid at left 40%, top 8%. Grid: left 14% to 90%, top 14% to 84%, drawn as horizontal bands of equal height, each band an item row, first band at the top. "item i" label at left 2%, top 14%. Highlighted cell in the lowest band at left 60% to 70% (accent role) with "K(i, c)" inside. Bracket (accent outline) spans the full width of the band directly above the highlighted cell, with a downward arrow into the highlighted cell. "row above" label at left 2%, in the left margin, level with the bracket band (the band directly above the highlighted cell); amendment A2.

FIG-10-03 layout: "argument header" label at left 10%, top 6%. Card: left 10% to 90%, top 10% to 92%, base outline. Strip 1: left 14% to 86%, top 16% to 28%, accent outline, "Choice rule" at left 18%, top 19%. Strip 2: top 32% to 44%, "Exchange argument" at left 18%, top 35%. Strip 3: top 48% to 60%, "Measure" at left 18%, top 51%. "listing body" label at left 14%, top 64%. Body: left 14% to 86%, top 68% to 88%, abstract base-role bars of varying length with no legible text.

FIG-10-04 layout: vertical divider (base role) at left 50%, top 10% to 90%. "top down" label at left 6%, top 8%. Left chain: stacked boxes at left 16% to 40%, tops 18% to 28%, 42% to 52%, 66% to 76%, each reading "best(j)"; downward arrows at left 28% between them. A dashed loop encloses the chain at left 10% to 46%, top 14% to 80%, with "cache" label at left 6%, top 84%. "bottom up" label at left 54%, top 8%. "fill order" label at left 54%, top 24%, with a rightward arrow at top 30% from left 54% to 96%. Cell strip: left 54% to 96%, top 40% to 52%, cells in a row; the leftmost cells in accent role, the rest base role.

FIG-10-05 layout: blocks in a single row at top 36% to 60%: block 1 at left 6% to 30% (accent role) with "rule first"; block 2 at left 36% to 60% (accent role) with "hand table"; block 3 at left 66% to 94% (warning role border, thick) with "then code". Arrows (base role) at top 48%, from left 31% to 35% and from left 61% to 65%. Ground from top 70% to 86% holds no text.

FIG-10-06 layout: column headings at top 22%: "Greedy arguments" at left 6%; "Tables by hand" at left 36%; "Memoized vs tabulated" at left 66%. Columns (base outline): left 6% to 30%, left 36% to 60%, left 66% to 94%, each from top 30% to 70%. An accent bar inside each column at top 36% to 42%. Arrows (accent role) at top 50%, from left 31% to 35% and from left 61% to 65%. Ground from top 76% to 90% holds no text.

## Conflicts

- C1: Guide line 4841 (F16) says both builds fill a table whose entries depend only on entries to the left. The greedy listing (lines 4613 to 4635) and the greedy Python code (about lines 4700 to 4720) fill no table. Resolution: the listings win. No greedy figure shows a table, and line 4841 is not used as an anchor. The guide itself is not edited here; flag it to the guide author.
- C2: The Rust comment at guide line 4791 describes the count as jobs that finish before job j starts, while Listing 10.2 (lines 4641 to 4661) and the code use finish no later than start. Resolution: the figures show no such predicate; the listing wording governs.

## Roster

Columns, in order: id | language | title | aspect | image_url | reference_image_urls | exact copy strings | preserve list | exclusions

id | language | title | aspect | image_url | reference_image_urls | exact copy strings | preserve list | exclusions
--- | --- | --- | --- | --- | --- | --- | --- | ---
FIG-10-01 | English | Greedy exchange step | square | none | none (0 references) | "exchange step"; "optimal solution"; "job i"; "job j"; "greedy choice" | Layout percentages of this row; the palette roles; the flat convention; the job rows aligned on a shared timeline | no digits; no time axis; no weights; no table; no code; no light source; no cast shadow; no perspective; no pure white or pure black fill; no hex colour code; no additional text; no tournament
FIG-10-02 | English | Knapsack table fills row by row | square | none | none (0 references) | "capacity c"; "item i"; "row above"; "K(i, c)" | Layout percentages of this row; the palette roles; the flat convention; the grid bands in equal height; the single highlighted cell | no digits; no cell values; no item weights or values; no reconstruction path; no chosen set; no code; no light source; no cast shadow; no perspective; no pure white or pure black fill; no hex colour code; no additional text
FIG-10-03 | English | Argument header above the listing | square | none | none (0 references) | "argument header"; "Choice rule"; "Exchange argument"; "Measure"; "listing body" | Layout percentages of this row; the palette roles; the flat convention; the strip order Choice rule, Exchange argument, Measure; the card above the body | no digits; no legible code text; no DP header; no reconstruction walk; no table; no light source; no cast shadow; no perspective; no pure white or pure black fill; no hex colour code; no additional text
FIG-10-04 | English | Same recurrence, top down and bottom up | square | none | none (0 references) | "top down"; "bottom up"; "best(j)"; "cache"; "fill order" | Layout percentages of this row; the palette roles; the flat convention; the left chain beside the right strip; the divider | no digits; no call counts; no state counts; no cell values; no code text; no light source; no cast shadow; no perspective; no pure white or pure black fill; no hex colour code; no additional text
FIG-10-05 | English | Drill gate: rule, hand table, code | square | none | none (0 references) | "rule first"; "hand table"; "then code" | Layout percentages of this row; the palette roles; the flat convention; the block order; the locked third block | no digits; no tournament; no scoreboard; no knapsack values; no code text; no light source; no cast shadow; no perspective; no pure white or pure black fill; no hex colour code; no additional text
FIG-10-06 | English | Exercises in order | square | none | none (0 references) | "Greedy arguments"; "Tables by hand"; "Memoized vs tabulated" | Layout percentages of this row; the palette roles; the flat convention; the column order and the arrows between columns | no digits; no problem statements; no answers; no numbers; no code; no light source; no cast shadow; no perspective; no pure white or pure black fill; no hex colour code; no additional text

## Detail rewrite: amendments A5 to A8 (supersede the earlier rules where they conflict)

The user asked for fuller figures with more explanation, in the study-site design style, and for the 2d-skills full-detail standard. Each amendment was decided through the decision oracle (task dsa-ch10-detail-rewrite, with narrowed re-asks dsa-ch10-detail-rewrite-recheck, logged in ~/.hermes/decisions.jsonl).

- A5 Label budget: up to 12 visible labels per figure. Each label is 24 characters or fewer, English, and drawn from that figure's own closed list (set in its spec file). Explanation comes from shape, counts, arrows and position, and from the labels. Oracle answer a, 0.97.
- A6 Ground: a light card plate, white, with a thin border frame, replaces the mid-tone neutral ground. Reason: accent and warning marks reach about 2.15 to 1 on a mid-tone ground (computed for an assumed ground of #8a92a0; the original plan named no ground hex, so the 2.15 figure is a worked example, not a measurement of the chosen ground), below the 3 to 1 rule for meaningful graphics (2d-skills Tier A, WCAG 1.4.11), and about 6.7 to 1 on white. Supersedes assumption 4 and the earlier theme-neutral answer. Narrowed re-ask yes, p=1.00.
- A7 Colours: each role is named in the prompt with its site light-theme hex value as a target colour, to match the study-site style. Supersedes the earlier no-hex rule. The Seedream skill says hex codes are not promised to render, so the render is checked, not assumed. Narrowed re-ask yes, p=0.98.
- A8 Detail policy: detail is full (2d-skills illustration-spec, default). Each figure gets a spec file in specs/ with a view map, element floors, an inventory where every element has a job, requirements, acceptance rows and an accuracy ledger. Assumption 9 (no digits in any figure) and assumption 7 (square) stay in force.

### Palette by role (site tokens, light theme; the card is the plate)

| Role | Target hex | Use |
|---|---|---|
| ink | #15181e | primary text, labels, structure |
| muted | #5c6470 | edges, leaders, connectors, secondary labels |
| border | #e7eaf0 | plate frame, row separators (decorative only, never a meaningful edge) |
| card | #ffffff | the plate fill |
| wash | #f5f7fa | grouping only, inactive bands |
| accent | #1d4ed8 | active, current, the element under study |
| accent-soft | #eef3fe | active wash behind the accent element |
| accent-ink | #14357f | text on accent-soft |
| success | #157347 | final or settled (not used in every figure) |
| warning | #b42318 | replaced, rejected, locked, or a broken invariant |

Every meaningful mark carries a second channel as well as colour: a shape, a dash, a label, or a position.

### Line grammar and type floors (proportions of the square's width, 1000-unit sheet equivalent in brackets)

- node or block outline: 0.3 percent of width (3.2 units)
- edge, connector, arrow line: 0.16 percent (1.6 units), arrowhead filled, 1.4 percent long
- hairline rule and plate frame: 0.1 percent (1.0 unit)
- label cap height: at least 1.6 percent of width (16 units on the 1000-unit sheet). The site floor is 14 units (1.4 percent), so this sits 2 units above it. Nothing smaller.
- panel label: 1.8 percent of width, semibold
- label length: 24 characters or fewer, one or two lines

### Composition floors

- Every figure has one dominant element and a reading path of arrows from entry to payoff, with at most three hierarchy levels.
- Each view listed in the spec has an element floor. The prompt states the floor as a count of drawn marks in that view.
- No element is drawn without a job in the message. An element without a job is deleted.

### Explanation and text rules

- Up to 12 labels per figure. Each label is from that figure's closed list in the spec, quoted in the prompt, drawn once, 24 characters or fewer.
- No digits anywhere in the image (assumption 9). Use words such as "first", "second", "step one" only if they are in the closed list and count toward the 12.
- No em dash or en dash outside double quotes. No banned descriptor (clear, clean, modern, professional, appealing, balanced, readable) in Subjects, Product and materials, or Lighting and camera.
- No text beyond the closed list, and no caption sentence drawn inside the figure. The caption lives in the chapter prose.

### Prompt file rules (detailed rewrite)

- Keep the ten Seedream headings in order: Task, References, Composition, Subjects, Product and materials, Lighting and camera, Art direction, Visible text, Preserve, Exclusions, then a Revisions table.
- Composition gives every element's position as percentages of the square, counted from the left and from the top, with the element's width and height. Write the percentages in words, as the earlier files do.
- Subjects lists every drawn element with its job, its must-show phrase, and its label or 'no label'.
- Product and materials and Art direction name the role colours with their hex targets, and describe the card plate and frame.
- Lighting and camera: flat graphic design, no light source, no cast shadow, orthographic straight-on front view.
- The prompt is 600 to 1000 words. A longer prompt must be cut, not padded.
- Add row 3 to the Revisions table: rev 3, date 2026-10-22, the detail rewrite, and the reason, citing A5 to A8.
- Use the file names and the folder layout in the writer's brief; do not write any other file.

## Clarifications after the first detail batch (these override the rules above where they conflict)

- C-1 Digits. The no-digit rule (assumption 9) governs what the image shows: every visible label and every drawn mark. It does NOT apply to: spec files (any digits, in prose, tables, IDs and section numbers); the Revisions table; and hex colour targets in the prompt's Product and materials and Art direction fields (A7). A hex code is a colour target, not visible text, so it must be written in full, for example #1d4ed8.
- C-2 Text floor. Label cap height is at least 1.6 percent of width, which is 16 units on the 1000-unit sheet. The site floor is 14 units. The figures use 1.6 percent.
- C-3 Percentages in the prompt. Write layout percentages in words (for example 'left eight percent'), as the v1 files do. Digits in the layout are not needed.
- C-4 Spec requirements. Section 7 uses bullet lines exactly in the form '- REQ-FIG-01 [MUST-LOCAL] statement (why: ...)', not a table. Run python3 ~/.hermes/skills/2d-skills/scripts/check_spec.py <spec> and reach zero FAIL. Acceptance rows (section 10) are a table.
- C-5 Layout changes from the confirmed plan are allowed only where the spec records them as a numbered change (N-1, N-2 ...) with its reason. Note any change to the grid, card, or strip positions in the spec's section 11.
