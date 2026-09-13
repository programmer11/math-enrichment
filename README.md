# Math Proficiency Assessment

A short, adaptive-scoring assessment that estimates a student's
grade-level math proficiency, spanning **Kindergarten through Grade 6**
(counting and shapes through arithmetic, fractions, decimals, ratios,
and percentages) — with a kid-friendly interface, optional **visual
diagrams** and **audio read-aloud** for every question, and **per-kid
results saved to Postgres**.

A master pool of **753 questions across 36 distinct math concepts**
(every concept has **at least 20 questions**) lives in Postgres; each
individual assessment attempt draws a **stratified sample of 20
questions total** — spread as evenly as possible across all 7 grade
levels (3 questions each for 6 grades, 2 for the 7th) — so no two
attempts, by the same kid or different kids, need to look alike. See
"Question sampling" below.

> **Current deployment target: localhost only.** This app runs entirely
> on your own machine for now — the frontend, backend, and database all
> run locally (see "Running it locally" below). The "Choosing a free
> production database" section further down documents a path to a real
> deployment later, but that's forward-looking guidance, not a current
> requirement.

- **Backend:** Python + FastAPI — the question bank, correct answers,
  visual-aid metadata, and grading/scoring logic all live in Postgres.
- **Frontend:** TypeScript + Next.js (React) — takes the student through
  the quiz one question at a time and displays a detailed results report.
- **Database:** Postgres — the master question bank AND every kid's
  assessment history are stored here (see "Database & per-kid
  persistence" below).

## Database & per-kid persistence

Two things live in Postgres now, not in a Python file:

1. **The master question bank.** `backend/seed_data.py` still defines
   the 753 questions in code (generated programmatically -- see
   `scripts/generate_questions.py` -- with every correct answer verified
   by re-computation, not just trusted, and every one of the 36 math
   concepts guaranteed at least 20 questions deep), but it's only used
   to *seed* the `questions` table on first startup (if the table is
   empty). At runtime, both `GET /api/questions` and the scoring logic
   read from Postgres, not from the Python file.
2. **Every kid's assessment attempts.** There's a lightweight per-kid
   profile (name-based, no password — see below) and each completed
   assessment is saved under that kid: the overall result plus every
   individual answer, so a parent/teacher could later query "show me
   every question Alex got wrong across all attempts."

### Schema

| Table                 | What it stores |
|------------------------|----------------|
| `kids`                  | `id`, `name` (unique), `created_at` |
| `questions`             | `id`, `grade`, `topic`, `question`, `options` (JSONB), `correct_index`, `visual` (JSONB) |
| `assessment_attempts`   | one row per completed assessment: `kid_id`, `character_id`, `estimated_grade_level`, `overall_score`, `total_correct`/`total_questions` |
| `assessment_answers`    | one row per question answered within an attempt: `attempt_id`, `question_id`, `student_answer_index`, `is_correct` |

Per-grade/per-topic accuracy breakdowns are **not** stored — they're
fully derivable from `assessment_answers` joined with `questions`, so
storing them per attempt would just be duplicated data that grows
without bound (see "Choosing a free production database" below for why
this matters in practice, not just in principle). Every individual
answer is fully normalized in `assessment_answers`, so nothing is lost:
`repository.compute_attempt_breakdown()` reconstructs the same breakdown
on demand. See `backend/models.py` for the full SQLAlchemy schema (with
more detail in the module docstring) and `backend/repository.py` for all
the queries.

### Per-kid identity — no password, by design

There's no login/auth system. A kid types their name on the intro
screen; the app calls `POST /api/kids` which gets-or-creates a profile by
name (case-insensitive), and every subsequent submission is tied to that
`kid_id`. If the same name is entered again later, the app shows a
"Welcome back" note with their last result. This is a lightweight profile
for a family/classroom app, not a secured multi-tenant account system —
if you need real auth (e.g. multiple families sharing one deployment,
or a parent dashboard), that's the natural next thing to add on top of
this (see "Extending it").

## Question sampling — distinct questions per user

The question bank holds **753 questions across 36 math concepts, each
with at least 20 questions** (see "Question depth per concept" below for
why that specific floor matters), but **a child only answers 20
questions in a single sitting** — nobody's answering 753 questions at
once. Which 20 you get is **not** just uniformly random each time; it's
built to guarantee real variety:

- The 20 questions are a **stratified sample across every grade level**
  present in the bank — split as evenly as possible (20 over 7 grade
  levels K-6 = 3 questions each for 6 grades, 2 for the 7th) — rather
  than, say, 20 questions that happen to cluster in one or two grades.
  This matters because the basal/ceiling grade-estimation algorithm (see
  "How scoring works") needs signal across multiple grade levels to work
  at all.
- `GET /api/questions?kid_id=<id>` draws its sample **preferentially
  from questions that specific kid hasn't been asked before** (across
  every past attempt, tracked via the fully-normalized
  `assessment_answers` table). Only once a kid has exhausted a grade's
  unseen pool does it fall back to repeats for that grade, so a retake
  cycles through fresh material for a long time before anything repeats.
