# Math Proficiency Assessment — Requirements Document

**Status key used throughout:** ✅ Implemented & verified · 🟡 Implemented but not fully verified · ❓ Open question / assumption — see Section 6

**Resolved since the previous version of this document**, based on your
input: the grade range is **Kindergarten–Grade 6** (was 2–8), the
current deployment target is **localhost only** (was an open question),
a child answers **20 questions total per attempt** (was 28, then 24
before that), and every one of the 36 math concepts now has **at least
20 questions** (32 of 36 were below 20 as of the prior revision — see
FR-1a). Q1–Q3 in Section 6 are still open — this document doesn't assume
answers to those.

---

## 1. Purpose

A web application that gives a child (Kindergarten through Grade 6) a
short, adaptive-scoring math assessment to estimate their grade-level
proficiency, presented in a kid-friendly interface with support for
different learning styles and accessibility needs, with results saved
per child over time. **Currently runs on localhost only** (see NFR-4a).

---

## 2. Functional Requirements

### 2.1 Core Assessment ✅
- FR-1: The master question bank holds **753 multiple-choice questions**
  across **36 distinct math concepts (topics)**, each with exactly 4
  answer options and one correct answer. A single assessment attempt
  samples **20 questions total** from this pool — stratified as evenly
  as possible across every grade level present (3 questions each for 6
  grades, 2 for the 7th, over K-6's 7 grade levels; configurable via
  `QUESTIONS_TOTAL_PER_ATTEMPT` in `backend/main.py`) — not the full 753,
  since no child is answering 753 questions in one sitting.
- FR-1a: **Every one of the 36 concepts has at least 20 questions**,
  not just the bank in aggregate. This was a deliberate, separately-
  verified requirement: an earlier revision had 32 of 36 topics below
  20 (some as low as 3), which was fixed by (1) widening numeric ranges
  on generators with plenty of underlying combinatorial room, and (2)
  redesigning three generators that relied on small hand-written lists
  (Sorting, Positional Words, Counting/Number Recognition) to combine
  categories and scenarios combinatorially instead. Verified
  programmatically after generation: zero topics below 20.
- FR-1b: **Sampling guarantees variety, not just randomness.** Once a
  kid has identified themselves (`kid_id`), `GET /api/questions` draws
  preferentially from questions that specific kid hasn't been asked
  before (tracked via `assessment_answers`), falling back to repeats
  only once a grade's unseen pool is exhausted for them. Verified live
  against the 753-question pool: two fresh kids had **zero** overlapping
  question ids in their 20-question samples; the same kid retaking the
  assessment also got **zero** overlap with their prior attempt; a kid
  who exhausted a full grade's question pool across many attempts
  correctly fell back to repeats rather than erroring; and
  `GET /api/questions` was confirmed to return exactly 20 questions with
  the 3/3/3/3/3/3/2 grade split on every call. See
  `repository.get_sampled_questions()`.
- FR-2: Questions span **Kindergarten through Grade 6** (7 grade levels;
  Kindergarten is stored as integer grade `0`, mapped to "K" for display
  by `scoring.grade_label()` / `lib/gradeLabel.ts`) across the 36 topics
  above (Counting, Shapes, and Sorting at the K end through Ratios,
  Percentages, and Dividing Fractions at Grade 6 — see
  `backend/seed_data.py` for the full list).
- FR-3: The question bank is the **master data source in Postgres**
  (`questions` table), seeded on first startup from `backend/seed_data.py`,
  whose 753 rows were generated programmatically by
  `scripts/generate_questions.py` — every correct answer computed
  directly from the same math the question describes (not hand-typed),
  and independently spot-checked afterward by re-parsing 213 sample
  questions' text and recomputing the answer from scratch (zero
  discrepancies found). Two content-ambiguity bugs were also found and
  fixed during this process — e.g. a "which shape has 4 sides?" question
  could have both "Square" and "Rectangle" as options, which is
  genuinely unanswerable since both have 4 sides; same-side-count shapes
  (and analogous 3D-shape face-count ties) are now excluded from
  co-occurring as options. Editing questions post-seed requires either
  re-seeding an empty table or direct DB edits (no admin UI — see
  Section 5).
- FR-4: No time limit on the assessment.
- FR-5: One question is shown at a time, with Back/Next navigation; Next is
  disabled until an answer is selected for the current question.
- FR-6: Correct answers are **never exposed to the client** until after
  submission (`GET /api/questions` strips `correct_index`).

