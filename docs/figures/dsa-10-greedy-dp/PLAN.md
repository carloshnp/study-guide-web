# PLAN: Chapter 10 Greedy and DP, Seedream figure set

Status: the six prompt files are written in prompts/ and the six images are generated in renders/ (Seedream 5.0 Flash via OpenRouter, square, one attempt each). The user confirmed all 17 ASSUMPTIONS as written and amendments A1 to A4. No picture has been judged. Shared facts, subjects, palette, convention, closed text and roster are in BRIEF.md in this folder.

Source: data/guides/programacao/dsa/guide.md, chapter 10, lines 4526 to 4965. Anchor ids: content/guides/dsa/chapters/10-greedy-and-dp.json (sections[].id).

## Message and audience

MESSAGE: Greedy and DP are two ways to commit to a choice, and each commitment needs a checkable argument.

AUDIENCE: an exam-revising student who has met stacks, queues, heaps (chapters 4 and 5) and graphs (chapter 9). Display: the study-site chapter page, one figure per H2 section, shown at text-column width beside that section.

## Routing (Plan first, step 1)

- Six figures, all routed to Seedream as layout sketches, because the user named Seedream.
- FIG-10-02 and FIG-10-04 depend on exact DP table structure (cell structure, call and fill edges). They are flagged SVG RECOMMENDED. Exact values belong on the 2d-skills SVG path. Their Seedream prompts carry no digits and no values.
- The other four carry no exact values.

## Six-figure view map

ID | Title | Anchor id | Anchor sentence | Dominant element
--- | --- | --- | --- | ---
FIG-10-01 | Greedy exchange step | 101-greedy-exchange-and-stays-ahead | An exchange argument starts from an optimal solution that disagrees with the greedy choice and shows that swapping one piece of the optimal solution for the greedy choice leaves the solution just as good. | Two stacked job rows on one timeline, with a swap arrow between them
FIG-10-02 | Knapsack table fills row by row | 102-dp-subproblems-tables-knapsack | Every right hand side reads the row above, so the table fills row by row from the empty set downward, and each entry is final the moment it is written. | Grid of item bands and capacity columns, one highlighted cell, a bracket over the row above
FIG-10-03 | Argument header above the listing | 103-argument-first-specs-and-reconstruction | For a greedy algorithm the argument is an exchange or a stays-ahead sketch placed in the header of the listing, so the reader cannot run the steps without seeing why they are safe. | Tall listing card with a stacked-strip argument header over abstract code bars
FIG-10-04 | Same recurrence, top down and bottom up | 104-builds-memoized-and-tabulated | The rule is to match the style to the access pattern: fill the table when the recursion is dense, cache the recursion when it is sparse. | Left: chain of call boxes with a cache loop. Right: strip of cells filled left to right
FIG-10-05 | Drill gate: rule, hand table, code | 105-practice-knapsack-and-tournament-drills | The drill has three steps and forbids coding until the first two are done. | Blocks in a row; the third is locked
FIG-10-06 | Exercises in order | 106-exercises | Work the hand tables on paper first, because a table filled by hand is the correctness argument, while the same table filled by a program you have not checked is only output. | Columns with arrows between them

## Per-figure briefs

Layouts below are identical to the Layout rules in BRIEF.md, which govern. Non-goals go in the Exclusions field only. Facts cite guide.md lines; the fact IDs are in the BRIEF.md facts table.

### FIG-10-01: Greedy exchange step