- Because each kid's exclusion set is independent, two different kids
  starting fresh draw independently-randomized samples from the same
  753-question pool — in practice they end up looking quite different
  from each other, though (being independent random draws) a handful of
  IDs coinciding by chance is possible and not something we specifically
  prevent.
- Without a `kid_id` (e.g. a page load before a name has been entered),
  `GET /api/questions` is a plain random sample with no exclusions --
  used only for the initial "X questions" count shown before a name is
  typed. `pages/index.tsx`'s `startQuiz()` re-fetches with the resolved
  `kid_id` right before entering the quiz, so the sample the student
  actually answers is always the kid-aware one.
- Scoring is completely unaffected by any of this: `score_assessment()`
  only computes grade/topic breakdowns over whichever question ids
  actually appear in the submitted answers, so a 20-question sampled
  attempt scores exactly like a fixed 20-question test would.
- See `repository.get_sampled_questions()` / `get_seen_question_ids()`
  for the implementation, and `main.py`'s `QUESTIONS_TOTAL_PER_ATTEMPT`
  constant to change the sample size.

This was verified directly against a live database: `GET /api/questions`
returns exactly 20 questions with the 3/3/3/3/3/3/2 grade split on every
call; two fresh kids drawn from the pool had **zero** overlapping
question ids; the same kid retaking the assessment also got **zero**
overlap with their first attempt; a kid who exhausted an entire grade's
question pool across many attempts correctly fell back to repeats rather
than erroring; and a scored 20-question attempt with alternating
right/wrong answers came back with exactly 50% overall and a matching
per-grade breakdown (3,3,3,3,3,3,2 questions per grade, as expected).

### Question depth per concept

Every one of the 36 topics (concepts) in the bank -- from Counting and
Shapes at the Kindergarten end to Ratios, Percentages, and Dividing
Fractions at Grade 6 -- has **at least 20 questions**, not just the bank
overall. This was a deliberate content requirement, not a byproduct of
scaling up: an earlier version of the bank had 32 of its 36 topics below
20 (some as low as 3), which meant a kid who kept getting sampled into a
thin topic would run out of fresh material almost immediately. Getting
every topic to 20 required two things beyond just generating more
questions:

- **Fixing two real ambiguity bugs** the depth push surfaced: an early
  "which shape has 4 sides?" question could have both "Square" and
  "Rectangle" as answer options, which is genuinely unanswerable since
  both shapes have 4 sides. The same issue existed between "Cube" and
  "Rectangular Prism" (both "6 flat faces"). Both are fixed now --
  same-side-count shapes are excluded from co-occurring as options, and
  the 3D shape hints were rewritten to be mutually exclusive.