### 2.2 Scoring & Grade Estimation ✅
- FR-7: For each grade level tested, compute accuracy (% correct).
- FR-8: For each topic tested, compute accuracy (% correct).
- FR-9: Estimate a single "grade level" via a basal/ceiling rule: the
  highest grade level where the student scored **≥70%** ("mastery"), while
  also scoring **≥50%** ("foundation") at every grade level below it. This
  avoids crediting a grade level on a lucky guess while missing lower-grade
  fundamentals.
- FR-10: If no grade clears the bar, report "Below Grade X" (X = lowest
  grade tested).
- FR-11: If a student clears the mastery bar at the *highest* grade tested,
  report "Grade N+ (at or above highest level tested)".
- FR-12: `backend/scoring.py` is a pure function (no DB dependency),
  independently unit-testable.

### 2.3 Presentation formats — VARK-aligned ✅
- FR-13: **Text** — always shown (question + 4 options).
- FR-14: **Visual** — an SVG diagram per question, toggleable. **16 diagram
  types** implemented (number line, base-10 blocks, place value, array
  grid, grouped items, area model, fraction bars, decimal-area overlap,
  percent grid, ratio blocks, tape diagram, algebra tiles, expression
  highlighting, exponent tower, triangle-squares/Pythagorean proof, a
  labeled shape row for shape-identification questions, and side-by-side
  comparison groups for K/Grade-1 "which is more" questions).
  Diagrams illustrate the numbers/operation in a question but never
  print the literal correct answer.
- FR-15: **Auditory** — read-aloud for the question, its 4 options, and
  character comments, via the browser's native Web Speech API
  (`window.speechSynthesis`). No server-side TTS, no audio files.
- FR-16: **Reading/Writing** — an optional, ephemeral notes scratchpad per
  question. Not graded, not persisted to the database.
- FR-17: **Kinesthetic** — an optional "hands-on" mode making 4 of the 16
  diagram types (array grid, grouped items, base-10 blocks, percent grid)
  tap-to-count interactive, with a live running count.
- FR-18: All four format toggles are independent (any combination), set on
  the intro screen, changeable mid-quiz, and persisted in the browser
  (`localStorage`).

### 2.4 Study-buddy character ✅
- FR-19: **6 original mascot characters** (not tied to existing media, to
  avoid IP/copyright issues): Terra the Dinosaur, Nova the Astronaut,
  Marble the Unicorn, Ziggy the Robot, Captain Compass, Fern the Fox.
- FR-20: Character selection is optional; if chosen, the character shows a
  greeting, milestone encouragement (start / 25% / 50% / 75% / last
  question), and a topic-flavored remark on questions in between.
- FR-21: Character comments **never reveal whether an answer was right or
  wrong** — encouragement/flavor only, to keep the assessment meaningful.
- FR-22: The character delivers one final, score-tier-appropriate comment
  on the results screen.
- FR-23: The chosen `character_id` is stored with the attempt in Postgres.

### 2.5 Accessibility (special needs) ✅
- FR-24: **Large text** — scales key font sizes ~1.25x.
- FR-25: **High contrast** — near-black-on-white palette, heavier borders.
- FR-26: **Calm mode** — disables all animation/transition effects
  app-wide, independent of (and in addition to) the OS-level
  `prefers-reduced-motion` setting, which is also always respected.
- FR-27: **Dyslexia-friendly spacing** — wider letter/word/line spacing.
- FR-28: **Big buttons** — enlarges answer buttons, nav buttons, the
  speaker button, and tappable pieces inside interactive diagrams.
- FR-29: **Keyboard navigation** — number/letter keys (1–4, A–D) select an
  answer, Enter/→ advances, ← goes back; suppressed while typing in a text
  field so it doesn't interfere with notes/name entry.
- FR-30: **Screen reader semantics** — answer choices use
  `role="radiogroup"`/`role="radio"`/`aria-checked`; progress uses
  `role="progressbar"` with `aria-live="polite"`; icon-only buttons carry
  `aria-label`.
- FR-31: All 5 accessibility toggles are independent, changeable mid-quiz,
  and persisted in `localStorage`.

### 2.6 Per-kid identity & persistence ✅
- FR-32: A kid identifies themselves by **name only** — no password, no
  account creation flow beyond typing a name (see ❓ Q2 in Section 6).
- FR-33: `POST /api/kids` gets-or-creates a profile by name
  (case-insensitive match).
