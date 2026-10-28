# Chapter 10, Greedy and DP: illustration plan, rev 1 (PLAN-v2)

Status: drafted, not approved. This file supersedes `PLAN.md` in this folder, which is kept unchanged so the defects can be diffed. Source: guide `dsa`, chapter 10, `data/guides/programacao/dsa/guide.md` lines 4526 to 4965. Contract for every spec: `BRIEF.md`, with amendments A5 to A8 and clarifications C-1 to C-5. No figure has been drawn here and no picture has been judged. The six spec files in `specs/` were drafted before this plan; each is re-checked against this plan at gate G0.

## Decisions taken before the specs

"user" means the user decided, directly or by confirming the text. A number means the oracle confidence recorded in `BRIEF.md`. Rows marked OPEN are not decided; they are listed in Open questions.

| Question | Answer | Source, confidence or 'user' |
|---|---|---|
| Renderer | Seedream 5.0 Flash, text to image, one attempt per figure | user (named Seedream; `PLAN.md` routing) |
| Figure set | six figures, FIG-10-01 to FIG-10-06, one per H2 section beat | user (assumptions 1 to 17 confirmed as written) |
| Canonical instances | the guide's own worked examples; an instance not in the guide is used only if this plan says so and the verifier checks it | user (rebuild instruction) |
| Ground | light card plate, white, with a thin border frame; supersedes assumption 4 | 1.00 (narrowed re-ask, BRIEF A6) |
| Colours | site light-theme hex values as target colours in each prompt; the render is checked, not assumed | 0.98 (BRIEF A7) |
| Label budget | up to 12 visible labels per figure, each 24 characters or fewer, from that figure's own closed list | 0.97 (BRIEF A5) |
| Detail | full detail: one spec per figure with view map, element floors, inventory, requirements, acceptance rows and ledger | user (fuller figures asked; BRIEF A8) |
| Theme | light only; no dark variant for chapter 10 | user (confirmed; chapter 9 ships light only) |
| Anchor id | the H2 section id; the anchor sentence may sit in any subsection of it | user (assumption 11, confirmed); see Q4 |
| Label size | label cap height at least 1.6 percent of width, 16 units on a 1000-unit sheet | BRIEF C-2 (not a numbered decision) |
| Conflict C1 | the listings win; no greedy figure shows a table; the guide is not edited | BRIEF conflicts (resolution recorded) |
| Digits in images | digits are allowed in labels, as chapter 9 shows its numbers; supersedes assumption 9 | user (A9, 2026-10-22); Q1 closed |
| Raster size | 2048 px square, one raster per figure | requester (rebuild instruction) |

## The spine

MESSAGE of the chapter: Greedy and DP are two ways to commit to a choice, and each commitment needs a checkable argument. The guide states the same contrast as "two answers to the same question about commitment" (guide line 4574) and again in the chapter exit paragraph (line 4904).

Audience: an exam-revising student who has met stacks, queues, heaps (chapters 4 and 5) and graphs (chapter 9). This background is planning context only (F25 in `BRIEF.md` is unsourced and no figure carries a number from it).

Prior belief: greedy is a shortcut that usually works, and dynamic programming is the heavier method for the cases where greedy fails. Intended change: both are commitments that need an argument. A greedy choice is safe only when an exchange or stays-ahead argument says so (guide lines 4536 and 4540). A DP answer is trustworthy only when its table shows every alternative (lines 4550 and 4588).

Reading context: inside the chapter prose, at the chapter's text-column width, one figure after the paragraph that holds its anchor sentence. Light theme only, read on a phone at pinch zoom. The figure is a full-bleed white plate, so it reads as a figure and not as a hole in the page.

Lifetime: the chapter's illustration system. The palette, the closed-text rule and the argument-first grammar outlive any one figure, and chapters 11 onward should reuse them.

## View map and roster

Each figure is one square raster at 2048 px. A view is a panel inside the sheet, named A, B or S as in the spec. `element floor` is the minimum count of live marks in that view, where a mark is a bar, box, card, cell, band, block, arrow or label. The floors are the row counts of each spec's inventory in section 6. A script (drafting time, not yet in `facts/`) confirmed that the inventory rows of every spec equal the floor the spec states. A view with no job is deleted, not shrunk.

