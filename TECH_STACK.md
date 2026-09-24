# Tech Stack Documentation

**Last Updated:** 2026-09-15  
**Project:** Math Proficiency Assessment Platform

---

## Overview

A full-stack web application for K-6 math proficiency assessment with:
- 753 questions across 36 math concepts
- Adaptive scoring with visual aids and audio support
- Per-student result persistence
- Containerized local deployment

---

## Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| **FastAPI** | 0.115.0 | Async Python web framework for API endpoints |
| **Uvicorn** | 0.30.6 | ASGI server for running FastAPI application |
| **SQLAlchemy** | 2.0.35 | ORM for database query abstraction and models |
| **Pydantic** | 2.9.2 | Data validation and serialization |
| **Psycopg** | 3.2.3 | PostgreSQL database driver (binary) |

**Configuration:** See [backend/requirements.txt](backend/requirements.txt)

**Key Modules:**
- `main.py` — FastAPI application entry point
- `models.py` — SQLAlchemy ORM models
- `db.py` — Database connection and session management
- `repository.py` — Data access layer
- `scoring.py` — Assessment scoring logic
- `seed_data.py` — Question bank seed data (753 questions)

---

## Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14.2.35 | React framework with SSR, routing, and optimization |
| **React** | 18.3.1 | UI component library |
| **TypeScript** | 5.5.4 | Type-safe JavaScript |
| **Recharts** | 3.10.1 | Charting library for analytics/progress visualization |
| **Lucide React** | 1.45.0 | Icon library for UI components |

**Dev Dependencies:**
- `@types/node` (20.14.15)
- `@types/react` (18.3.3)
- `@types/react-dom` (18.3.0)

**Configuration:** See [frontend/package.json](frontend/package.json)

**Key Components:**
- `pages/index.tsx` — Main assessment page
- `pages/_app.tsx` — Next.js app wrapper
- `components/` — Reusable UI components (QuestionCard, ResultsView, etc.)
- `lib/` — Utilities for API calls, accessibility, speech, and types

---

## Database

| Technology | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 16 | Relational database for questions and student results |

**Configuration:** See [docker-compose.yml](docker-compose.yml)

**Database Name:** `math_assessment`

**Key Tables:**
- `questions` — Master question bank (753 questions, 36 concepts)
- `students` — Student profiles (name-based, no password)
- `assessment_attempts` — Individual assessment session records
- `answers` — Per-question student responses

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- User: `app_user`
- Database: `math_assessment`

---

## Infrastructure & Deployment

| Technology | Version | Purpose |
|---|---|---|
| **Docker** | Latest | Containerization |
| **Docker Compose** | Latest | Multi-container orchestration |

**Compose Services:**
- `db` — PostgreSQL 16 container with health checks
- Backend and frontend run on host (see `start.sh`)

**Current Deployment:** Localhost only

**Future Deployment Path:** See README.md "Choosing a free production database" section

---

## Development Scripts

See [package.json](frontend/package.json) and [start.sh](start.sh):

**Frontend:**
- `npm run dev` — Development server (Next.js)
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run linter

**Backend:**
- `uvicorn main:app --reload` — Development server (auto-reload)

**Database:**
- `backend/scripts/seed_db.py` — Initialize question bank
- `backend/scripts/generate_questions.py` — Generate question data

---

## Architecture Notes

- **Question Generation:** 753 questions are generated programmatically in `seed_data.py` (see `scripts/generate_questions.py`)
- **Stratified Sampling:** Each assessment draws 20 questions stratified across 7 grade levels (K-6)
- **Answer Verification:** All correct answers are recomputed, not just trusted
- **Per-Student Persistence:** Every answer is logged for per-kid assessment history
- **Kid-Friendly UX:** Optional visual diagrams and audio read-aloud for every question

## Rewards & Customization

- Each completed 20-question assessment awards **100 reward points** independently of the academic score.
- Reward transactions are stored in `reward_transactions`, making assessment rewards and future game rewards auditable.
- Students have a persisted customization profile in `kid_customizations` with an avatar configuration and selected background.
- Backgrounds use a point cost catalog: Paper is free, themed backgrounds cost 200-500 points.
- A background is purchased once and then remains unlocked for that student. The purchase is recorded as a negative reward transaction.
- The current frontend exposes a "My locker" section with a CSS-rendered avatar studio and background picker.
- Games are not yet implemented, but can award points through the same reward transaction model.
- Student accounts use password hashing with Python's standard-library `scrypt` and signed bearer tokens.
- Registration is handled by `POST /api/kids`; login is handled by `POST /api/login`.
- Student-specific questions, history, assessment submission, and customization require the bearer token.
- Teachers/admins can reset a student password through `POST /api/admin/reset-password` using `ADMIN_RESET_SECRET`.
- Password resets increment the student's auth version, invalidating previously issued tokens while preserving rewards and progress.

**Feature Files:**
- `frontend/components/AvatarStudio.tsx` — avatar preview and controls
- `frontend/components/BackgroundPicker.tsx` — background selection and locked states
- `frontend/lib/rewards.ts` — frontend reward catalog and defaults
- `backend/models.py` — customization and reward transaction tables
- `backend/repository.py` — reward accounting and customization persistence

---

## Maintenance Notes

This file documents the project's technology dependencies and their purposes. It should be updated when:
- ✅ Dependencies are added/removed (update relevant section)
- ✅ Versions are updated (update version column)
- ✅ New services are added to Docker Compose
- ✅ Architecture or key modules change

**Last verified compatibility:** 2026-09-15
