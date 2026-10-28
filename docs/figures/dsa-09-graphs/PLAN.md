# Chapter 9, Graphs: illustration plan

Guide `dsa`, chapter 9, rendered source `/home/carloshnp/study-site/content/guides/dsa/chapters/09-graphs.json`.
This plan covers the eleven figures of the chapter and the shared visual system they are drawn in.
It stops at spec approval: no figure has been drawn.

Contract for every spec: `BRIEFING.md` in this directory. Read it before writing.

## Decisions taken before the specs

Routed through the decision oracle on 2026-10-22 (task `dsa-ch09-illustration-plan`, logged
in `~/.hermes/decisions.jsonl`), all followed:

| Question | Answer | Confidence |
|---|---|---|
| How many figures | 10, one per teaching beat | 0.91 |
| Depth per spec | every spec carries section 9b plus numbered build steps | 0.95 |
| Language | English specs and English in-figure labels | 0.73 |
| Palette policy | site tokens only, accent for active, success for final, warning for contradiction, hue always doubled by shape or label | 1.00 |
| Placement | the plan fixes section id and anchor sentence for every figure | 0.97 |

## The spine

MESSAGE of the chapter: a graph is one object seen three ways, and every traversal answers
the same question about when a piece of the answer may be trusted.

Audience: a student revising for an exam, who can read pseudocode and has met stacks,
queues and heaps in chapters 4 and 5. Prior belief: "BFS, DFS and Dijkstra are three
unrelated recipes". Intended change: they are three answers to one finality question, and
each answer has a contract that can be checked frame by frame.

Reading context: inside the chapter prose, in a column capped at 1120 px, light and dark,
phone read in the lightbox at pinch zoom. Lifetime: the chapter's illustration system, not
one talk, so the palette and the canonical geometry outlive any single figure.

## View map and roster

Every figure is one sheet at 1000 units wide. `floor` is the minimum live element count per
view, taken from that view's inventory. A view with no job is deleted, not shrunk.

| ID | Title | Anchor (section id, after) | Views and floor | Dominant element |
|---|---|---|---|---|
| FIG-09-01 | What a graph records | `911-what-a-graph-records`, after "A graph with no edges at all is called an empty graph, and its vertices are isolated." | A undirected anatomy 24, B directed with in and out degree 20, C weighted edge and isolated vertex 12 | the undirected piece in A |
| FIG-09-02 | Two representations, two costs | `911-what-a-graph-records`, after the paragraph ending "beside the decompositions that use them." | A adjacency list 26, B adjacency matrix 40, C the cost pair 10 | the matrix grid |
| FIG-09-03 | One graph, three pieces | `921-components-the-first-decomposition`, after "Decomposing this way costs one traversal of the whole graph, and every later question about the graph can be asked one component at a time." | A the split graph 32, B membership and maximality 12 | the five vertex piece |
| FIG-09-04 | Order or cycle | `922-orderings-when-the-edges-point-forward`, after "The order matters in practice because it is the sequence in which work may safely proceed: t may be processed only after c, and c only after both a and b." | A the DAG with two valid orders 26, B the same graph plus t to s 18 | the order rails in A |
| FIG-09-05 | The cheaper route is not the shorter one | `923-paths-distance-and-the-worked-example`, after "This is the whole reason a shortest path algorithm cannot simply prefer long edges or short edges: cost is a sum, and the cheapest route is the one whose sum is smallest." | A weighted graph with the shortest path tree 34, B the cost arithmetic 12 | the edge a to t, drawn as the rejected route |
| FIG-09-06 | Anatomy of a specification | `931-reading-an-invariant`, after "Once the loop ends, the loop condition and the invariant combine to yield the postcondition. This is the same shape that the invariant drills of chapter 2 used, applied now to graph traversals." | A the three part gate 18, B the BFS instance 14 | the loop body and its two induction arrows |
| FIG-09-07 | BFS in layers | `932-breadth-first-search`, after "The invariant explains the layer structure: when a vertex is dequeued, its distance is final, so the first time any vertex is reached is already by a shortest path." | A layers and finality 30, B queue strip per step 26 | the queue strip |
| FIG-09-08 | DFS and the shape of time | `933-depth-first-search`, after "The invariant makes the nesting visible: a vertex is active exactly while it sits on the current path, and it becomes finished only after every branch below it has been explored." | A the active path as nested frames 24, B discover and finish intervals 22 | the nested interval bars in B |
| FIG-09-09 | Dijkstra settles in cost order | `934-dijkstra-for-weighted-shortest-paths`, after "The nonnegative weight precondition is not decoration: a negative edge can make a settled vertex suddenly reachable by a cheaper route, and the invariant would then be false." | A settlement and relaxation 36, B the negative breaker 16 | the extraction ladder in A |
| FIG-09-10 | Toposort by prepending | `935-topological-order-and-cycle-detection`, after "With this listing the specification half of the chapter is complete: one numbered contract per question, each with the invariant that its implementation must preserve, and the next subsection transcribes all four into running code." | A finish order becomes an order 28, B the back edge 18 | the growing list in A |
| FIG-09-11 | When each answer is final | `935-topological-order-and-cycle-detection`, after the same paragraph that closes 9.3 | A BFS first reach 24, B DFS last branch 24, C Dijkstra extraction 24, one band each | the marked vertex `c`, repeated in three bands |