- **Redesigning three generators that relied on small, hand-written
  lists** (Sorting, Positional Words, and the Kindergarten
  counting/number questions) to instead combine categories and
  scenarios combinatorially, so they could produce 20+ genuinely
  distinct questions instead of cycling through a handful of near-
  duplicates.

## Running it locally

### Quickstart (one command)

If you have Docker, Python 3.10+, and Node.js 18+ installed:

```bash
./start.sh
```

This starts Postgres (via `docker compose`), sets up a Python virtualenv
and installs backend dependencies (first run only), installs frontend
dependencies (first run only), then starts both the backend
(`http://localhost:8000`) and frontend (`http://localhost:3000`)
together. Open `http://localhost:3000` once you see "Ready!" in the
terminal. Press Ctrl+C to stop both servers (Postgres keeps running in
the background — `docker compose down` to stop that too). Tested end to
end: ~25 seconds on a first run (installing dependencies), ~5 seconds on
every run after that.

No Docker? See the manual steps below instead — `start.sh` only
automates them, it doesn't do anything you can't do by hand.

### 1. Start Postgres

Easiest: with Docker installed, from the repo root:

```bash
docker compose up -d
```

This starts Postgres 16 on `localhost:5432` with a database named
`math_assessment`, user `app_user`, password `app_password` — matching
the default `DATABASE_URL` the backend falls back to if you don't set
one. (See `docker-compose.yml`.)

No Docker? Install Postgres locally and create a matching database/user:

```sql
CREATE USER app_user WITH PASSWORD 'app_password';
CREATE DATABASE math_assessment OWNER app_user;
```

Either way, you can point the app at a totally different database by
setting `DATABASE_URL` (see step 2) — the defaults above are just for a
zero-config local start.

### 2. Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # edit DATABASE_URL here if not using the defaults above
export $(cat .env | xargs)       # or use a tool like python-dotenv / direnv
uvicorn main:app --reload --port 8000
```

On first startup the app automatically creates all tables and seeds the
753 questions from `seed_data.py` (both are no-ops on every startup after
the first). You can also run this step standalone without booting the
API — handy for deploy hooks or CI:

```bash
python3 scripts/seed_db.py
```

The API is now at `http://localhost:8000`. Check `http://localhost:8000/api/health`.

### 3. Frontend (Next.js)

In a second terminal:

```bash
cd frontend
npm install
cp .env.local.example .env.local   # points the frontend at the backend
npm run dev
```

Open `http://localhost:3000`.

> Next.js's `rewrites()` in `next.config.js` proxies any `/api/*` request
> from the browser straight through to the FastAPI backend, so the
> frontend code never needs to hardcode the backend's host/port directly
> outside of that one env var.

### 4. Production build

```bash
cd frontend && npm run build && npm run start
```

```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

Remember to set a real `DATABASE_URL` (not the local dev default) in
production.

## Choosing a free production database

`docker-compose.yml` is for local development. For an actual deployment,
here's what we evaluated for "free, fast, and suitable up to ~50,000
users" (checked against current 2026 pricing, since free-tier terms
change often enough that it's worth verifying yourself at signup time
rather than trusting any one source, including this one):

| Service | Free storage | Uptime behavior | Postgres-compatible? |
|---|---|---|---|
| **Neon** ✅ | 0.5 GB/project | Never expires, no card required, scale-to-zero (~500ms wake, not a full outage) | Yes — it *is* Postgres |
| Supabase | 500 MB | **Free projects pause after 7 days with no traffic** — risky for a real public app | Yes — it *is* Postgres |
| CockroachDB Basic | 10 GiB | Perpetual free monthly credit, scale-to-zero | Postgres wire-compatible, but not identical SQL dialect (some queries may need adjustment) |

**We picked Neon.** It's the only option that's both truly free-forever
*and* won't go dark from inactivity, and since it's literally Postgres,
our SQLAlchemy models, JSONB columns, and foreign keys work with **zero
code changes** — only `DATABASE_URL` changes. See `backend/.env.example`
for the exact connection-string format Neon needs (driver prefix,
`sslmode=require`, and why to prefer the pooled endpoint).

CockroachDB's 10 GiB free tier is worth knowing about if you outgrow
Neon's 0.5 GB and don't want to pay — but budget time to verify our
exact queries against it (foreign keys, `JSONB`, and `server_default`
all behave the same as Postgres in our testing, but CockroachDB isn't a
byte-for-byte clone, and you'd likely want the `sqlalchemy-cockroachdb`
dialect package rather than pointing `postgresql+psycopg://` straight at
it).

