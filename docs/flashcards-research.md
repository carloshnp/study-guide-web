# Research synthesis: Flashcards for Estudos

Collected 2026-10-22 by three parallel research agents (science, Reddit, apps).
This is the evidence behind `docs/spec-flashcards.md`. Only verified sources are
listed; anything unverifiable was excluded.

## 1. Scientific evidence (2020+, prioritized 2022+)

### Spacing (agendamento)

- **Spaced retrieval beats massed learning**: meta-analysis of 11 studies
  (39 comparisons), g = 1.01 (95% CI 0.68–1.34), with **publication bias detected**
  — read as an optimistic ceiling, not the expected effect. Qualitative conclusion
  (spacing > massing) is consistent with the prior literature.
  Latimier, Peyre & Ramus (2021). *A Meta-Analytic Review of the Benefit of Spacing
  out Retrieval Practice Episodes on Retention*. doi:10.1007/s10648-020-09572-8
- **Expanding vs uniform intervals**: null advantage for expanding (g = 0.034,
  95% CI −0.10 to 0.17 over 16 studies/54 comparisons). A modest non-significant
  edge appeared only with >4 exposures per item (g = 0.2). Implication: a simple
  fixed multiplier per card (1.8–2.5×) captures most of the benefit; a sophisticated
  expanding ladder is not a prerequisite. (Same source.)
- **FSRS model**: memory states (difficulty, stability, retrievability) fed by
  review logs, plus a stochastic shortest-path interval choice; reported −64%
  prediction error and −17% scheduling cost vs baselines on a public 220M-row
  dataset. Su et al. (2023). *Optimizing Spaced Repetition Schedule by Capturing
  the Dynamics of Memory*. doi:10.1109/TKDE.2023.3251721
- **Desired retention**: Anki's FSRS docs define it as the probability of recall
  at the card's due time; default 90%; >90% grows load fast, >97% unsustainable.
  This is a product-engineering trade-off, not an empirical optimum.
  *Anki Manual — Deck Options: FSRS*. docs.ankiweb.net/deck-options.html
- **Caution on scheduler evaluation**: accuracy alone is insufficient because
  training data were produced by older schedulers; validation should be
  counterfactual simulation. 2026 preprint, *Interpretable Memory Models for
  Spaced Repetition*, arxiv.org/abs/2610.10548 (baixa confiança, preprint).

### Retrieval practice

- **Testing boosts classroom learning**: largest classroom meta-analysis — 222
  independent studies, 48,478 students, g = 0.499. Moderators: control condition,
  format match between practice and assessment, content overlap, **corrective
  feedback**, number of test repetitions, timing. Adesope et al. (2021).
  *Testing (quizzing) boosts classroom learning: A systematic and meta-analytic
  review*. doi:10.1037/bul0000309
- **Spacing + retrieval as top strategies**: narrative review positions both among
  the most empirically supported learning strategies; gains depend on
  implementation (intervals, retrieval effort, feedback) and do not always
  transfer to new material. Carpenter, Pan & Butler (2022). *The science of
  effective learning with spacing and retrieval practice*.
  doi:10.1038/s44159-022-00089-1
- **Open vs closed format**: within-subject RCT (n=45, no feedback) — very-short-
  answer vs multiple-choice; more errors in practice with VSAQ but no main effect
  or interaction on final test. No evidence of open-format superiority.
  van Wijk et al. (2024). doi:10.1186/s12909-024-06538-0
- **Pretesting**: testing before instruction (with feedback) improves memory and
  transfer despite early errors. 2023 review, *Prequestioning and Pretesting
  Effects…*. doi:10.1007/s10648-023-09814-5

### Flashcard design

- **User-generated beats premade cards**: six experiments, criterion test after
  48 h; own cards > premade (d = 0.45 memory, d = 0.29 application), in five of
  six experiments and against both high- and low-quality premade decks. The
  benefit was largest when content was actively paraphrased/pasted by the user,
  not merely selected. Pan et al. (2022). *User-Generated Digital Flashcards Yield
  Better Learning Than Premade Flashcards*. doi:10.1037/mac0000083
- **Usage patterns (not efficacy)**: 94% of a first-year med cohort used Anki,
  97.6% relied on premade cards, 78% preferred cloze; 87.8% believed it helped.
  Tensions with Pan et al. — preference ≠ efficacy. Nour & Harris (2025).
  *Utilization Patterns and Perceptions…*. doi:10.7759/cureus.95674