- FR-34: If a name has prior completed attempts, the app shows a
  "Welcome back" message with the most recent attempt's summary.
- FR-35: Every completed assessment is saved: one `assessment_attempts` row
  (grade estimate, score, character used, timestamps) plus one
  `assessment_answers` row per question answered (question id, the
  student's chosen option, whether it was correct).
- FR-36: `GET /api/kids/{id}/history` returns all of a kid's past
  completed attempts, most recent first.

### 2.7 Results screen ✅
- FR-37: Shows the estimated grade level, overall score, and a
  celebratory/encouraging message scaled to performance (never
  discouraging language at any score tier).
- FR-38: Grade-level accuracy breakdown (bar per grade tested).
- FR-39: Topic-strength radar chart (accuracy per topic).
- FR-40: Question-by-question review: every question, the student's
  answer, and (only here, post-submission) the correct answer.
- FR-41: "Take it again" restarts the assessment for the same kid.

### 2.8 Content safety ✅
- FR-42: All question text, answer choices, and character dialogue are
  **static and hand-authored** — no LLM or other generative call produces
  any of it at runtime, eliminating a whole class of unpredictable-output
  risk.
- FR-43: `scripts/content_safety_check.py` — a standalone, dependency-free
  script scanning all question/character/UI-copy source files for a
  blocklist of profanity, violent/abusive language, and discouraging
  phrasing. Exits non-zero and prints file/line on any match.

### 2.9 Visual design 🟡
- FR-44: The interface is designed to be visually engaging for children —
  currently themed as **"Comic Pop"** (bold ink outlines, halftone
  texture, hard drop shadows, red/blue/yellow palette), the third of three
  design directions presented for selection. **This redesign pass was
  applied across all components but the final typecheck/build/end-to-end
  verification pass was not completed before this document was written —
  see Section 5.**
- FR-45: Design informed by an external kids'-UX reference
  (portotheme.com's "Designing for Kids" article, reviewed on request):
  age-band the experience since 3–5 vs. 9–12 have very different needs
  (our VARK + accessibility toggles let each age self-select — a K
  student can lean on audio+visual, a 6th grader can rely on text alone);
  minimum 44×44px touch targets; flat, always-visible navigation (one
  question at a time, no nested menus); audio/visual feedback on
  interaction. On the 44px target check specifically: I audited actual
  pixel sizes rather than assuming compliance, and found the read-aloud
  buttons were under-sized (38px on the question card, 32px on the
  character bubble) — both are now fixed to 44px. The compact
  settings-bar toggle chips and the notes-pad collapse button remain
  smaller by design, as secondary/optional controls rather than
  core-task actions; flag if you'd like those enlarged too. Not yet
  applied: sound effects on tap (currently silent) and end-of-task
  reward animations beyond the character's text comments.

---

## 3. Non-Functional Requirements

### 3.1 Technology stack ✅
- NFR-1: Backend: Python, FastAPI, SQLAlchemy ORM, Postgres.
- NFR-2: Frontend: TypeScript, Next.js (pages router), React.
- NFR-3: No external paid APIs required for any feature (TTS is
  browser-native; no image/LLM generation at runtime).

### 3.2 Hosting ✅ (resolved)
- NFR-4a: **Localhost only, for now.** Frontend, backend, and database
  all run on the local machine (`npm run dev`, `uvicorn`, and
  `docker-compose` respectively — see `README.md` → "Running it
  locally"). No cloud deployment is in scope at this time.

### 3.3 Database & scale (forward-looking, not current) 🟡
- NFR-4: The schema was pre-optimized for an eventual free-tier hosted
  Postgres deployment (Neon recommended — see `README.md` → "Choosing a
  free production database") supporting **up to 50,000 registered
  users**, in case this moves beyond localhost later. This is design
  headroom, not a current operating requirement given NFR-4a.
- NFR-5: Two write-only, fully-derivable JSONB columns were removed from
  `assessment_attempts` after storage projections showed the original
  schema would exceed a 500 MB free-tier cap at 50k users. Post-
  optimization projection: ~300 MB at 50k users × 3 attempts each (~40%
  headroom). This projection is arithmetic, not a load test (see ❓ Q3).
- NFR-6: `pool_pre_ping=True` on the DB engine to handle serverless
  Postgres providers that suspend compute after idle periods (relevant
  if/when deployed to Neon; harmless locally).

### 3.4 Accessibility & inclusivity ✅
- NFR-7: WCAG-oriented contrast targets in high-contrast mode.
- NFR-8: Full keyboard operability for the core assessment flow.
- NFR-9: No feature relies on color alone to convey meaning (correct/
  incorrect also use icons + text, not just color).

### 3.5 Privacy & compliance ❓
- NFR-10: The app collects a child's first name (or whatever name is
  typed) and their assessment performance data, with **no
  authentication**, **no explicit parental-consent flow**, and **no
  stated data-retention or deletion policy**. **This has not been
  evaluated against COPPA or any other children's-privacy regulation —
  see ❓ Q1, the most consequential open item in this document.** Running
  on localhost only (NFR-4a) meaningfully lowers the immediate stakes
  here versus a public deployment, but doesn't eliminate the question if
  this data ever leaves the machine it runs on (e.g., a shared family
  computer).

### 3.6 Content safety ✅
- NFR-11: See FR-42/FR-43. Re-run `content_safety_check.py` whenever new
  question or character content is added.

---

## 4. Technical Architecture Summary

```
Frontend (Next.js/TS)  →  /api/* proxy  →  Backend (FastAPI)  →  Postgres
                                                                  (kids, questions,
                                                                   assessment_attempts,
                                                                   assessment_answers)
```
- `backend/seed_data.py` — question bank source (seeds DB on first run)
- `backend/scoring.py` — pure scoring function, DB-agnostic
- `backend/models.py` / `repository.py` — ORM schema & all queries
- `frontend/lib/characters.ts` — character dialogue data
- `frontend/components/VisualAid.tsx` — all 16 diagram renderers
- `scripts/content_safety_check.py` — content audit tool
- `docker-compose.yml` — local dev Postgres

---

## 5. Explicitly Out of Scope / Not Yet Built

These have come up as natural extensions during development but are
**not implemented**. Flagging them so "requirements" doesn't silently grow
to include things that were only ever mentioned as future ideas:

- No authentication/account system beyond name entry (see ❓ Q2).
- No admin/teacher/parent dashboard (viewing one kid's history via the
  API is possible; there's no UI for it, and no way to browse *all* kids).
- No data export, deletion, or retention-policy tooling.
- No automated test suite (unit/integration tests) or CI pipeline — all
  verification so far has been manual, run-it-and-check-the-output style
  against a live local Postgres instance.
- No monitoring/error-tracking/logging setup for production.
- No internationalization — English only.
- ~~No hosting decision made~~ **Resolved: localhost only, for now (NFR-4a).**
  The Neon/free-tier guidance in the README remains as forward-looking
  documentation for if/when that changes, not a current requirement.
- The Comic Pop visual redesign (FR-44) has not had its final
  verification pass (typecheck + build + live e2e check) completed.

---

## 6. Open Questions — please weigh in

### ❓ Q1 — Children's data privacy (most important)
The app collects a name and stores assessment results tied to it, with no
consent flow, no auth, and no stated retention/deletion policy. Whether
that's acceptable depends entirely on how this is meant to be used:
- **Private, single-family/classroom tool** (a parent or teacher sets it
  up for known kids, they control who has the link) → current design is
  probably fine as-is.
- **Public-facing product** anyone can sign up for → likely needs real
  privacy work: a parental-consent mechanism, a privacy policy, a data
  retention/deletion policy, and (in the US) COPPA review specifically,
  since it's squarely "directed at children under 13."

### ❓ Q2 — Authentication model
Right now "logging in" is typing a name — anyone who knows (or guesses) a
kid's name can see their "welcome back" summary and add attempts under
their profile. Is that an acceptable tradeoff for simplicity, or does a
real production version need actual accounts (e.g., a parent account that
owns one or more kid profiles)?

### ❓ Q3 — What "50,000 users" means for capacity planning
I designed the database around **50,000 total registered kids, each
taking the assessment a handful of times** (assumed ~3 attempts/user for
the storage projection) — not 50,000 people using the app *at the same
moment*. Concurrency and total registered users have very different
implications (concurrent connections, request throughput) that I haven't
sized separately. Given the app is localhost-only for now (NFR-4a), this
is lower-urgency than it would be for a live deployment — but the
schema optimization work stays valuable regardless of when/whether you
deploy. Is total-users-over-time still the right framing for whenever
that day comes, or do you already know you'll need this to hold up under
meaningful concurrent load?

I'll use your answers to Q1–Q3 to update this document and, if needed,
the implementation.