## Per figure brief

### FIG-09-01 What a graph records

Job: give the reader the vocabulary as a picture they can point at, before any algorithm.
Must show: the five vertex piece from 9.1 with its seven edges ({s,a} {s,b} {a,b} {a,c}
{b,c} {c,t} {a,t}, the set the degree sum of 14 requires); the degree written beside each
vertex (s 2, a 4, b 3, c 3, t 2); the same five vertices as a directed graph carrying the
chapter's five example arcs (s to a, s to b, b to c, a to c, c to t), stated as a directed
graph in its own right and not as an orientation of view A, one vertex carrying both an
in-degree and an out-degree callout; one edge carrying a weight
chip; the isolated vertex `w` with degree 0, drawn without any edge at all.
Forbidden: any cost claim about representations (FIG-09-02 owns that), any split into
components (FIG-09-03), any cycle.
Dominant: the undirected piece in view A, larger and darker than B and C.

### FIG-09-02 Two representations, two costs

Job: the container trade, shown on the same graph twice.
Must show: the adjacency list of the five vertices as five key rows with their neighbour
lists; the adjacency matrix as a five by five grid with the symmetric filled cells visible
and the two halves distinguishable; a comparison row that pairs space against query, with
16 entries for the list against 64 cells for the matrix on this graph, and the asymptotic
pair O(V+E) against V squared credited to 9.1.1.
Forbidden: mixing a cost from the sample graph with a cost from another graph in one pair
of numbers; drawing the matrix as a heat map.
Dominant: the matrix grid, because the wasted cells are the argument.

### FIG-09-03 One graph, three pieces

Job: components as a decomposition, with maximality visible.
Must show: all eight vertices at the canonical coordinates; three component boundaries that
do not overlap and do not enclose a vertex twice; the isolated `w` outside every boundary;
a membership block that names each component and states the reason it cannot grow, as one
short line per component.
Forbidden: edge weights, directed arcs, any distance value.
Dominant: the five vertex piece, because it is the one that carries the rest of the chapter.

### FIG-09-04 Order or cycle

Job: an order exists exactly when there is no cycle.
Must show: the five arcs s to a, s to b, b to c, a to c, c to t with arrowheads; two order
rails, s b a c t and s a b c t, presented with equal emphasis and both checked against the
same arcs; the second view adding t to s, marking the closed cycle, and marking the order as
impossible without relying on colour alone.
Forbidden: presenting one valid order as the correct one; a topological order asserted
without the arc check.
Dominant: the two rails, because the argument is that both are right.

### FIG-09-05 The cheaper route is not the shorter one

Job: cost is a sum, so the route with more edges can be cheaper.
Must show: the seven weights; the shortest path tree from s with d values (s 0, b 2, a 3,
c 8, t 11); the direct arc a to t in the contradiction role, next to the route through c;
the arithmetic 3 + 10 = 13 against 3 + 5 + 3 = 11, both starting from a at cost 3.
Forbidden: the literal path s a t (4 + 10 = 14) presented as the alternative unless it is
labelled as a path and not as the route from a, because d(a) is 3 through b.
Dominant: the arc a to t, drawn as the route the reader wants to take and should not.

### FIG-09-06 Anatomy of a specification

Job: a loop invariant is a claim that survives the loop, and that is why the algorithm is
correct.
Must show: the three parts named (precondition, loop invariant, postcondition); the loop body
drawn as a closed cycle; two arrows carrying the induction (true at entry, preserved by each
iteration); the exit arrow that combines the loop condition with the invariant to yield the
postcondition; a second view instantiating the same three parts with BFS, in at most three
short lines of 24 characters.
Forbidden: quoting the full Listing 9.1 invariant inside the SVG, it belongs in the caption;
drawing the chain as a straight sequence of three boxes, which loses the induction.
Dominant: the loop body, because the invariant belongs to it.