- **Images on cards**: indirect evidence only (8-year-olds, L2 vocabulary,
  non-digital): enrichment with pictures/gestures improved recall and translation,
  still detectable at 6 months. Don't promise gains for abstract engineering
  content. 2020 study, doi:10.1007/s10648-020-09527-z
- **Deck for a course**: pharmacology resource build (1,208 cards, 156 classes)
  measured acceptability (3.8/5), not retention. 2022, doi:10.1186/s12909-022-03324-8

### Adjacent techniques

- **Interleaving**: systematic review + meta-analysis of 17 studies: memory gains
  up to g = 0.65, transfer to new items up to g = 0.66, including delayed tests;
  largest when item differences are subtle. Brunmair & Richter (2021).
  *A systematic review of interleaving as a concept learning strategy*.
  doi:10.1002/rev3.3266
- **Feedback timing**: pre-registered meta-analysis of 51 studies in
  computer-assisted learning — immediate vs delayed feedback: g = 0.03 (95% CI
  −0.08 to 0.13, p = 0.61). Immediate feedback is sufficient. 2026,
  doi:10.1007/s10648-026-10117-8
- **Desirable difficulties**: conditions that degrade practice performance
  (spacing, interleaving, hard retrieval, variation) often improve long-term
  retention and transfer; fluency during study is a poor proxy for learning.
  Bjork & Bjork (2020). *Desirable difficulties in theory and practice*.
  doi:10.1016/j.jarmac.2020.09.003
- **Gamification**: meta-analysis — small-to-moderate cognitive effect
  (g = 0.49), smaller on motivation (0.36) and behavior (0.25); motivational and
  behavioral effects less stable in higher-rigor studies; no isolated test of
  streaks. Sailer et al. (2020). doi:10.1007/s10648-019-09498-w

### Technology and apps (efficacy)

- **Spaced repetition in med education**: meta-analysis of 13 studies, 21,415
  learners, SMD = 0.78 (95% CI 0.56–0.99); heterogeneous interventions; the active
  ingredient is spacing, not the app. 2026, *The Effectiveness of Spaced
  Repetition in Medical Education*. doi:10.1111/tct.70353
- **Anki and performance**: systematic review of 11 studies — consistent positive
  association with USMLE Step 1 (frequent users 4–13 points above minimums; one
  dose-response by total cards reviewed), mixed for course exams, null for Step 2
  CK; all observational. 2026, *Anki Use and Academic Performance in Medical
  Education: A Systematic Review of Evidence and Learning Theory*.
  doi:10.1007/s40670-026-02643-5
- **Null/mixed cohort**: 53 graduate-entry med students, 80% used Anki; no
  significant benefit overall; benefits only in extensive vs inconsistent use and
  in physiology performance. 2025, doi:10.1007/s40670-025-02504-7
- **Mobile app RCT**: dental students, spaced repetition via app after lecture >
  lecture only at month 1 and 3 (p ≤ 0.001); single center, app added on top of
  lecture. 2024, doi:10.1002/jdd.13561

### Habits and adherence

- High-frequency, low-attention use is common (56.6% report using Anki during other
  activities) — favors short sessions but demands active recall (answer required
  before reveal). Nour & Harris (2025), above.
- Associations are about **consistency/volume**, not gamification mechanisms;
  streak/heatmap have no direct evidence; if used, prefer active days + freeze,
  no punishment. Sailer et al. (2020); Anki reviews above.

### Critiques and limits

- Publication bias inflates the headline spacing effects; lab effects shrink in
  classrooms. (Latimier 2021; standard in the field.)
- Anki evidence: severe methodological heterogeneity, observational designs, no
  large-scale RCT; cannot isolate the app from motivation/study time/deck quality.
- The literature answers "spacing works", not "how to schedule"; fine interval
  decisions must come from a model + the user's own data.
- Overlearning/fluency create illusion of competence (Bjork & Bjork 2020); no
  2020+ meta-analysis of overlearning located.

### Gaps (explicit, so we do not overclaim)

- No RCT on atomic vs compound cards (minimum-information is a community heuristic).
- No experimental comparison cloze vs Q-A retention (only 78% preference).
- Image evidence is indirect (children, L2, concrete vocabulary).
- No 2020+ overlearning meta-analysis (classic: Driskell et al. 1992).
- No direct streak/gamification evidence in study apps.
- No human-outcome comparison of schedulers (FSRS vs SM-2 vs Leitner).
- No research on optimal retention by content type (0.90 is a documented product
  default, not an experimental optimum).