### Does this schema actually fit in 500 MB at 50,000 users?

We checked, rather than assuming. At 50k kids averaging 3 attempts each
(24 answers per attempt), the schema as originally designed — storing a
computed `grade_breakdown`/`topic_breakdown` JSON blob on every
`assessment_attempts` row — projected to roughly **645 MB**, already over
Neon's free cap. Those two columns were also, on inspection, **write-only**:
nothing in the API ever read them back, since `POST /api/submit` computes
and returns the breakdown from memory at request time regardless.

We removed them. `assessment_answers` (the per-question raw data) already
contains everything needed to reconstruct the same breakdown by joining
against `questions.grade`/`questions.topic` — see
`repository.compute_attempt_breakdown()`, which isn't wired to an
endpoint yet (nothing needs it today) but is there for a future "view
past attempt in detail" feature without any schema change. This dropped
the projection to roughly **300 MB** at the same 50k-users-×-3-attempts
scale — about 40% headroom under the free cap, and it scales further:
roughly 8 attempts/user, not 3, before hitting the same limit.

If you do outgrow it, Neon storage beyond the free tier is billed at a
flat $0.35/GB-month — a few dollars a month even at heavy usage, not a
cliff.

## Accessibility options for special needs

Beyond the VARK format options above, there's a dedicated "Accessibility
options" section on the intro screen (and via the same pill buttons
mid-quiz) aimed at kids with disabilities or other special needs. None
are required — a kid/parent/teacher turns on whichever help:

| Option | Who it helps | How it works |
|---|---|---|
| **Large text** | Low vision, some learning disabilities | Scales the font size of question text, options, labels, and results (~1.25x) throughout the app |
| **High contrast** | Low vision, color-vision differences | Switches to a near-black-on-white palette with heavier borders, meeting stronger contrast ratios than the default theme |
| **Calm mode** | Autism, ADHD, sensory sensitivity, vestibular disorders | Disables all animations and transitions app-wide (pop-ins, hover/press effects) — independent of the OS-level `prefers-reduced-motion` setting, which is also always respected regardless |
| **Dyslexia-friendly spacing** | Dyslexia, other reading difficulties | Widens letter, word, and line spacing app-wide — a commonly recommended readability accommodation |
| **Big buttons** | Motor impairments, tremor, limited fine motor control | Enlarges answer buttons, the speaker button, nav buttons, and the tappable pieces in interactive visual aids (dots, grid cells) |

A few implementation notes worth knowing if you extend this:

- **High contrast, calm mode, and dyslexia-friendly spacing cost zero
  component changes.** They work by toggling a class on `<body>` (see
  the `useEffect`s in `pages/index.tsx`) that redefines the same CSS
  custom properties (`--ink`, `--border`, `--forest`, etc.) every
  component already consumes via `var(--token)` in `styles/globals.css`.
  Any new component that uses those tokens automatically respects these
  modes without extra work.
- **Large text and big buttons are threaded as props** (`fontScale`,
  `largeTargets`) into the handful of components that render the actual
  assessment content (`QuestionCard`, `VisualAid`, `ProgressBar`,
  `CharacterBubble`, `GradeReveal`/`ResultsView`), since font sizes and
  padding are set as literal pixel values in this codebase rather than
  through a CSS variable that could cascade for free.