- Anchor id: 101-greedy-exchange-and-stays-ahead
- Anchor sentence (guide line 4536): "An exchange argument starts from an optimal solution that disagrees with the greedy choice and shows that swapping one piece of the optimal solution for the greedy choice leaves the solution just as good."
- Job in the message: shows that the earliest-finishing job, swapped into an optimal solution, keeps it feasible and just as large (F01, F02).
- Message sentence: Taking the earliest-finishing job is safe only because swapping it into an optimal solution keeps the solution feasible and just as large.
- Must-show phrase: the greedy job swapped into the first slot of the optimal solution.
- View or layout: "exchange step" label at left 8%, top 5%. "optimal solution" label at left 8%, top 12%. Row A: "job i" bar (warning role) at left 8% to 30%, top 20% to 32%; unlabelled base bars at left 36% to 60% and left 66% to 92%, same band. Downward arrow (base role) at left 19%, from top 36% to top 46%. Row B: "job j" bar (accent role) at left 8% to 22%, top 54% to 66%; unlabelled base bars at left 36% to 60% and left 66% to 92%, same band. "greedy choice" label at left 8%, top 72%. Ground from top 80% to 92% holds no text.
- Non-goals (Exclusions only): weighted values; time axis values; a table of jobs; code.
- Closed visible text: "exchange step"; "optimal solution"; "job i"; "job j"; "greedy choice".
- Facts and lines: F01 (4534), F02 (4536).
- SVG RECOMMENDED: no.

### FIG-10-02: Knapsack table fills row by row

- Anchor id: 102-dp-subproblems-tables-knapsack
- Anchor sentence (guide line 4588): "Every right hand side reads the row above, so the table fills row by row from the empty set downward, and each entry is final the moment it is written."
- Job in the message: shows that each knapsack row reads only the row above it, so each entry is final when written (F09, F10).
- Message sentence: A knapsack row is final once written because it reads only the row above it, so the last cell holds the answer.
- Must-show phrase: each row reads only the row above.
- View or layout: "capacity c" label centred above the grid at left 40%, top 8%. Grid: left 14% to 90%, top 14% to 84%, drawn as horizontal bands of equal height, each band an item row, first band at the top. "item i" label at left 2%, top 14%. Highlighted cell in the lowest band at left 60% to 70% (accent role) with "K(i, c)" inside. Bracket (accent outline) spans the full width of the band directly above the highlighted cell, with a downward arrow into the highlighted cell. "row above" label at left 2%, in the left margin, level with the bracket band (the band directly above the highlighted cell); amendment A2.
- Non-goals (Exclusions only): cell values; item weights or values; the chosen set or a reconstruction path; code.
- Closed visible text: "capacity c"; "item i"; "row above"; "K(i, c)".
- Facts and lines: F09 (4582 to 4584), F10 (4588).
- SVG RECOMMENDED: YES. The grid has an exact cell count and dependency edges. Layout sketch only; the Seedream prompt has no digits and no values.

### FIG-10-03: Argument header above the listing

- Anchor id: 103-argument-first-specs-and-reconstruction
- Anchor sentence (guide line 4607): "For a greedy algorithm the argument is an exchange or a stays-ahead sketch placed in the header of the listing, so the reader cannot run the steps without seeing why they are safe."
- Job in the message: shows the argument header above the code body, so no step runs without its reason (F13, F14).
- Message sentence: The argument sits above the listing, so no step runs without its reason on the page.
- Must-show phrase: the argument header sits above the listing body.
- View or layout: "argument header" label at left 10%, top 6%. Card: left 10% to 90%, top 10% to 92%, base outline. Strip 1: left 14% to 86%, top 16% to 28%, accent outline, "Choice rule" at left 18%, top 19%. Strip 2: top 32% to 44%, "Exchange argument" at left 18%, top 35%. Strip 3: top 48% to 60%, "Measure" at left 18%, top 51%. "listing body" label at left 14%, top 64%. Body: left 14% to 86%, top 68% to 88%, abstract base-role bars of varying length with no legible text.
- Non-goals (Exclusions only): real code text; a DP header; a reconstruction walk; a table.
- Closed visible text: "argument header"; "Choice rule"; "Exchange argument"; "Measure"; "listing body".
- Facts and lines: F13 (4611), F14 (4641), anchor (4607).
- SVG RECOMMENDED: no.

### FIG-10-04: Same recurrence, top down and bottom up

