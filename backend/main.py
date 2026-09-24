import hmac
import os
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

import models
import repository
from auth import create_token, decode_token, hash_password, verify_password
from db import Base, SessionLocal, engine, get_db
from scoring import score_assessment, AssessmentResult

app = FastAPI(title="Math Proficiency Assessment API")
ADMIN_RESET_SECRET = os.environ.get("ADMIN_RESET_SECRET", "local-dev-admin-reset")

# Total questions a child answers in one assessment attempt -- NOT the
# size of the question pool (753 questions across 36 topics -- see
# seed_data.py's module docstring). Distributed as evenly as possible
# across every grade level present (see
# repository.get_sampled_questions() for the exact allocation), so a
# 20-question attempt with 7 grade levels (K-6) works out to 3 questions
# each for 6 grades and 2 for the 7th.
QUESTIONS_TOTAL_PER_ATTEMPT = 20

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    """
    Creates tables if they don't exist yet, then seeds the question bank
    from seed_data.py if the `questions` table is empty. Both are no-ops
    on every startup after the first, so this is safe to leave in place
    rather than requiring a separate manual migration step for local dev.
    (See scripts/seed_db.py to run the same thing standalone, e.g. in CI
    or a deploy hook, without needing to boot the API.)
    """
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE kids ADD COLUMN IF NOT EXISTS password_hash VARCHAR(300)"
        ))
        connection.execute(text(
            "ALTER TABLE kids ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 0"
        ))
    db = SessionLocal()
    try:
        inserted = repository.seed_questions_if_empty(db)
        if inserted:
            print(f"[startup] seeded {inserted} questions into the database")
    finally:
        db.close()


# ---------------------------------------------------------------------
# Pydantic request/response models
# ---------------------------------------------------------------------

class PublicQuestion(BaseModel):
    id: int
    grade: int
    topic: str
    question: str
    options: List[str]
    visual: Optional[Dict[str, Any]] = None


class CreateKidPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class LoginPayload(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)


class AdminResetPayload(BaseModel):
    admin_secret: str = Field(min_length=1, max_length=200)
    student_name: str = Field(min_length=1, max_length=100)
    new_password: str = Field(min_length=8, max_length=128)


class AttemptSummary(BaseModel):
    id: int
    completed_at: Optional[str]
    estimated_grade_level: Optional[str]
    overall_score: Optional[float]
    total_correct: Optional[int]
    total_questions: Optional[int]


class KidResponse(BaseModel):
    id: int
    name: str
    total_attempts: int
    last_attempt: Optional[AttemptSummary] = None
    total_points: int
    background_id: str
    avatar: Dict[str, str]
    unlocked_backgrounds: List[str]
    token: Optional[str] = None


class CustomizationPayload(BaseModel):
    background_id: str = Field(min_length=1, max_length=50)
    avatar: Dict[str, str]


class SubmitPayload(BaseModel):
    kid_id: int
    character_id: Optional[str] = None
    # question_id (as string, since JSON object keys are strings) -> selected option index
    answers: Dict[str, int]


# ---------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------

@app.get("/api/questions", response_model=List[PublicQuestion])
def get_questions(
    kid_id: Optional[int] = None,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(default=None),
):
    """
    Returns one assessment attempt's worth of questions WITHOUT correct
    answers: a stratified sample of QUESTIONS_TOTAL_PER_ATTEMPT questions
    total, spread as evenly as possible across every grade level, drawn
    from the 753-question bank in Postgres.

    Pass `?kid_id=<id>` once a kid has identified themselves and the
    sample is drawn preferentially from questions THAT KID hasn't been
    asked before (falling back to repeats only once their unseen pool
    for a grade runs out). This is what guarantees distinct questions
    across different users, and fresh ones on retakes for the same user
    -- see repository.get_sampled_questions() and seed_data.py's module
    docstring for the full rationale. Without kid_id (e.g. the initial
    anonymous preview fetch before a name is entered), it's a plain
    random sample with no exclusions.
    """
    if kid_id is not None:
        authenticated = authenticated_kid(authorization, db)
        if authenticated.id != kid_id:
            raise HTTPException(status_code=403, detail="You can only load your own questions.")

    questions = repository.get_sampled_questions(
        db, total=QUESTIONS_TOTAL_PER_ATTEMPT, kid_id=kid_id
    )
    return [
        {
            "id": q.id,
            "grade": q.grade,
            "topic": q.topic,
            "question": q.question,
            "options": q.options,
            "visual": q.visual,
        }
        for q in questions
    ]