| ID | Title | Anchor: H2 id; subsection that holds the sentence | Anchor sentence (guide line) | Views and element floors | Dominant element | Canonical instance used |
|---|---|---|---|---|---|---|
| FIG-10-01 | Greedy exchange step | `101-greedy-exchange-and-stays-ahead`; `1011-greedy-choices-and-the-exchange-argument` | "An exchange argument starts from an optimal solution that disagrees with the greedy choice and shows that swapping one piece of the optimal solution for the greedy choice leaves the solution just as good." (4536) | A 21 | the swap arrow between the optimal row and the greedy row | none: abstract jobs i and j (option B, Q2) |
| FIG-10-02 | Knapsack table fills row by row | `102-dp-subproblems-tables-knapsack`; `1023-the-second-table-0-1-knapsack` | "Every right hand side reads the row above, so the table fills row by row from the empty set downward, and each entry is final the moment it is written." (4588) | A 13, B 2 (total 15) | the accent cell K(i, c) and its bracket | capacity 5, items (2,3), (3,4), (4,5), guide 4590 to 4595; drawn as 4 bands by 6 columns (Q3) |
| FIG-10-03 | Argument header above the listing | `103-argument-first-specs-and-reconstruction`; none, the sentence opens the H2 intro | "For a greedy algorithm the argument is an exchange or a stays-ahead sketch placed in the header of the listing, so the reader cannot run the steps without seeing why they are safe." (4607) | A 23 | the three header strips above the listing body | Listing 10.1 header, guide 4611 to 4623 |
| FIG-10-04 | Same recurrence, top down and bottom up | `104-builds-memoized-and-tabulated`; `1045-top-down-memoization-and-the-comparison` | "The rule is to match the style to the access pattern: fill the table when the recursion is dense, cache the recursion when it is sparse." (4884) | S 2, A 9, B 10 (total 21) | the dashed cache loop around the call chain | weighted recurrence on six jobs, guide 4558 to 4559 and table 4565 to 4570; memoized listing 4851 to 4869 |
| FIG-10-05 | Drill gate: rule, hand table, code | `105-practice-knapsack-and-tournament-drills`; `1051-knapsack-for-the-dp-half` | "The drill has three steps and forbids coding until the first two are done." (4894) | A 18 | the locked third block, with its heavier border | drill statement, guide 4894; no values drawn |
| FIG-10-06 | Exercises in order | `106-exercises`; none, the sentence opens the H2 intro | "Work the hand tables on paper first, because a table filled by hand is the correctness argument, while the same table filled by a program you have not checked is only output." (4910) | A 42 | the order arrows between the three columns | exercise groups, headings at guide 4912, 4920 and 4929 |

## Canonical instances (machine-verified)

Run at drafting time: `cd /home/carloshnp/study-site/docs/figures/dsa-10-greedy-dp && python3 facts/verify_facts.py`. Exit status 0. Output, verbatim:

```
WEIGHTED  intervals: [(1, 3, 5), (2, 5, 6), (4, 6, 5), (6, 7, 4), (5, 8, 11), (7, 9, 2)]
WEIGHTED  p(j): [0, 0, 1, 3, 2, 4]  OPT: [5, 6, 10, 14, 17, 17]
GREEDY earliest-finish chosen: [1, 3, 4, 6]  weight: 16  size: 4
MAX SIZE: 4  all max-size sets: [(1, 3, 4, 6)]
MAX WEIGHT: 17  all max-weight sets: [(2, 5)]
GREEDY is max-size: True   GREEDY weight equals OPT: False
KNAPSACK rows i=0..3, c=0..5:
  i=0 [0, 0, 0, 0, 0, 0]
  i=1 [0, 0, 3, 3, 3, 3]
  i=2 [0, 0, 3, 4, 4, 7]
  i=3 [0, 0, 3, 4, 5, 7]
GUIDE CHECK row i=1: matches
GUIDE CHECK row i=2: matches
GUIDE CHECK row i=3: MISMATCH (c, printed, recomputed) = [(3, 5, 4)]
KNAPSACK value-per-weight order: [1, 2, 3]  ratios: [1.5, 1.33, 1.25]
```

What the output settles:

1. The weighted table at guide lines 4565 to 4570 recomputes exactly: p(j) = 0, 0, 1, 3, 2, 4 and OPT = 5, 6, 10, 14, 17, 17. The chapter's F07 row is usable.
2. The six-job greedy choice is jobs 1, 3, 4, 6, size 4, weight 16 (lines 4568 to 4572). The optimum weight is 17, reached only by jobs 2 and 5 (unique). The maximum-size solution is also unique, jobs 1, 3, 4, 6. So on this instance no optimal solution disagrees with the greedy choice, and no exchange can be drawn from it. This is why FIG-10-01 does not use the six-job instance.
3. FINDING, guide line 4595: the printed entry for i = 3 at capacity 3 is 5. The recurrence gives 4, because item 3 has weight 4 and does not fit in capacity 3, so K(3, 3) = K(2, 3) = 4. The plan does not cite 5 at that cell. The other entries of row 3 are correct, and the chapter's capacity 5 result of 7 (line 4597) is unaffected. Flagged to the guide author (Q6).
4. The knapsack density example at guide line 4597 checks by a scratch brute force run at drafting time: density greedy on items (4,7), (3,5), (2,3) at capacity 5 returns 7, and the optimum is 8 from items 2 and 3. The line is correct. The scratch check is not yet in `facts/verify_facts.py`; the figures do not cite it.
5. The weight-20 variant at guide line 4572 checks by the same scratch method: the table returns 26 and greedy returns 16. The line is correct; not yet in the verifier.
6. Guide exercise 3 (line 4916) has a FALSE premise. Scratch check: the jobs [1,2], [2,3], [3,4] have one maximum-size set, all three jobs, so no optimal solution starts with [2,3]. Flagged to the guide author (Q6). The plan does not use this exercise.