### FIG-09-07 BFS in layers

Job: the layer structure is the invariant made visible, and finality happens at dequeue.
Must show: the connected piece with three distance bands (0, 1, 2) and a distance chip per
vertex; the queue at every step of the replayed trace (s; a b; b c t; c t; t; empty, where t
joins at the step that dequeues a because t is a neighbour of a); the vertex currently
dequeued in the active role and its distance chip switching to the final role at that moment;
a label stating that the queue never holds more than two consecutive layers.
State model required, step 0 to 5.
Forbidden: weights, a priority queue, a DFS stack in the same figure.
Dominant: the queue strip, because it is the mechanism.

### FIG-09-08 DFS and the shape of time

Job: nesting of discover and finish times is the recursion, made measurable.
Must show: the current path as nested frames with the active vertex innermost; a timeline
carrying the verified times (discover s 1, a 2, b 3, c 4, t 5; finish t 6, c 7, b 8, a 9,
s 10) as intervals whose containment is geometric, not merely labelled; the three colours
white, gray, black mapped to the palette with a second, non colour carrier for each (outline
weight or fill pattern).
State model required, time 0 to 10.
Forbidden: a tree drawn with straight parent links but no time axis, which hides the nesting.
Dominant: the interval bars, because they are the argument.

### FIG-09-09 Dijkstra settles in cost order

Job: settling is a promise, relaxation is why the promise can be kept, and one negative edge
breaks the promise.
Must show, view A: the weighted piece; the extraction ladder s 0, b 2, a 3, c 8, t 11 with
the extracted vertex and its final distance; at least one relaxation drawn as an arrow with
its arithmetic (2 + 1 = 3 for a through b); the priority queue contents at the first three
extractions.
Must show, view B: three vertices 0, 1, 2 with arcs 0 to 1 weight 3, 0 to 2 weight 4, 2 to 1
weight -2; the settled value 3 in the final role and the true value 2 in the contradiction
role; one line naming the invariant that fails (a settled distance is not final).
Forbidden: a negative weight in view A; a second algorithm in view B.
Dominant: the extraction ladder in A, because the order of extraction is the algorithm.

### FIG-09-10 Toposort by prepending

Job: the order is produced by where each vertex is inserted, and the cycle is found by the
same traversal.
Must show, view A: the finish order of the DAG traversal; the list growing by prepending,
with each insertion visibly entering at the left; the final order s b a c t; a forward check
of every arc against the final positions.
Must show, view B: the arc t to s reaching an active vertex, the active set as the current
path, and the reported cycle; one panel label stating that both outcomes come from the same
visit procedure. Both views use one neighbour order, s:[a,b], so the reported cycle is
s a c t s; if a reviewer prefers s b c t s, the order must change to s:[b,a] in both views,
never in one.
State model required, finish index 0 to 5.
Forbidden: Kahn's algorithm, which the chapter does not present; a cycle drawn as a separate
graph from the traversal.
Dominant: the growing list in A.

### FIG-09-11 When each answer is final

Job: the chapter's spine, one vertex trusted at three different events. The MESSAGE is that the
three algorithms disagree about the event and not about the claim.
Must show, three bands: BFS first reach of `c` at layer 2 with the chip final at enqueue; DFS the
close of `c`'s last branch at finish time 7, with the active path visible; Dijkstra the extraction
of `c` at 8 with its neighbours already relaxed. All three bands use the canonical coordinates,
and the marked vertex is `c` in every band, so the reading path runs vertically through one vertex.
Forbidden: a ranking of the three, a fourth algorithm, code, or a claim that the events coincide.
Anchor: section 9.3.5, after the paragraph that closes the specification half of the chapter. The
caption carries the chapter's own sentence from 9.6.3 that names the three events.

## What is deliberately not illustrated

Non-goals, with the reason, so a later session does not read them as omissions:

- The Python listings of 9.4 and the Rust listings of 9.5.1 and 9.5.2. Code is already a
  formal object; a picture of code adds a translation step and no claim.
- The petgraph container family as a four way comparison (Graph, StableGraph, GraphMap,
  MatrixGraph). Deferred because 9.5.3 presents the four as one space against query trade, which
  is loose (StableGraph is about index stability, GraphMap about keying), so a figure would either
  repeat FIG-09-02 or expose that the sentence is wrong. Fix the sentence before drawing it.