- **Keyboard navigation** works throughout the quiz for kids who can't
  use a mouse/touchscreen: number keys `1`-`4` (or letters `A`-`D`)
  pick an answer, `Enter` or `→` advances, `←` goes back. This is
  disabled while focus is in the notes textarea or the name field so it
  doesn't interfere with typing.
- **Screen readers**: the answer choices use proper `role="radiogroup"` /
  `role="radio"` / `aria-checked` semantics instead of generic buttons,
  the progress indicator is `role="progressbar"` with `aria-live="polite"`
  so screen readers announce question changes, and every icon-only
  button has an `aria-label`.
- **Preferences persist** in `localStorage` alongside the VARK format
  options, so a kid's accessibility setup carries over between visits.

## Learning-style format options (VARK)

The intro screen frames the format options around the four styles in the
VARK model (Visual, Auditory, Reading/Writing, Kinesthetic) — kids can
mix and match any combination, or take it as plain text:

- **Visual** — each question ships with a hand-designed SVG diagram
  (number lines, base-10 blocks, array grids, area models, fraction bars,
  tape diagrams, algebra tiles, a Pythagorean square proof, labeled shape
  rows for K's "which shape has 3 sides" style questions, side-by-side
  comparison groups for K/Grade-1 "which is more" questions, etc.) that
  illustrates the numbers/operation involved, similar to a physical math
  manipulative — it never reveals the answer outright, it just gives the
  student something concrete to reason with. See the type list and specs
  documented at the top of `backend/seed_data.py`, and the renderer in
  `frontend/components/VisualAid.tsx`.
- **Auditory** — uses the browser's built-in Web Speech API
  (`window.speechSynthesis`) to read the question and all four options
  out loud. Fully client-side, no audio files or third-party API keys
  needed. See `frontend/lib/speech.ts`.
- **Reading/Writing** — a "Notes while you work" scratchpad
  (`frontend/components/NotesPad.tsx`) appears under each question so
  the student can write out their thinking, the way they might on
  scratch paper. This is intentionally ephemeral/client-only — nothing
  typed here is graded or sent to the backend.
- **Kinesthetic** — a "Hands-on diagrams" mode that makes several of the
  visual aids tappable: array grids, grouped-item diagrams, base-10
  blocks, and percent grids can be tapped piece-by-piece with a live
  running count ("Tap each square — counted 12 of 56"), turning a static
  picture into something the student physically interacts with. See the
  `interactive` prop threaded through `VisualAid.tsx`. (The remaining
  diagram types — area models, fraction bars, tape diagrams, etc. —
  currently stay static; tap interactivity is implemented for the
  diagram types where "count the pieces" is a natural fit.)

All four are independent toggles (see `PreferenceCard` on the intro
screen), switchable mid-quiz too via the compact pill buttons in the
question card's `SettingsBar`, and persisted in `localStorage`.

## Study-buddy character

On the intro screen, the student can pick a "study buddy" — an original
mascot (not tied to any existing media franchise) who pops up with
encouragement throughout the quiz to keep things engaging:

- 6 characters to choose from (Terra the Dinosaur, Nova the Astronaut,
  Marble the Unicorn, Ziggy the Robot, Captain Compass, Fern the Fox),
  each with its own voice/catchphrase — see `frontend/lib/characters.ts`.