FIG-10-01 instance options. The exchange argument needs an optimal solution that disagrees with the greedy first choice. The guide cannot supply one (finding 2).

- Option A, a second instance. Jobs [1,3], [2,4], [4,6] (unweighted). A scratch brute force shows two maximum-size sets, {[1,3], [4,6]} and {[2,4], [4,6]}; the second omits the greedy job [1,3]. It works, but it is a constructed example the guide does not develop, it needs digits in labels (Q1), and it must be added to `verify_facts.py` before any figure cites it.
- Option B, abstract argument. Draw the argument in the guide's own words at line 4536 with the closed labels "job i" and "job j", which carry no numbers. No instance is needed. Recommended.
- Option C, repair exercise 3. Rewrite the guide's premise at line 4916 so an optimal solution does start with a different job, then use that instance. This needs an edit to the guide, which is out of scope here (Q6), and it brings digits back (Q1).

Recommendation: option B. Reason: the guide's exchange argument is abstract (line 4536), the closed labels are abstract, and no guide instance can show the case. This is the same reason chapter 9 drops a claim the text does not develop (strongly connected components).

Limits of the verifier, found while reading it. (a) The guide table is typed into the script, not parsed from `guide.md`, so it cannot detect an edit to the guide; the GUIDE check compares against a copy. (b) It does not check guide lines 4572, 4575 to 4597, 4872 or 4916; the memoized result 17 at line 4875 is checked only through the OPT row. (c) Its docstring says it prints every number the figures may cite, which is not true. Fix these before the verifier is called machine verification for the set.

## Per figure brief

Each brief gives the job, the must-show items, what is forbidden, the dominant element and the state model. The last line of each brief lists the drift between the spec file and this plan, which G0 must close.

### FIG-10-01 Greedy exchange step

Job: the earliest-finishing job, swapped into an optimal solution, keeps the solution feasible and just as large (guide 4534 and 4536; F01, F02).
Reading path: from the top row (the optimal solution) down the swap arrow to the accent job j bar. Hierarchy: two levels, the row and the arrow.
Message: Taking the earliest-finishing job is safe only because swapping it into an optimal solution keeps the solution feasible and just as large.
Must show: an upper row, the optimal solution, of job bars, with the bar "job i" in the warning role at the first slot, which the swap removes; a lower row with the bar "job j" in the accent role in the first slot and the unchanged bars in the same band; a downward swap arrow between the two rows; the label "greedy choice" on the accent bar; the label "exchange step" for the arrow; the label "optimal solution" for the upper row. Five labels in all.
Forbidden: a time axis with values; weights; a table of jobs; any second instance (Q2); code; a claim that the swap is the only optimal solution.
Dominant: the swap arrow with the accent bar at its head.
State model: none; a static sheet showing one exchange.
Drift to close at G0: the spec summary says the upper row has four job bars, while the BRIEF layout gives three per row (job i and two base bars). The spec adds the labels "no overlap", "same size" and "still feasible", which are not in the closed list. Q2 decides the instance.

### FIG-10-02 Knapsack table fills row by row

Job: each band reads only the band above it, so each entry is final when written (guide 4582 to 4588; F09, F10).
Reading path: from the bracket band above, down the arrow, into the accent cell in the lowest band. Hierarchy: two levels, the cell and its bracket.
Message: A knapsack row is final once written because it reads only the row above it, so the last cell holds the answer.
Must show: four equal-height bands, stacked from the top: the empty-set row (i = 0, guide 4592) and three item rows (guide 4593 to 4595); six capacity columns (guide 4590, c = 0 to 5), drawn without values; the accent cell in the lowest band, labelled "K(i, c)"; an accent bracket spanning the full width of the band directly above the cell; one downward arrow from the bracket into the cell; the label "row above" in the left margin, level with the bracket band (amendment A2); the labels "capacity c" over the columns and "item i" beside the rows.
Forbidden: any cell value; item weights or values; a reconstruction path; a chosen set; a five by eight grid; the density example (guide 4597).
Dominant: the accent cell and its bracket, because the single-input argument is the point.
State model: none.
Drift to close at G0: the spec draws five rows and eight columns and calls it "illustrative" (spec section 6). The guide's own table has four rows and six columns (lines 4590 to 4595). Plan rule: four by six. The spec adds "skip item i", "take item i" and "final when written", which are not in the closed list, and draws two arrows into the cell where the BRIEF layout has one. Q3 approves the shape.