- The borrow story of 9.5.2. Its reason is not that a borrow partition has no geometry: one
  shared slice, three owned locals and disjoint slice parameters would draw in FIG-09-03's
  non-overlap grammar. The reason is that the chapter calls the story deliberately boring, and
  neither the exit check nor an exercise tests it, so the figure would spend a page on a claim the
  assessment ignores.
- Practice (9.6) and exercises (9.7). They are drills against references; a figure would
  answer the drill for the reader.
- Strongly connected components, named once in 9.2.1. Candidate FIG-09-12: the chapter never
  works a directed example, and a figure would assert a case the text does not develop.

## Shared visual system

Locked in `BRIEFING.md` sections 3 to 5: canonical coordinates for the sample graph, one
canvas width of 1000 units, the line grammar, the eleven role palette with light and dark
hexes, and the verified contrast ratios that decide which role may carry text.

Two rules that every figure inherits and no figure may trade:

1. A meaning carried by hue is also carried by shape, dash or label. The site is read in
   both themes and the chapter is read by students who may not separate the accents.
2. The sample graph is drawn once. Any figure that shows it inherits the coordinates from
   `BRIEFING.md` section 3, so a reader who has seen FIG-09-03 can navigate FIG-09-09.

## Gates

The illustration-spec gate list applies, with the factual accuracy gate inserted before the
build gate because this chapter asserts numbers a reader can check by hand.

| Gate | Approves | State |
|---|---|---|
| G0 Intake | sections 1 to 4, no sketch exists | this phase, per figure |
| G1 Thumbnails | three concepts at final aspect, grayscale | not started |
| G2 Silhouette and value | two value reduction, focal junction | not started |
| G3 Rough | content coverage, labels roughed in | not started |
| Factual accuracy | every number against the chapter | this phase, per spec |
| G4 Build | line grammar, palette, text placement, steps | not started |
| G5 Acceptance | section 10 run in full plus state sweep | not started |

## Open questions

- Q1: does the chapter want the DFS figure at the moment the recursion is deepest, or a
  timeline covering the whole traversal? The plan asks for both views; if only one survives
  review, keep the timeline. Owner: the requester.
- Q2: should FIG-09-02 keep the 1000 vertex example of exercise 2, which would make the cost
  row concrete at scale, or stay on the sample graph? The plan keeps the sample graph,
  because a second graph in the chapter's first third costs a page and adds no mechanism.
- Q3: FIG-09-09 view B overlaps exercise 10. Keeping it makes the invariant falsifiable in
  the text; dropping it makes the exercise the only place the failure is shown. The plan
  keeps it, and the exercise then checks understanding rather than introducing the idea.

## Delivery contract

The specs describe figures; this section fixes how a figure becomes a page image, because the site
delivers one raster per figure and every spec locks a light and a dark palette.

**Theme.** The site's theme is a class on the html element (auto, light, dark, stored per device),
so a media query on prefers-color-scheme does not follow the manual toggle. Each figure is
therefore rendered twice from one source, once per theme, and the figure component shows one of
the two at a time with the site's dark class. One asset cannot honour both columns of the palette,
and a light-only figure is a bright plate on a near black page.

**Source.** One hand-authored SVG per figure at `svg/FIG-09-NN-<slug>.svg`, one viewBox, dimensions
as declared in that spec. The palette binds through custom properties in a style block, with the
light values on the root svg and the dark values under a `data-theme="dark"` attribute on it, so a
single source produces both variants and can also be inlined later without a rewrite. Montserrat is
embedded (base64 woff2) or converted to paths at raster time; a substituted font voids every type
size and measure the specs assert.

**Output.** `out/FIG-09-NN-<slug>-<theme>-<width>.png` at 1280 and 2560 px wide, which covers the
640 and 1280 srcset at 1x and 2x. The media manifest needs one entry per variant with a theme key,
and `Figure.tsx` renders both with CSS visibility (`dark:hidden` and `hidden dark:block`) so the
toggle works without JavaScript. That component change is the only site change the plan requires,
and it is a build task, not a planning decision.

**Insertion.** One markdown image line immediately after the anchor paragraph named in the roster.
The caption is the alt text, because `Figure.tsx` builds the figcaption from it; no second caption
paragraph is written in the markdown. The alt text is the spec's section 1 message sentence.

**Static sheets.** Figures are still images, so a sheet that has a state model shows all of its
frames at once, as the strip, ladder or band layout already specified, at the default state named
in its section 9b. No figure depends on a viewer stepping it.