- Anchor id: 104-builds-memoized-and-tabulated
- Anchor sentence (guide line 4884): "The rule is to match the style to the access pattern: fill the table when the recursion is dense, cache the recursion when it is sparse."
- Job in the message: contrasts top-down calls with a cache against bottom-up filling of a table, for one recurrence (F17, F18, F19).
- Message sentence: One recurrence can run top down through a cache that visits only reached states, or bottom up through a table that fills every entry in order, and the access pattern decides which costs less.
- Must-show phrase: one recurrence, run top down through calls or bottom up through a table.
- View or layout: vertical divider (base role) at left 50%, top 10% to 90%. "top down" label at left 6%, top 8%. Left chain: stacked boxes at left 16% to 40%, tops 18% to 28%, 42% to 52%, 66% to 76%, each reading "best(j)"; downward arrows at left 28% between them. A dashed loop encloses the chain at left 10% to 46%, top 14% to 80%, with "cache" label at left 6%, top 84%. "bottom up" label at left 54%, top 8%. "fill order" label at left 54%, top 24%, with a rightward arrow at top 30% from left 54% to 96%. Cell strip: left 54% to 96%, top 40% to 52%, cells in a row; the leftmost cells in accent role, the rest base role.
- Non-goals (Exclusions only): state or call counts; numeric values; code text; cost figures.
- Closed visible text: "top down"; "bottom up"; "best(j)"; "cache"; "fill order".
- Facts and lines: F17 (4880), F18 (4884), F19 (4884).
- SVG RECOMMENDED: YES. Call edges and cell fill order are exact structure. Layout sketch only; no digits.

### FIG-10-05: Drill gate: rule, hand table, code

- Anchor id: 105-practice-knapsack-and-tournament-drills
- Anchor sentence (guide line 4894): "The drill has three steps and forbids coding until the first two are done."
- Job in the message: shows that the code step stays locked until the rule and the hand table exist (F21).
- Message sentence: A drill is passed only after its rule and its hand table are on the page, before any code is typed.
- Must-show phrase: the code step stays locked until the rule and the hand table exist.
- View or layout: blocks in a single row at top 36% to 60%: block 1 at left 6% to 30% (accent role) with "rule first"; block 2 at left 36% to 60% (accent role) with "hand table"; block 3 at left 66% to 94% (warning role border, thick) with "then code". Arrows (base role) at top 48%, from left 31% to 35% and from left 61% to 65%. Ground from top 70% to 86% holds no text.
- Non-goals (Exclusions only): tournament or scoreboard; knapsack values; code text.
- Closed visible text: "rule first"; "hand table"; "then code".
- Facts and lines: F21 (4894).
- SVG RECOMMENDED: no.

### FIG-10-06: Exercises in order

- Anchor id: 106-exercises
- Anchor sentence (guide line 4910): "Work the hand tables on paper first, because a table filled by hand is the correctness argument, while the same table filled by a program you have not checked is only output."
- Job in the message: shows the exercise groups in order, argument, hand table, then comparison (F22; group headings at lines 4912, 4920, 4929).
- Message sentence: The exercises run in order: the argument first, the hand table second, and the comparison of the two styles last.
- Must-show phrase: argument, then hand table, then comparison.
- View or layout: column headings at top 22%: "Greedy arguments" at left 6%; "Tables by hand" at left 36%; "Memoized vs tabulated" at left 66%. Columns (base outline): left 6% to 30%, left 36% to 60%, left 66% to 94%, each from top 30% to 70%. An accent bar inside each column at top 36% to 42%. Arrows (accent role) at top 50%, from left 31% to 35% and from left 61% to 65%. Ground from top 76% to 90% holds no text.
- Non-goals (Exclusions only): problem statements; answers; numbers; code.
- Closed visible text: "Greedy arguments"; "Tables by hand"; "Memoized vs tabulated".
- Facts and lines: F22 (4910); group headings (4912, 4920, 4929).
- SVG RECOMMENDED: no.

## ASSUMPTIONS