- No RCT on LLM-generated cards; Pan et al. suggests outsourcing generation may
  remove the benefit of generating (untested hypothesis).
- Anki studies are near-all medicine; nothing specific to Brazilian engineering
  undergraduates.

## 2. Reddit community consensus (r/Anki, r/medicalschoolanki, r/GetStudying)

Techniques with strong consensus:

- **FSRS over SM-2**: activate, Optimize, done; same retention with fewer reviews;
  SM-2 defenders argue transparency, not performance. Caution: initial backlog on
  "reschedule cards on change".
- **Desired retention ~90%**: the default and the starting point; 95% strongly
  discouraged (load grows near-logarithmically above ~80%).
- **Atomic cards / minimum information**: one fact per card, short answer; nuance:
  atomic ≠ fragmented (systems that only make sense together stay together; long
  lists → cloze).
- **Don't hoard**: convert lectures into cards the same day, accept "rough" cards;
  catch-up pattern "one current lecture + one old block per day".
- **Buttons**: basically Again and Good; Hard is not a failure; Easy rare. (With
  FSRS ease pressure disappears, but the advice persists.)
- **Daily limits**: start 5–10 new/day; expect ~7 reviews per new card at
  maturity; 20–30 new/day is a lot; lower the goal in bad weeks, don't abandon.