# ---------------------------------------------------------------------
# Kids
# ---------------------------------------------------------------------

@app.post("/api/kids", response_model=KidResponse)
def create_or_get_kid(payload: CreateKidPayload, db: Session = Depends(get_db)):
    """
    Get-or-create a kid profile by name (case-insensitive). There's no
    password/auth here by design -- this is a lightweight per-kid
    profile for a family/classroom app, not a secured account system.
    Returns the kid's attempt history summary so the frontend can show a
    "welcome back" message when a returning kid picks their name again.
    """
    existing = repository.get_kid_by_name(db, payload.name)
    if existing:
        if existing.password_hash is None:
            kid = repository.set_kid_password(db, existing, hash_password(payload.password))
        else:
            raise HTTPException(status_code=409, detail="That student name is already registered. Log in instead.")
    else:
        kid = repository.get_or_create_kid(db, payload.name, hash_password(payload.password))
    customization = repository.get_or_create_customization(db, kid.id)
    total_attempts = repository.count_kid_attempts(db, kid.id)
    last_attempt = repository.get_kid_last_attempt(db, kid.id)

    response = _kid_response(
        kid,
        total_attempts,
        last_attempt,
        repository.get_kid_points(db, kid.id),
        customization,
    )
    response["token"] = create_token(kid.id, kid.auth_version or 0)
    return response