### FIG-10-03 Argument header above the listing

Job: the header of a greedy listing carries the choice rule, the exchange argument and the measure, so no step runs without its reason (guide 4609 to 4611; F13).
Reading path: down the three strips in their order, Choice rule, Exchange argument, Measure, then into the body. Hierarchy: two levels, the header and the body.
Message: The argument sits above the listing, so no step runs without its reason on the page.
Must show: a tall listing card; at its top, an argument header of three strips in this order, "Choice rule", "Exchange argument", "Measure", each in the base outline with the first in the accent role (BRIEF layout); the label "argument header" above the card; the label "listing body" beside the body; below the header, abstract base-role bars of varying length with no legible text.
Forbidden: legible code; a DP header; a reconstruction walk; a table; any value outside the verified instance.
Dominant: the header strips, stacked above the body, because the order of the three parts is the message.
State model: none.
Drift to close at G0: the spec adds "checked before run", "on one bar" and "written before code", which are not in the closed list, and draws two body bars as checked. A check mark on a body bar is a mark the BRIEF does not list. Rule for G0: the BRIEF closed list governs; any addition is a numbered spec change (C-5).

### FIG-10-04 Same recurrence, top down and bottom up

Job: one recurrence in two styles. Top down, calls with a cache visit only the reached states. Bottom up, the table fills every entry in order (guide 4880 and 4884; F17, F18, F19).
Reading path: left to right across the divider; in the left half, down the call chain inside the loop; in the right half, along the fill arrow through the cells. Hierarchy: two levels, the halves and the loop or the strip.
Message: One recurrence can run top down through a cache that visits only reached states, or bottom up through a table that fills every entry in order, and the access pattern decides which costs less.
Must show: a vertical divider; left, the top down style: three stacked call boxes, each reading "best(j)" (the one drawn label repeated in each box, amendment A1), downward arrows between them, a dashed loop enclosing the chain labelled "cache"; right, the bottom up style: the label "bottom up", the label "fill order" with a rightward arrow, and one strip of seven cells filled left to right, the two leftmost in the accent role and the rest in the base role. Seven cells stand for OPT(0) to OPT(6) on six jobs (guide 4558 and 4570). The labels "top down" and "bottom up" name the two halves.
Forbidden: call counts; state counts; numeric values; cost figures; code; any statement that the two styles give different answers (guide 4875 says both return 17).
Dominant: the dashed cache loop, because the contrast is what the loop does.
State model: none.
Drift to close at G0: the spec adds "all entries filled" and "reached states only", which are not in the closed list. The dashed loop is a secondary element; under the spec's dash rule it carries its label "cache", which satisfies the rule.

### FIG-10-05 Drill gate: rule, hand table, code

Job: the code step stays locked until the rule and the hand table exist (guide 4894; F21).
Reading path: left to right through the three blocks; the arrows show the order, and the locked block ends the path. Hierarchy: two levels, the blocks and the arrows.
Message: A drill is passed only after its rule and its hand table are on the page, before any code is typed.
Must show: three blocks in one row: the first with the label "rule first" in the accent role, the second with "hand table" in the accent role, the third with "then code" in the base role and a heavier warning border (amendment A4, the one stroke exception); two arrows between the blocks; a warning bar across the third block, without text (the locked state is shown by border and position, not only by colour).
Forbidden: a tournament or scoreboard (guide 4896 to 4898); knapsack values; code text; any number.
Dominant: the locked third block, because the gate is the message.
State model: none; the locked state is a static border, not a frame of a sequence.
Drift to close at G0: the spec adds "locked until both pass", "pass gate", "checked", and "not yet", none in the closed list. "Warning bar" with text is a label the BRIEF does not list. Q5 decides whether the spec or the BRIEF wins.

### FIG-10-06 Exercises in order

Job: the exercise groups come in order: the argument first, the hand table second, the comparison last (guide 4910; headings at 4912, 4920 and 4929; F22).
Reading path: left to right, one column after another, with the accent arrows between them. Hierarchy: two levels, the headings and the columns.
Message: The exercises run in order: the argument first, the hand table second, and the comparison of the two styles last.
Must show: three columns under three headings, "Greedy arguments", "Tables by hand" and "Memoized vs tabulated", from left to right; one accent bar at the top of each column; accent arrows from column one to column two and from column two to column three. The BRIEF layout draws these as the only marks inside each column.
Forbidden: problem statements; answers; numbers; code; a count of exercises.
Dominant: the arrows between the columns, because the order is the message.
State model: none.
Drift to close at G0: the spec draws three small exercise cards in each column (nine cards) and adds "argument first", "compare last", "table second", "table not checked" and "Text only", none in the closed list. The BRIEF layout governs unless Q5 approves the cards. The exercises in the guide are numbered 1 to 16 (lines 4914 to 4935), so a card per exercise would need digits (Q1).