**Commands.** Specs are audited with `python3 verify_specs.py`. Rendering is not implemented yet:
the first build task is `render_figures.py --figure FIG-09-NN --theme light|dark --width 1280`,
which must also run the sweep named in the figure's section 9b and fail on a broken invariant.

## Spec status at approval

Measured on 2026-10-22 with `verify_specs.py` and `check_spec.py`, both run on every file. Eleven
specs, each with zero findings, every requirement answered by one acceptance row.

| Figure | Requirements | Views | Floor sum | Lines | Audit |
|---|---|---|---|---|---|
| FIG-09-01 | 16 | 3 | 58 | 198 | 0 findings |
| FIG-09-02 | 12 | 3 | 162 | 207 | 0 findings |
| FIG-09-03 | 14 | 2 | 59 | 209 | 0 findings |
| FIG-09-04 | 12 | 2 | 44 | 174 | 0 findings |
| FIG-09-05 | 13 | 2 | 46 | 207 | 0 findings |
| FIG-09-06 | 15 | 2 | 32 | 196 | 0 findings |
| FIG-09-07 | 14 | 2 | 56 | 200 | 0 findings |
| FIG-09-08 | 13 | 2 | 102 | 174 | 0 findings |
| FIG-09-09 | 18 | 2 | 52 | 205 | 0 findings |
| FIG-09-10 | 16 | 2 | 46 | 189 | 0 findings |
| FIG-09-11 | 18 | 3 | 110 | 218 | 0 findings |

Totals: 161 requirements, 25 views, 767 live elements of floor, 2177 lines. `_prev/` holds the ten
pre-audit drafts, kept so a reviewer can diff what the audit changed; it is not part of the set.

Run both audits with:

```bash
cd /home/carloshnp/study-site/docs/figures/dsa-09-graphs
python3 verify_specs.py
```

## Decisions taken after the first audit

The audit wave found factual defects, one semantic error and two editorial gaps. Three forks were
routed again, logged in the same file:

| Question | Answer | Confidence |
|---|---|---|
| Add a synthesis figure at 9.3.5 and keep FIG-09-06 with a cost part | yes, eleven figures | 0.95 |
| Draw FIG-09-02 on the whole eight vertex graph | yes, so every printed number is countable | 0.95 |
| Make the cost bars dominant in FIG-09-05 | yes, the addition is the message | 0.82 |

Both oracle calls were made; the first omitted the adverse evidence from its state and the question
was re-asked with it, which returned the same answers at the same or higher confidence.

## Revision history

| rev | date | change | why |
|---|---|---|---|
| 1 | 2026-10-22 | Plan created with ten figures, roster and anchors | First planning pass for the chapter |
| 2 | 2026-10-22 | FIG-09-01: the five vertex piece has seven edges, not six, and view B carries the chapter's five arcs rather than an orientation of view A. FIG-09-07: the BFS queue trace replayed is s, a b, b c t, c t, t, empty. FIG-09-10: both views use the neighbour order s:[a,b], so the reported cycle is s a c t s | Three writers caught the roster errors against the edge list and a replayed trace; the plan was wrong, the recomputation was right |
| 4 | 2026-10-22 | Delivery contract added: one SVG source per figure, two rendered variants light and dark, 1280 and 2560 px, manifest theme key, one markdown insertion line per figure | The closing gate failed at p=0.30 and named theme delivery as the gap at p=1.00: the palette has two columns and the site serves one raster per figure under a class based theme |
| 3 | 2026-10-22 | Eleventh figure added at 9.3.5. FIG-09-01 view B orients all seven edges. FIG-09-02 redrawn on the whole graph. FIG-09-03 gains a maximality witness. FIG-09-05 bars become dominant. FIG-09-06 gains the cost part. FIG-09-07 chips turn final at enqueue. FIG-09-08 uses unvisited, active, finished. FIG-09-04 and FIG-09-10 report one cycle. Panel frames drop to 1.0 | Audit findings, and the oracle rulings above |
| 5 | 2026-10-22 | FIG-09-03: INV-05 and REQ-FIG0903-14 changed from "exactly two edges cross the subset ring" to "at least two", naming all three crossings ({a,c}, {b,c} at the marked c-crossings and {a,t} leaving a). FIG-09-04: the stale translation sentence replaced with what was drawn (view A canonical, view B y +505), and A-16/A-17 verdict columns moved from x 860/930 to 858/926 | The drawing children measured the geometry: no ring enclosing s, a and b can avoid the {a,t} crossing, and the spec's +50/+530 offsets put b's rim through rail one and the back arc through b's circle. Specs now match the drawn sheets |
