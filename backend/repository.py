"""
Data-access layer. Keeps main.py focused on HTTP concerns and keeps raw
SQLAlchemy queries in one place.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import select, text, func
from sqlalchemy.orm import Session

import models
from seed_data import SEED_QUESTIONS


# ---------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------

def seed_questions_if_empty(db: Session) -> int:
    """
    Loads SEED_QUESTIONS into the `questions` table if it's currently
    empty. Returns the number of rows inserted (0 if already seeded).
    Safe to call on every startup -- it's a no-op once seeded.
    """
    existing = db.execute(select(models.Question.id).limit(1)).first()
    if existing is not None:
        return 0

    for q in SEED_QUESTIONS:
        db.add(
            models.Question(
                id=q["id"],
                grade=q["grade"],
                topic=q["topic"],
                question=q["question"],
                options=q["options"],
                correct_index=q["correct_index"],
                visual=q.get("visual"),
            )
        )
    db.commit()

    # Keep the sequence in sync since we inserted explicit ids above.
    db.execute(
        text(
            "SELECT setval(pg_get_serial_sequence('questions', 'id'), "
            "(SELECT COALESCE(MAX(id), 1) FROM questions))"
        )
    )
    db.commit()
    return len(SEED_QUESTIONS)


def get_all_questions(db: Session) -> List[models.Question]:
    return list(db.execute(select(models.Question).order_by(models.Question.id)).scalars())


def get_seen_question_ids(db: Session, kid_id: int) -> set:
    """
    Every question id this kid has been asked in any past attempt
    (regardless of whether they got it right), used to bias future
    samples toward new material -- see get_sampled_questions().
    """
    rows = db.execute(
        select(models.AssessmentAnswer.question_id)
        .join(models.AssessmentAttempt, models.AssessmentAttempt.id == models.AssessmentAnswer.attempt_id)
        .where(models.AssessmentAttempt.kid_id == kid_id)
        .distinct()
    )
    return {row[0] for row in rows}


def get_sampled_questions(
    db: Session, total: int, kid_id: Optional[int] = None
) -> List[models.Question]:
    """
    Draws `total` questions spread as evenly as possible across EVERY
    grade level present in the bank (e.g. 20 total over 7 grade levels
    -> 3 questions each for 6 grades, 2 for the 7th) -- freshly
    reshuffled every call, and, when `kid_id` is given, drawn
    preferentially from questions that specific kid hasn't been asked
    before (falling back to repeats only once a grade's unseen pool is
    exhausted for them). This is what guarantees "distinct questions for
    different users": two kids each get their own unseen pool to draw
    from, and the same kid won't see their last attempt's questions
    again until they've cycled through the rest of that grade's pool
    (at least 20 questions per topic, at least a few hundred per grade
    once topics are combined -- see seed_data.py's module docstring).

    Without `kid_id` (e.g. an anonymous preview fetch before a kid has
    identified themselves), this is a plain random sample with no
    exclusions.

    get_all_questions() (the full question bank) is only used internally
    for scoring/validation, since a single sitting can't reasonably show
    every question in the pool.
    """
    seen_ids = get_seen_question_ids(db, kid_id) if kid_id is not None else set()

    grades = sorted(row[0] for row in db.execute(select(models.Question.grade).distinct()))
    if not grades:
        return []

    # Stratified allocation: base count for every grade, plus one extra
    # each for the first `remainder` grades so the total adds up exactly
    # (e.g. 20 over 7 grades = 3,3,3,3,3,3,2).
    base, remainder = divmod(total, len(grades))
    per_grade_counts = {
        grade: base + (1 if i < remainder else 0) for i, grade in enumerate(grades)
    }

    sampled: List[models.Question] = []
    for grade in grades:
        per_grade = per_grade_counts[grade]
        if per_grade <= 0:
            continue
        base_query = select(models.Question).where(models.Question.grade == grade)

        unseen_query = base_query
        if seen_ids:
            unseen_query = unseen_query.where(models.Question.id.notin_(seen_ids))
        unseen_rows = list(
            db.execute(unseen_query.order_by(func.random()).limit(per_grade)).scalars()
        )

        if len(unseen_rows) < per_grade:
            # This kid has seen most/all of this grade's pool -- top up
            # with previously-seen questions rather than short the grade.
            already_picked_ids = {q.id for q in unseen_rows}
            fill_needed = per_grade - len(unseen_rows)
            fill_query = base_query
            if already_picked_ids:
                fill_query = fill_query.where(models.Question.id.notin_(already_picked_ids))
            fill_rows = db.execute(
                fill_query.order_by(func.random()).limit(fill_needed)
            ).scalars()
            unseen_rows.extend(fill_rows)

        sampled.extend(unseen_rows)

    sampled.sort(key=lambda q: q.grade)
    return sampled


def get_questions_by_ids(db: Session, ids: List[int]) -> Dict[int, models.Question]:
    rows = db.execute(
        select(models.Question).where(models.Question.id.in_(ids))
    ).scalars()
    return {row.id: row for row in rows}


# ---------------------------------------------------------------------
# Kids
# ---------------------------------------------------------------------

def get_or_create_kid(db: Session, name: str) -> models.Kid:
    normalized = name.strip()
    existing = db.execute(
        select(models.Kid).where(models.Kid.name.ilike(normalized))
    ).scalar_one_or_none()
    if existing:
        return existing

    kid = models.Kid(name=normalized)
    db.add(kid)
    db.commit()
    db.refresh(kid)
    return kid


def get_kid(db: Session, kid_id: int) -> Optional[models.Kid]:
    return db.get(models.Kid, kid_id)


def get_kid_last_attempt(db: Session, kid_id: int) -> Optional[models.AssessmentAttempt]:
    return db.execute(
        select(models.AssessmentAttempt)
        .where(
            models.AssessmentAttempt.kid_id == kid_id,
            models.AssessmentAttempt.completed_at.isnot(None),
        )
        .order_by(models.AssessmentAttempt.completed_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def count_kid_attempts(db: Session, kid_id: int) -> int:
    rows = db.execute(
        select(models.AssessmentAttempt.id).where(
            models.AssessmentAttempt.kid_id == kid_id,
            models.AssessmentAttempt.completed_at.isnot(None),
        )
    ).all()
    return len(rows)


def get_kid_history(db: Session, kid_id: int) -> List[models.AssessmentAttempt]:
    return list(
        db.execute(
            select(models.AssessmentAttempt)
            .where(
                models.AssessmentAttempt.kid_id == kid_id,
                models.AssessmentAttempt.completed_at.isnot(None),
            )
            .order_by(models.AssessmentAttempt.completed_at.desc())
        ).scalars()
    )


# ---------------------------------------------------------------------
# Assessment attempts
# ---------------------------------------------------------------------

def save_attempt(
    db: Session,
    kid_id: int,
    character_id: Optional[str],
    result: Dict[str, Any],
    answers_by_id: Dict[int, int],
    question_lookup: Dict[int, models.Question],
) -> models.AssessmentAttempt:
    """
    Persists a completed attempt: one AssessmentAttempt row (summary
    fields only -- grade/topic breakdowns are derivable, see
    compute_attempt_breakdown) plus one AssessmentAnswer row per
    question answered.
    """
    attempt = models.AssessmentAttempt(
        kid_id=kid_id,
        character_id=character_id,
        estimated_grade_level=result["estimated_grade_level"],
        overall_score=result["overall_score"],
        total_questions=result["total_questions"],
        total_correct=result["total_correct"],
    )
    db.add(attempt)
    db.flush()  # assigns attempt.id without committing yet

    for qid, selected_idx in answers_by_id.items():
        question = question_lookup[qid]
        db.add(
            models.AssessmentAnswer(
                attempt_id=attempt.id,
                question_id=qid,
                student_answer_index=selected_idx,
                is_correct=(selected_idx == question.correct_index),
            )
        )

    attempt.completed_at = func.now()
    db.commit()
    db.refresh(attempt)
    return attempt


def compute_attempt_breakdown(db: Session, attempt_id: int) -> Dict[str, List[Dict[str, Any]]]:
    """
    Derives the same grade_breakdown / topic_breakdown shape that used to
    be stored directly on the attempt row, by joining assessment_answers
    with questions. Not called anywhere yet (no current endpoint needs
    it), but kept here so a future "view past attempt in detail" feature
    doesn't need any schema change -- the raw per-answer data already has
    everything required.
    """
    rows = db.execute(
        select(
            models.Question.grade,
            models.Question.topic,
            models.AssessmentAnswer.is_correct,
        )
        .join(models.Question, models.Question.id == models.AssessmentAnswer.question_id)
        .where(models.AssessmentAnswer.attempt_id == attempt_id)
    ).all()

    grade_totals: Dict[int, Dict[str, int]] = {}
    topic_totals: Dict[str, Dict[str, int]] = {}

    for grade, topic, is_correct in rows:
        g = grade_totals.setdefault(grade, {"total": 0, "correct": 0})
        g["total"] += 1
        g["correct"] += int(is_correct)

        t = topic_totals.setdefault(topic, {"total": 0, "correct": 0})
        t["total"] += 1
        t["correct"] += int(is_correct)

    grade_breakdown = [
        {
            "grade": grade,
            "total": v["total"],
            "correct": v["correct"],
            "accuracy": round((v["correct"] / v["total"]) * 100, 1) if v["total"] else 0.0,
        }
        for grade, v in sorted(grade_totals.items())
    ]
    topic_breakdown = [
        {
            "topic": topic,
            "total": v["total"],
            "correct": v["correct"],
            "accuracy": round((v["correct"] / v["total"]) * 100, 1) if v["total"] else 0.0,
        }
        for topic, v in sorted(topic_totals.items())
    ]

    return {"grade_breakdown": grade_breakdown, "topic_breakdown": topic_breakdown}