## What is deliberately not illustrated

Chapter-level non-goals, each with its reason, so a later session does not read them as omissions.

- Listings 10.1, 10.2 and 10.3 as code blocks (guide 4613 to 4687) and the Python and Rust builds (4696 to 4838). Code is already a formal object. A picture of code adds a translation step and no claim. FIG-10-03 shows only the header's structure.
- The reconstruction walk, Listing 10.3 (guide 4665 to 4691). A picture of the walk would show the chosen set, which the closed list forbids (assumption 15), and exercise 10 at guide line 4926 asks the reader to do exactly that walk.
- The four-row comparison of tabulation and memoization (guide 4877 to 4882). Its rows are counts and properties. Digits are now allowed (A9), so the digit rule no longer blocks it, but FIG-10-04 already shows the two styles, and a counts table adds no mechanism. The non-goal stands unless the requester reopens it.
- The density greedy knapsack example at guide 4597. It is a second greedy failure, but FIG-10-02 is about the fill order, and a figure of it would need items and values.
- The weight-20 variant at guide 4572. Same reason: values, and FIG-10-01 is about the exchange, not the failure of greedy on weights.
- The tournament drill (guide 4896 to 4898). Grouping and ordering, not greedy or DP; the chapter says it is there to train the other half of its message, and no figure carries that half.
- The exit check (guide 4900 to 4906) and the terms table (4939 to 4962). The exit check is an assessment, and the terms are definitions; a figure would test understanding for the reader.
- The exercises' problem statements and answers (guide 4912 to 4935). A figure would answer the drill for the reader. FIG-10-06 shows their order only.
- Exercise 3 at guide 4916. Not drawn because its premise is false (finding 6). Once the guide is repaired, it can be reconsidered as option C.
- Graph and component material from chapter 9. Chapter 10 does not use it.

## Shared visual system

Locked in `BRIEF.md` (palette table, line grammar, type floors, closed list, A5 to A8, C-1 to C-5). This section records what the plan adds: the contrast check, the closed-text rule, and the plate.

Palette roles, light theme, with the site's hex values as target colours. The contrast ratios were computed at drafting time with a short script (WCAG relative luminance). They are not yet in `facts/`; the script output is the source until the verifier is extended.

| Role | Hex (light) | Use in ch10 | On card #ffffff | On wash #f5f7fa | Rule |
|---|---|---|---|---|---|
| ink | #15181e | labels, structure | 17.78 | 16.56 | text |
| muted | #5c6470 | edges, leaders, connectors | 5.98 | 5.57 | every meaningful stroke |
| faint | #8a92a0 | not used | 3.13 | 2.92 | never text (below 4.5) |
| border | #e7eaf0 | plate frame, separators | 1.21 | 1.12 | decorative only, never a meaningful edge (below 3) |
| card | #ffffff | the plate fill | n/a | n/a | the raster's background |
| wash | #f5f7fa | grouping, inactive bands | n/a | n/a | grouping only, never a state |
| accent | #1d4ed8 | the chosen or active element | 6.70 | 6.24 | active marks |
| accent-soft | #eef3fe | active wash | n/a | n/a | optional fill behind an accent element |
| accent-ink | #14357f | text on accent-soft | 11.38 | 10.60 | 10.23 on accent-soft |
| warning | #b42318 | replaced, rejected, locked | 6.57 | 6.13 | the locked or rejected element only |
| success | #157347 | not used in any ch10 layout | 5.87 | 5.47 | dropped from the prompts unless a layout needs it |

Consequences, which are requirements:

- Accent and warning clear the 3 to 1 rule for meaningful graphics on the white plate (6.70 and 6.57; WCAG 1.4.11, cited in BRIEF A6). The old claim in BRIEF A6 that they reach 2.15 on a mid-tone ground has no hex recorded and cannot be recomputed. The reason for the ground change is still sound, but the 2.15 figure is not evidence.
- Border never carries a meaningful edge. Faint never carries text.
- Hue is never the only carrier. Each accent or warning mark also has a shape, a position, a border or a label (the locked block, the bracket, the arrows).
- Ink is the only text colour that clears 4.5 on every surface. Muted and accent also clear 4.5 on the card.

Line grammar, on the 1000-unit reference sheet (from BRIEF): outline 3.2 units (0.3 percent of width); edge and arrow 1.6 units (0.16 percent), with a filled arrowhead 14 units long; hairline and plate frame 1.0 unit. A dashed line means one thing only, a secondary or reuse loop, and every dashed element carries its label (the cache loop). Warning block borders are heavier than the outline only in FIG-10-05 (A4).

Type floors: label cap height at least 1.6 percent of width, which is 16 units on the 1000-unit sheet; panel labels 1.8 percent of width, semibold; label length 24 characters or fewer, one or two lines. The site's own floor is 14 units (BRIEF); ch10 sits above it on purpose, and ch9's labels are 15 units, so the two chapters do not share a label size. Nothing is drawn below 16 units.