1. Camera: every figure is an orthographic straight-on front view, with no perspective, no tilt and no 3D.
2. Light: no light source and no cast shadow in any figure, because every figure is a flat diagram (skill diagram rule).
3. Palette roles: accent marks the chosen or active element, base marks unchanged elements and the ground, warning marks the replaced, rejected or locked element; the model picks the hues within these roles.
4. Ground: a mid-tone neutral ground, no pure white and no pure black fills, and the prompt names no background colour.
5. Visual style: flat vector-like graphic design with uniform stroke weight, using only rectangles, bars and arrows; no gradients, textures, icons, people or objects.
6. Labels: sans-serif text in dark neutral ink (not pure black), drawn only from the closed list in BRIEF.md.
7. Aspect: square for all six figures; landscape and portrait are not planned.
8. Titles: figure titles are page headings and are not drawn inside the image.
9. Digits: no digits appear in any figure; the closed list contains none.
10. Greedy figures show no table, because the greedy listing fills no table (BRIEF.md conflict C1).
11. Anchor sentences may come from any subsection of their H2 section; the H2 section id is the anchor id.
12. FIG-10-02 and FIG-10-04 are layout sketches with no DP values; exact values go to the SVG path.
13. Audience background: the student already knows stacks, queues, heaps and graphs, and the notation used is the guide's own (OPT, K, p, w, v, best).
14. No caption is drawn inside any figure; the guide prose carries the explanation.
15. No figure shows a reconstruction path or a chosen set.
16. Each closed string is drawn once, in English, at the position given for its figure.
17. Each figure is shown at the chapter text-column width, beside its H2 section.

## Checklist (Plan first, step 10)

- Message present in each figure: yes (see per-figure briefs).
- Assumptions listed: yes; confirmation pending from the user.
- Facts sourced to guide lines: yes, except F25 (audience background), which is unsourced, is not a prompt value, and is used only as context.
- Every subject has a job: yes (BRIEF.md subject inventory).
- Closed visible text: all strings are 24 characters or fewer, in double quotes, English, with no digits and no dashes. Checked by a read-only script; the lint is not built.
- Aspect: square for all six rows.
- References: 0 for all six rows.
- Preserve and Exclusions fields: filled in every roster row.
- Lint: not installed; the checks above were run by hand and by script, not by the lint.

## Open risks

- Seedream does not promise legible text. If exact labels must be exact, they belong in an overlay or in the SVG path.
- The mid-tone ground, the absence of pure white and pure black, and the no-digit rule are requests, not promises.
- FIG-10-02 and FIG-10-04 will not hold exact structure; use the SVG path for the exact versions.
- Palette hues are not named, so accent and warning may look alike in a generated image.
- Flat diagrams with no light depart from the default lighting clauses; the user should confirm Assumption 2.
- Guide conflict C1 (guide line 4841) says both builds fill a table; the listings show that the greedy build does not. The guide is not edited here; flag it to the guide author.
- No image has been generated or judged; no image-generation tool was called.

## Amendments after confirmation

The user confirmed all 17 ASSUMPTIONS as written. The changes below came after that. Each design choice was decided through the decision oracle (task dsa-ch10-seedream-prompt-conflicts, logged in ~/.hermes/decisions.jsonl). The confirmed assumption text is unchanged.

- A1 (amends assumption 16): the drawn-once rule has one exception. best(j) is drawn in each of the three boxes of FIG-10-04. Oracle answer a, confidence 0.99.
- A2: in FIG-10-02, the "row above" label moves from below the grid to the left margin, level with the bracket band. Oracle answer b, confidence 1.00.
- A3: the FIG-10-04 Preserve phrase reads "the left chain beside the right strip", not "above". The layout is side by side; this corrects a copy error. No decision was needed.
- A4 (confirmed by the user): in FIG-10-05, block three has a heavier border. This is the one exception to uniform stroke, as the layout specifies. Its fill is set to the base role, which the layout does not state; this is an inference.

- A5 to A8 (detail rewrite, 2026-10-22): see the 'Detail rewrite' section of BRIEF.md. Label budget 12 per figure (A5). Light card plate replaces the mid-tone ground (A6, supersedes assumption 4). Site hex values as target colours (A7). Full detail per the 2d-skills illustration-spec, with a spec file per figure (A8). Assumption 9 (no digits) stays.