- **Habit**: anchor to a fixed time/place; a ridiculously low floor ("today's
  goal is one card"); review limits to avoid backlog overwhelm; heatmap/streak as
  motivator with the caveat that gamification can become anxiety.

Divergent areas:

- **Retention when volume is high**: productivity wing defends 85% (≈ −30%
  reviews, −22% time for ~3% fewer memorized cards) vs the "don't ration, cut new
  cards" wing.
- **Learning steps**: "leave blank, FSRS decides" vs "FSRS doesn't model
  short-term memory, keep a 5–20 min step"; 30 s steps mocked as too short.
- **Cloze vs basic**: cloze for fast authoring/lists/literal definitions vs basic
  for causal relations/reasoning ("cloze can be a crutch — you memorize the
  pattern, not the concept").
- **Image occlusion**: great for intrinsically visual content (anatomy, maps,
  schemas); bad as a text substitute (you memorize mask positions).
- **When to make cards**: during lecture (efficiency) vs after (comprehension
  first); synthesis: capture questions right after, polish in a short block.
- **Leeches**: agreement it's a card-design symptom; disagreement on action —
  reformulate/split/add mnemonic vs ignore; resetting history (Forget) is broadly
  discouraged.
- **Filtered decks/cramming**: standard for exams ("is:due -rated:7", "prop:rated")
  but don't rebuild the same filter daily — move to a real deck instead; "SRS is
  bad for cramming" vs "30–40 days is not cramming".
- **Organization**: official advice favors tags over deep deck trees; practice is
  hybrid (one deck per subject, tags per chapter, always review from the parent).

Armadilhas (pitfalls) most cited: card everything, 100 new/day + 95% retention
(burnout), not pressing Again to "close the day", Hard-as-error (ease hell),
list-cards with 5+ items, deck hoarding, ignoring leeches, thinking 95% is free,
blank learning steps, switching premade decks midway, making cards during lecture
and losing comprehension, using only flashcards for reasoning-heavy subjects.

Most valued software features: native FSRS with Optimize + presets; load/retention
graphs (CMRR alternative); FSRS Helper (load balance, step suggestions); heatmap/
streak as habit motor; filtered decks + search syntax; native image occlusion (for
visual content); multi-cloze + "one by one" cards; shared decks with resource tags
(AnKing workflow); zero-friction add-ons; Pass/Fail 2; true-retention and answer-
button stats; leech toolkit.

## 3. App feature analysis (for university use)

Verified against official docs: docs.ankiweb.net, help.quizlet.com,
help.remnote.com, mochi.cards/docs, knowledge.wanikani.com, duolingo.com/help,
memrise.zendesk.com, brainscape.zendesk.com.

| Feature | Apps | Value for college | Build cost (React+FastAPI+SQLite) |
|:---|:---|:---|:---|
| SRS 4 buttons (Again/Hard/Good/Easy), SM-2 | Anki | known standard; heterogeneous material | baixo (~50 loc) |
| FSRS + desired retention + optimize | Anki | same retention, fewer reviews; load simulation | alto (revlog + state model) |
| Cloze deletion `{{cN::…}}` | Anki, RemNote, Mochi | definitions/formulas already in guides; fastest authoring | baixo (parser + component) |
| Image occlusion | Anki, RemNote | anatomy/maps/circuits; figures already exist | médio (canvas masks) |
| Note types & multi-card generation | Anki, RemNote | one concept → bidirectional cards | médio (notes+cards schema) |
| Filtered decks / cramming | Anki | exam eve: only chapter X, no reschedule | médio (query + ephemeral session) |
| Import .apkg / CSV | Anki, Quizlet, Mochi | migration without retyping | alto (.apkg schema); CSV médio |
| Sync across devices | Anki, Quizlet, Mochi, RemNote | commute studying | alto; PWA queue is the shortcut |
| Add-on ecosystem | Anki | low for the student; embed the top 3–4 instead | alto (sandbox) — deprioritize |
| Stats: heatmap, forecast, true retention | Anki, AnkiDroid | load forecast prevents abandonment | médio (SQL aggregates + forecast) |
| Leech detection (8 lapses → suspend) | Anki | flags bad cards, saves hours | baixo |
| Adaptive Learn (Quizlet). MCQ/written ladder | Quizlet | recognition → production ladder | médio (distractors from deck) |
| Test / Match | Quizlet | mock exam; warm-up game | médio |
| Confidence-based 1–5 | Brainscape | granular self-assessment | baixo (SM-2 simplified) |
| PDF/slides highlight → card | RemNote | real study flow (slide → card) | alto (pdf.js + coordinates); the guide-text shortcut is the viable path |
| Backlinks between cards | RemNote, Mochi | concept network in cumulative courses | médio (links table + render) |
| Markdown cards + keyboard-first | Mochi | zero friction for a markdown user | baixo |
| Staged SRS with unlocks | WaniKani | prerequisites: don't study X before Y | médio (graph gating) |
| Gamified review queue + feedback | WaniKani | short finite sessions; visible progress | baixo (UI over scheduler) |
| Streak with freeze/repair | Duolingo, Memrise | engagement is the bottleneck; freeze avoids punishment | baixo |
| Offline mobile | AnkiDroid/AnkiMobile | commute slots | alto; PWA cache + offline queue |
| LaTeX & figures in cards | Anki, RemNote, Mochi | exatas without LaTeX is a no-go; KaTeX already exists | baixo (reuse reader) |
| TTS / audio | Quizlet, Anki, Memrise | languages; secondary for engineering | médio (cloud TTS cost) |
| Daily limits (new/reviews) | Anki | the brake that prevents abandonment | baixo |

UI patterns worth copying: two-stage card (prompt → reveal; never front/back
together); rating buttons showing the next interval ("Again 10m", "Good 4d");
keyboard as the primary path (1–4, Space, E, T); optional 2-button mode; separate
new/learning/review counters with one Study button; post-answer feedback with
correct answer + new interval; session progress bar and end summary; split view
editor ↔ source guide; finite sessions ("15 reviews") rather than "review all";
instant transitions (latency is the enemy); dark mode + large type.

Scheduler patterns: SM-2 ease 2.5 (min 1.3); FSRS per-card D/S/R with stability =
time for recall to drop 100→90%; desired retention 90% default; optimize monthly
(not per review); learning steps short, same-day; relearn steps + new interval %;
fuzz to desync cards; leech at 8 lapses; backlog queue by relative overdueness
(retrievability, not just days); **revlog always** (card_id, timestamp, rating,
old/new interval, duration) — without it there is no FSRS, true retention, or
forecast.

Import/export: .apkg (zip with SQLite), .colpkg, TSV/CSV UTF-8 with field
mapping, embedded HTML, `[sound:file.mp3]`, cloze as textual syntax (exportable),
Quizlet diagram sets, Mochi/RemNote markdown+links. Recommendation for this
project: markdown + frontmatter export (id, tags, scheduler state JSON) is more
durable than .apkg and reuses the guides; CSV import covers migration.

Methodological note: current prices of AnkiMobile/Quizlet Plus and free-plan
limits were not verified; Quizlet Learn's internal algorithm is not public.

## Source verification note

All DOIs/URLs above were verified reachable by the research agents (web_extract or
search hits) during collection. Anything that could not be verified was excluded
(e.g. pricing, private algorithms, suggested thread URLs that 404'd).