Label budget: up to 12 visible labels per figure (A5). The drawn-label counts from the BRIEF layouts are: FIG-10-01 five, FIG-10-02 four, FIG-10-03 five, FIG-10-04 seven (five strings, with "best(j)" drawn three times), FIG-10-05 three, FIG-10-06 three. Each spec's extra strings must stay inside the same budget, and any extra label is a numbered change (C-5).

Closed-text rule: a figure draws only the strings in its own closed list, each in English, in double quotes in the prompt, drawn once except the A1 exception. The list in each spec must equal the list in the prompt for that figure (Q5). Digits are allowed in labels (A9, user decision), so the guide's numbers may appear, each taken from facts/verify_facts.py output. No caption is drawn inside a figure; the caption is the alt text (see the delivery contract).

The plate: the raster is the card. A white full-bleed plate with a 1.0-unit frame in the border colour. No transparency, no gradient, no shadow, no light source. The frame lets a light plate read as a figure on the light theme, and it is the only border the card carries.

### Composition and prompt rules (from BRIEF, applied to every figure)

- One dominant element per figure, named in its brief. At most three hierarchy levels. A reading path of arrows or position from entry to payoff.
- Each element has a job in the message. An element without a job is deleted at G0, not shrunk.
- Each prompt keeps the ten Seedream headings in order (Task, References, Composition, Subjects, Product and materials, Lighting and camera, Art direction, Visible text, Preserve, Exclusions) and then a Revisions table. Layout percentages are written in words.
- Prompts are 600 to 1000 words. A longer prompt is cut, not padded.
- No em dash and no en dash in a prompt outside double quotes. No banned descriptor (clear, clean, modern, professional, appealing, balanced, readable) in Subjects, Product and materials, or Lighting and camera.
- Lighting and camera: flat graphic design, no light source, no cast shadow, orthographic straight-on front view, no perspective, no 3D.

## Gates

Ch9 has seven gates. Chapter 10's figures are raster outputs from Seedream, not drawn SVG, so some ch9 gates do not apply. The reason is given for each.

| Gate | Approves | Status for ch10 |
|---|---|---|
| G0 Intake | this plan's sections, and each spec re-checked against it | open: the six specs predate this plan; the drift is listed per figure above |
| G1 Thumbnails | three concepts at final aspect | does not apply: Seedream returns one raster per prompt, so there are no concept thumbnails; the concept is fixed at G0 |
| G2 Silhouette and value | two value reductions, focal junction | does not apply: a raster cannot be reduced to a value study from a prompt; value and focus are checked on the render at G5 |
| G3 Rough | content coverage, labels roughed in | does not apply: the first raster is the rough; a second attempt is a new G4 build |
| Factual accuracy | every number and every label against `verify_facts.py` or a guide line | open: finding 3 (knapsack c = 3), option A or B for FIG-10-01 (Q2), four by six for FIG-10-02 (Q3) |
| G4 Build | one prompt per figure with the closed list, layout percentages, palette targets and exclusions; one render per figure | not passed: renders exist in `renders/` (16:00 to 16:02) and in `renders/v1/` (earlier); none has been judged; prompts must be re-cut to this plan first |
| G5 Acceptance | every spec section 10 row run on the render, plus the closed-text and mark-count check by a non-author reviewer | not started; reviewer to be named by the requester (Q10) |

The ch9 state sweep does not apply: no ch10 figure has a state model that changes across frames, so the only state is the static sheet, and section 9b of each spec says so.

### G0 checklist (run before any prompt is re-cut)

- Each spec's view floor equals the inventory row count in its section 6 (the script check above, repeated after edits).
- Each spec's closed list equals the list in its prompt, and the list is within the label budget of 12.
- Each spec's requirement rows match the figure's job, must-show and forbidden lines in this plan; a requirement that adds a mark not in the inventory is a finding.
- The FIG-10-01 instance question (Q2) and the FIG-10-02 shape (Q3) are answered in writing, with the answer copied into the spec's section 11.
- The alt text (MESSAGE) matches the figure brief word for word.
- Every number in a spec either comes from `verify_facts.py`, from a guide line named in the spec, or from the design parameters in this plan (2048, 12, 1.6 percent, 3 to 1), which are requirements and carry their source here.

## Open questions

Each question has an owner, "the user" or "the requester". Recommendations are given where the plan has one; none of these is decided here.