- The chosen character comments after most questions: a greeting at the
  start, milestone lines at the 25%/50%/75%/last-question marks, and a
  friendly, topic-flavored remark in between (e.g. "Rawr! fractions are
  all about fair, equal slices."). **Comments never reveal whether an
  answer was right or wrong** — they're motivational and educational
  flavor only, so the assessment stays meaningful.
- The character also delivers a final, score-tier-appropriate comment on
  the results screen, and the chosen `character_id` is saved alongside
  the attempt in Postgres.
- Every character comment has its own "listen" button (reuses the same
  Web Speech API hook), so the buddy works across all three formats.

## How scoring works

Each question is tagged with the grade level the skill is normally taught
at. After submission, the backend:

1. Computes accuracy per grade level (and per topic, for the results
   radar chart).
2. Finds the highest grade level where the student scored **>=70%**, while
   also scoring **>=50%** at every lower grade level tested (a "basal" —
   this avoids crediting a grade level the student got lucky on while
   still missing foundational skills below it).
3. Falls back to "Below Grade X" (lowest grade tested) if no grade
   qualifies.

See `backend/scoring.py` for the full implementation and rationale. Note
that `scoring.py` is intentionally decoupled from the database — it's a
pure function that takes a list of question dicts and an answers map,
so it's easy to unit test without a live DB connection; `main.py` is
responsible for fetching rows from Postgres and shaping them into what
`score_assessment()` expects. This is a simplified heuristic for
demonstration purposes, not a validated standardized assessment.

## Project structure

```
math-assessment/
├── docker-compose.yml     # local Postgres for development
├── backend/
│   ├── main.py             # FastAPI app & routes
│   ├── db.py                # SQLAlchemy engine/session setup
│   ├── models.py            # ORM models: Kid, Question, AssessmentAttempt, AssessmentAnswer
│   ├── repository.py        # all DB queries (seeding, kid lookups, saving attempts)
│   ├── seed_data.py         # initial question content, loaded into Postgres on first run
│   ├── scoring.py           # grade-level + topic-level scoring logic (pure function, DB-agnostic)
│   ├── scripts/seed_db.py   # standalone "create tables + seed" script
│   ├── scripts/generate_questions.py  # produces the 753-question seed_data.py content
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── pages/
    │   ├── _app.tsx
    │   └── index.tsx     # kid-name entry → intro → questions → results
    ├── components/
    │   ├── ProgressBar.tsx
    │   ├── QuestionCard.tsx        # question + visual aid + read-aloud button
    │   ├── VisualAid.tsx           # SVG renderer for every diagram type
    │   ├── PreferenceCard.tsx      # intro-screen format toggles
    │   ├── SettingsBar.tsx         # compact in-quiz format toggles
    │   ├── CharacterPicker.tsx     # intro-screen study-buddy picker
    │   ├── CharacterBubble.tsx     # in-quiz / results character comment
    │   ├── NotesPad.tsx            # Reading/Writing scratchpad
    │   ├── GradeReveal.tsx
    │   ├── GradeBreakdownTable.tsx
    │   ├── TopicRadarChart.tsx     # recharts radar of per-topic accuracy
    │   └── QuestionReviewList.tsx
    ├── lib/
    │   ├── api.ts          # fetch client (incl. kid create/get + history)
    │   ├── types.ts        # shared types, incl. VisualSpec union and Kid
    │   ├── speech.ts        # Web Speech API hook
    │   ├── characters.ts    # study-buddy character data + comment logic
    │   ├── accessibility.ts # shared accessibility-prefs type + font-scale helper
    │   ├── gradeLabel.ts    # maps grade 0 -> "K" for display (mirrors backend)
    │   └── topicIcons.tsx   # topic → icon/color mapping (lucide-react)
    ├── styles/globals.css
    └── next.config.js    # Proxies /api/* to the FastAPI backend
```

## API reference

| Method | Path                        | Description |
|--------|------------------------------|--------------|
| GET    | `/api/questions?kid_id=<id>` | Returns a sample assessment (20 questions total, stratified ~3 per grade level) from the 753-question pool, **without** correct answers, including each question's `visual` diagram spec. `kid_id` is optional but strongly recommended -- with it, the sample is drawn preferentially from that kid's unseen questions (see "Question sampling" above); without it, it's a plain random sample. |
| POST   | `/api/kids`                  | Body: `{ "name": "Alex" }`. Get-or-creates a kid profile (case-insensitive match on name). Returns `{ id, name, total_attempts, last_attempt }` — `last_attempt` is `null` for a brand-new kid |
| GET    | `/api/kids/{kid_id}/history` | Returns every completed attempt for that kid, most recent first |
| POST   | `/api/submit`                | Body: `{ "kid_id": 1, "character_id": "terra" \| null, "answers": { "<question_id>": <option_index> } }`. Scores the assessment, **saves it to Postgres** under that kid, and returns the full `AssessmentResult` (grade estimate, overall score, per-grade breakdown, per-topic breakdown, per-question results with correct answers revealed) |
| GET    | `/api/health`                | Basic health check (also confirms the DB connection works, since it counts questions) |

## Content safety

This app is built for kids, so all user-facing text was audited for
profanity, abusive/violent language, and discouraging or shaming
phrasing (e.g. "you're bad at this"). A few things worth knowing:

- **All text is static and hand-written** — there is no LLM or other
  generative call at runtime that produces question text or character
  dialogue, so there's no risk of unpredictable output appearing during
  actual use. Every question, answer choice, and character line lives in
  `backend/seed_data.py` and `frontend/lib/characters.ts` and was
  reviewed directly.
- **Character comments never reveal correctness** — they're
  encouragement/topic flavor only (see "Study-buddy character" above),
  and the "low score" comment lines are deliberately growth-mindset
  framed (e.g. "Every great sailor starts as a deckhand — you'll get
  there!") rather than discouraging.
- **`scripts/content_safety_check.py`** (at the repo root) is a small,
  dependency-free guard you can re-run any time you add new questions,
  character lines, or UI copy:

  ```bash
  python3 scripts/content_safety_check.py
  ```

  It scans `backend/seed_data.py`, `frontend/lib/characters.ts`, and
  everything under `frontend/pages/` and `frontend/components/` for a
  blocklist of profanity, violent/abusive language, and discouraging
  phrasing, and prints the exact file/line of any match. It's a
  lightweight guard, not a full profanity-filter library or a substitute
  for a human read-through of new content — but it's cheap to run and
  catches obvious slips. (Note: it scans the seed file, not the live DB
  rows — if you ever add an admin UI for editing questions in place,
  extend the check or re-run it against a fresh export.)

## Extending it

- **Add/edit questions:** edit `backend/seed_data.py`, then either wipe
  the `questions` table and restart the app (or run
  `python3 scripts/seed_db.py`) to reseed, or write the new rows directly
  into Postgres — the app doesn't care which, since it always reads from
  the DB at runtime. Give each new question a `visual` spec (see the type
  list in that file's docstring) if you want it to support visual mode.
- **Add a new visual diagram type:** add a case to the `VisualSpec` union
  in `frontend/lib/types.ts` and a matching renderer function in
  `frontend/components/VisualAid.tsx`.
- **Query a kid's full history:** `assessment_answers` is fully
  normalized, so you can do things like "which topics does Alex get
  wrong most often across all attempts" directly in SQL rather than
  needing a new endpoint for every question you might want to ask.
- **Add real auth:** the current `POST /api/kids` get-or-create-by-name
  flow is intentionally simple (no passwords). If you need multiple
  families/classrooms on one deployment, or a parent/teacher dashboard
  that shouldn't be viewable by anyone who just knows a kid's name,
  layer proper authentication (e.g. a parent account that owns one or
  more kid profiles) on top of the `kids` table.
- **Adjust mastery thresholds:** `MASTERY_THRESHOLD` / `FOUNDATION_THRESHOLD`
  constants at the top of `backend/scoring.py`.
- **Voice options:** `frontend/lib/speech.ts` uses the browser's default
  voice; you can extend it to let the student pick from
  `speechSynthesis.getVoices()` if you want multiple voice options.