@app.post("/api/login", response_model=KidResponse)
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    kid = repository.get_kid_by_name(db, payload.name)
    if not kid or not verify_password(payload.password, kid.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect student name or password.")
    customization = repository.get_or_create_customization(db, kid.id)
    response = _kid_response(
        kid,
        repository.count_kid_attempts(db, kid.id),
        repository.get_kid_last_attempt(db, kid.id),
        repository.get_kid_points(db, kid.id),
        customization,
    )
    response["token"] = create_token(kid.id, kid.auth_version or 0)
    return response


@app.post("/api/admin/reset-password")
def admin_reset_password(payload: AdminResetPayload, db: Session = Depends(get_db)):
    if not hmac.compare_digest(payload.admin_secret, ADMIN_RESET_SECRET):
        raise HTTPException(status_code=401, detail="Invalid teacher reset key.")
    kid = repository.get_kid_by_name(db, payload.student_name)
    if not kid:
        raise HTTPException(status_code=404, detail="Student not found.")
    repository.set_kid_password(db, kid, hash_password(payload.new_password))
    return {"message": f"Password reset for {kid.name}."}


def authenticated_kid(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> models.Kid:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        token_payload = decode_token(authorization[7:])
        kid_id = int(token_payload["kid_id"])
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
    kid = repository.get_kid(db, kid_id)
    if not kid:
        raise HTTPException(status_code=401, detail="Student profile not found.")
    if int(token_payload.get("auth_version", 0)) != (kid.auth_version or 0):
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return kid


@app.get("/api/me", response_model=KidResponse)
def get_current_kid(
    kid: models.Kid = Depends(authenticated_kid),
    db: Session = Depends(get_db),
):
    customization = repository.get_or_create_customization(db, kid.id)
    return _kid_response(
        kid,
        repository.count_kid_attempts(db, kid.id),
        repository.get_kid_last_attempt(db, kid.id),
        repository.get_kid_points(db, kid.id),
        customization,
    )


@app.patch("/api/kids/{kid_id}/customization", response_model=KidResponse)
def update_customization(
    kid_id: int,
    payload: CustomizationPayload,
    db: Session = Depends(get_db),
    kid: models.Kid = Depends(authenticated_kid),
):
    if kid.id != kid_id:
        raise HTTPException(status_code=403, detail="You can only update your own customization.")

    allowed_backgrounds = {"paper", "space", "jungle", "ocean", "sunset", "blueprint", "celebration"}
    if payload.background_id not in allowed_backgrounds:
        raise HTTPException(status_code=400, detail="Unknown background.")

    try:
        customization = repository.save_customization(db, kid.id, payload.background_id, payload.avatar)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    last_attempt = repository.get_kid_last_attempt(db, kid_id)
    return _kid_response(
        kid,
        repository.count_kid_attempts(db, kid.id),
        last_attempt,
        repository.get_kid_points(db, kid.id),
        customization,
    )


def _kid_response(
    kid: models.Kid,
    total_attempts: int,
    last_attempt: Optional[models.AssessmentAttempt],
    total_points: int,
    customization: models.KidCustomization,
) -> Dict[str, Any]:
    return {
        "id": kid.id,
        "name": kid.name,
        "total_attempts": total_attempts,
        "last_attempt": _attempt_to_summary(last_attempt) if last_attempt else None,
        "total_points": total_points,
        "background_id": customization.background_id,
        "avatar": customization.avatar,
        "unlocked_backgrounds": customization.unlocked_backgrounds,
    }


@app.get("/api/kids/{kid_id}/history", response_model=List[AttemptSummary])
def get_kid_history(
    kid_id: int,
    db: Session = Depends(get_db),
    kid: models.Kid = Depends(authenticated_kid),
):
    if kid.id != kid_id:
        raise HTTPException(status_code=403, detail="You can only access your own history.")
    attempts = repository.get_kid_history(db, kid.id)
    return [_attempt_to_summary(a) for a in attempts]


def _attempt_to_summary(attempt: models.AssessmentAttempt) -> Dict[str, Any]:
    return {
        "id": attempt.id,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        "estimated_grade_level": attempt.estimated_grade_level,
        "overall_score": float(attempt.overall_score) if attempt.overall_score is not None else None,
        "total_correct": attempt.total_correct,
        "total_questions": attempt.total_questions,
    }


# ---------------------------------------------------------------------
# Submitting an assessment
# ---------------------------------------------------------------------

@app.post("/api/submit", response_model=AssessmentResult)
def submit_assessment(
    payload: SubmitPayload,
    db: Session = Depends(get_db),
    kid: models.Kid = Depends(authenticated_kid),
):
    """
    Accepts a mapping of question id -> selected option index, grades the
    assessment, PERSISTS the attempt (and each individual answer) to
    Postgres under the given kid_id, and returns the full breakdown.
    """
    if not payload.answers:
        raise HTTPException(status_code=400, detail="No answers submitted.")

    if kid.id != payload.kid_id:
        raise HTTPException(status_code=403, detail="You can only submit your own assessment.")

    all_questions = repository.get_all_questions(db)
    valid_ids = {q.id for q in all_questions}

    try:
        answers_by_id = {int(qid): idx for qid, idx in payload.answers.items()}
    except ValueError:
        raise HTTPException(status_code=400, detail="Question ids must be integers.")

    unknown_ids = set(answers_by_id.keys()) - valid_ids
    if unknown_ids:
        raise HTTPException(
            status_code=400, detail=f"Unknown question ids: {sorted(unknown_ids)}"
        )

    for qid, idx in answers_by_id.items():
        if not isinstance(idx, int) or idx < 0 or idx > 3:
            raise HTTPException(
                status_code=400, detail=f"Invalid option index for question {qid}."
            )

    question_dicts = [
        {
            "id": q.id,
            "grade": q.grade,
            "topic": q.topic,
            "question": q.question,
            "options": q.options,
            "correct_index": q.correct_index,
        }
        for q in all_questions
    ]

    result = score_assessment(question_dicts, answers_by_id)

    question_lookup = {q.id: q for q in all_questions}
    repository.save_attempt(
        db,
        kid_id=payload.kid_id,
        character_id=payload.character_id,
        result=result,
        answers_by_id=answers_by_id,
        question_lookup=question_lookup,
    )

    return result


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    question_count = len(repository.get_all_questions(db))
    return {"status": "ok", "total_questions": question_count}