- Q1 (the user). Digits in images. CLOSED by the user (A9): the guide's numbers may appear in labels. Consequences that stay open: the closed lists change, the specs and prompts must be re-derived before any render (Q7), and the label budget is re-checked.
- Q2 (the user). FIG-10-01 instance. Option A (constructed three-job instance), option B (abstract, recommended), option C (repair guide exercise 3 first). See Canonical instances.
- Q3 (the user). FIG-10-02 shape. Approve four bands by six columns, the guide's own table shape, in place of the spec's five by eight. Recommended yes.
- Q4 (the user). Anchor placement. The confirmed assumption 11 names the H2 section id as the anchor. The sentences sit in subsections 1011, 1023, 1045 and 1051 (the H2 intros for 103 and 106). Recommended: keep the H2 id as the record, and insert each figure after the paragraph that holds the sentence, which is what the delivery contract does.
- Q5 (the user). Closed lists. The specs quote strings the BRIEF does not list: FIG-10-01 three, FIG-10-02 three plus a variant of "row above", FIG-10-03 three, FIG-10-04 two, FIG-10-05 four, FIG-10-06 five. Some quoted strings may be notes to the author and not drawn text; G0 sorts them. Approve the spec lists and update the BRIEF and prompts to match, or hold the BRIEF list and trim the specs. Also decide whether the three cards per column in FIG-10-06 stay.
- Q6 (the user). DECIDED by the user (2026-10-22): the guide stays as it is; these findings are reported only and not edited. Consequence: with digits allowed, a figure of the guide's knapsack table would show 4 at i = 3, c = 3, which contradicts the guide's printed 5 until the guide author corrects line 4595. Guide corrections, for the author: (a) line 4595, the printed value 5 at i = 3, c = 3 should be 4; (b) exercise 3 at line 4916, its premise is false; (c) line 4841, conflict C1, still says both builds fill a table; (d) line 4872, the assert, and line 4875, the claim it supports, should be checked.
- Q7 (the user). The renders. `renders/` holds the 16:00 to 16:02 detailed set, judged by the decision oracle in tasks dsa-ch10-detail-qa-A and -B (18 of 18 yes; FIG-10-05 detail 0.73). `renders/v1/` holds the first set, judged for structure only. Neither has had the non-author review that G5 requires. Recommended: re-render after G4, because the prompts change under Q1 to Q5.
- Q8 (the user). Raster format. Seedream returns JPG (`results.json`, 2048 by 2048). Keep JPG as returned, or convert to PNG for flat edges. The size of 2048 px is fixed by the requester.
- Q9 (the user). Route for FIG-10-02 and FIG-10-04. The old routing sends these two to the SVG path for exact structure. With no digits (Q1), they need structure only, so Seedream may suffice. Keep Seedream with a stated risk, or move them to SVG.
- Q10 (the requester). Acceptance reviewer. The FIG-10-03 spec names a non-author reviewer "to be named by the requester". G5 cannot start without a name.
- Q11 (the user). Chapter 9 reconciliation. The ch9 plan's delivery contract does not match its shipped output (see Revision history). Decide whether ch9 is rebuilt to the dark variant, or its plan is rewritten to light only. Not a ch10 decision; raised because the same contract text is the template for ch10.

## Delivery contract

The specs describe figures; this section fixes how a figure becomes a page image. Ch9's `integrate_figures.py` is the model; ch10 has no equivalent yet.

- Theme: light only. One raster per figure. The raster is the card: a full-bleed white plate with the frame in the border colour (1.0 unit). No dark variant is made, and no site change for theme is needed.
- Size: 2048 px square, the requester's size. The v1 renders already meet it (`results.json`, dims 2048 by 2048).
- Format: as returned by the render, JPG in v1, unless Q8 changes it.
- Names: `FIG-10-NN-<slug>.jpg`, with slugs from the roster titles (for example `FIG-10-01-greedy-exchange-step.jpg`). The set is copied to a `figures/` folder beside `guide.md`, which is the folder the guide's relative links resolve against (ch9 convention).
- Insertion: one markdown line, as its own paragraph with a blank line above and below, placed immediately after the paragraph that holds the anchor sentence: `![MESSAGE](figures/FIG-10-NN-<slug>.jpg)`. For FIG-10-03 and FIG-10-06 the anchor sentence opens the H2 intro, so the figure goes before the first subsection heading.
- Alt text: the figure's MESSAGE sentence, as listed in the per-figure briefs. The alt text is the caption, so no second caption paragraph is written in the markdown.
- Static sheet: the raster shows the whole figure in its one state. No figure depends on a viewer stepping through frames.
- Idempotence: a figure already present in the guide is not inserted twice (ch9 rule; to be copied).
- Commands that exist: `python3 facts/verify_facts.py` (verifier; prints the numbers) and `python3 /home/carloshnp/.hermes/skills/2d-skills/scripts/check_spec.py specs/FIG-10-0N.spec.md` (structure audit).
- Commands that do not exist yet: a render command for ch10 (the v1 renders came from a Seedream call through OpenRouter, recorded in `results.json`, with no script in the folder); a closed-text and mark-count check; the insertion script. These are first build tasks, and no one should claim them as run.

## Spec status at approval

Measured at approval: pending. The rows stay open until each spec is re-audited against this plan at G0.

| Figure | Requirements | Views | Floor sum | Lines | Audit |
|---|---|---|---|---|---|
| FIG-10-01 | pending | pending | pending | pending | pending |
| FIG-10-02 | pending | pending | pending | pending | pending |
| FIG-10-03 | pending | pending | pending | pending | pending |
| FIG-10-04 | pending | pending | pending | pending | pending |
| FIG-10-05 | pending | pending | pending | pending | pending |
| FIG-10-06 | pending | pending | pending | pending | pending |

Interim, not an approval: the six existing spec files pass `check_spec.py` with 0 findings, with 14, 13, 13, 16, 14 and 14 requirements (84 in total). The audit checks structure, not text, so it does not test the closed lists or the floors against this plan.

## Revision history

| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | Rebuild as PLAN-v2.md, to chapter 9's section depth: decisions, spine, view map with floors and anchors, canonical instances checked by the verifier, per-figure briefs, non-goals, visual system with contrast, gates, open questions, delivery contract, spec status, revision history | The old PLAN.md was too shallow to govern the specs, and its defects are listed below |
| 2 | 2026-10-22 | User decisions applied: digits allowed in labels (A9, supersedes assumption 9); guide left as it is (Q6 reported only); Q1 and Q6 closed. Q2 to Q5, Q7 and Q9 to Q11 remain open | The planner finished before the user's answers and recorded Q1 as open; the answers are now in the plan |
| 3 | 2026-10-22 | Corrections after the planner completed: Q7 now records that the 16:00 set was judged by the oracle (the draft said unjudged); the verifier parses guide.md instead of hand-typed tables (verify_facts.py); BRIEF's old palette section is marked superseded; the 2.15 contrast is labelled as computed for an assumed ground hex | Checked against the guide and the verifier output; these were defects in this plan and in the earlier BRIEF |

Defects of the old `PLAN.md`, named here so they can be diffed:

1. Assumption 9 (no digits in any figure) blocks the guide's own numbers, which chapter 9's figures show (for example d = 0 and distance 0). Closed by the user as A9 (digits allowed), 2026-10-22.
2. The mid-tone ground (assumption 4) was chosen without a contrast check. Computed now: accent 6.70 and warning 6.57 on white. The 2.15 figure in BRIEF A6 has no hex recorded and is not evidence.
3. Theme. Chapter 9's plan promised two variants and its shipped output is light only. The user confirmed light only for chapter 10, which is now recorded in the decisions table.
4. No decisions routed before the specs, a one-sentence spine, no non-goals with reasons, no gates, no delivery contract, no audit table. All added in this file.
5. Facts cited by hand, with F25 unsourced. Every number here comes from the verifier or a guide line with its line number. F25 remains unsourced and carries no number.

Defects found beyond the five:

6. Guide line 4595: printed knapsack entry 5 at i = 3, c = 3, where the recurrence gives 4 (finding 3).
7. Guide exercise 3, line 4916: false premise (finding 6).
8. The old plan did not face the fact that the six-job greedy optimum is unique, so FIG-10-01 had no valid instance.
9. `BRIEF.md` still carries the superseded "Palette by role" section (mid-tone ground, no hex, lines 83 to 90) beside the A6 and A7 palette (lines 174 to 187). Two conflicting palettes sit in one file.
10. The six specs disagree with the BRIEF and the prompts: FIG-10-02 invents a five by eight grid; the specs add labels and cards outside the closed lists (Q5); FIG-10-01 says four bars where the layout gives three.
11. The old plan used H2 ids for anchors whose sentences sit in subsections (1011, 1023, 1045, 1051). Now Q4.
12. `verify_facts.py` types the guide table in by hand, does not check lines 4572, 4597, 4872 or 4916, and overclaims in its docstring.
13. The closed-text lint was not built, and the old checklist said the checks were "by hand and by script" without naming the script. This plan names none that does not exist.
14. No render command is recorded for the Seedream set, and two unjudged render sets sit in `renders/`.

Chapter 9 contradiction, stated plainly: the chapter 9 plan's delivery contract (revision 4) requires a light and a dark raster per figure at 1280 and 2560 px under `out/`, with dark values under `data-theme="dark"` in each SVG. The shipped output does not do this. `render/` holds eleven light-only PNGs at 1000 px wide (heights 480 to 1140) with no theme suffix and no `out/` folder, plus three `_z_` scratch PNGs. `svg/` holds eleven SVGs with zero `data-theme` attributes. `SVG-INTERFACE.md` line 18 specifies literal light hex only, and `BRIEFING.md` section 5 says no raw hex appears inside a drawing. The chapter 9 plan therefore contradicts its own shipped output and its supporting files. Its `BRIEFING.md` also cites a `check_spec.py` path under `svg/illustration-spec/`, which does not exist; the script is at the 2d-skills path above.
