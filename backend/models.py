"""
Database schema.

  kids                  one row per kid/student (identified by name --
                         see main.py for the get-or-create flow, there's
                         no password/auth, just a lightweight profile).

  questions             the master question bank. Runtime source of
                         truth (seeded once from seed_data.py -- see
                         repository.seed_questions_if_empty).

  assessment_attempts    one row per completed assessment a kid takes:
                         the summary fields the API needs immediately
                         (grade estimate, overall score, counts).

  assessment_answers     one row per question answered within an
                         attempt. This is the source of truth for
                         everything else -- per-grade/per-topic accuracy
                         breakdowns are NOT stored on the attempt row;
                         they're fully derivable by joining this table
                         with `questions` (see
                         repository.compute_attempt_breakdown), which
                         keeps storage flat as attempt volume grows
                         instead of duplicating ~15 grade/topic JSON
                         blobs per attempt. At 50k users with a few
                         attempts each, this alone is the difference
                         between comfortably fitting a free-tier
                         database's storage cap and not.
"""

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    TIMESTAMP,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from db import Base


class Kid(Base):
    __tablename__ = "kids"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(300), nullable=True)
    auth_version = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    attempts = relationship(
        "AssessmentAttempt", back_populates="kid", order_by="AssessmentAttempt.started_at"
    )
    customization = relationship(
        "KidCustomization", back_populates="kid", uselist=False,
        cascade="all, delete-orphan"
    )
    reward_transactions = relationship(
        "RewardTransaction", back_populates="kid", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("name", name="uq_kids_name"),)


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    grade = Column(Integer, nullable=False)
    topic = Column(String(100), nullable=False)
    question = Column(Text, nullable=False)
    options = Column(JSONB, nullable=False)  # list[str], always length 4
    correct_index = Column(Integer, nullable=False)
    visual = Column(JSONB, nullable=True)  # optional diagram spec, see seed_data.py
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True)
    kid_id = Column(Integer, ForeignKey("kids.id", ondelete="CASCADE"), nullable=False)
    character_id = Column(String(50), nullable=True)  # chosen study-buddy, if any

    started_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(TIMESTAMP(timezone=True), nullable=True)

    estimated_grade_level = Column(String(100), nullable=True)
    overall_score = Column(Numeric(5, 1), nullable=True)
    total_questions = Column(Integer, nullable=True)
    total_correct = Column(Integer, nullable=True)

    kid = relationship("Kid", back_populates="attempts")
    answers = relationship(
        "AssessmentAnswer", back_populates="attempt", cascade="all, delete-orphan"
    )


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"

    id = Column(Integer, primary_key=True)
    attempt_id = Column(
        Integer, ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False
    )
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    student_answer_index = Column(Integer, nullable=False)
    is_correct = Column(Boolean, nullable=False)

    attempt = relationship("AssessmentAttempt", back_populates="answers")


class KidCustomization(Base):
    __tablename__ = "kid_customizations"

    kid_id = Column(Integer, ForeignKey("kids.id", ondelete="CASCADE"), primary_key=True)
    background_id = Column(String(50), nullable=False, default="paper")
    avatar = Column(JSONB, nullable=False, default=dict)
    unlocked_backgrounds = Column(JSONB, nullable=False, default=list)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    kid = relationship("Kid", back_populates="customization")


class RewardTransaction(Base):
    __tablename__ = "reward_transactions"

    id = Column(Integer, primary_key=True)
    kid_id = Column(Integer, ForeignKey("kids.id", ondelete="CASCADE"), nullable=False)
    attempt_id = Column(
        Integer, ForeignKey("assessment_attempts.id", ondelete="CASCADE"),
        nullable=True, unique=True
    )
    source = Column(String(50), nullable=False)
    points = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    kid = relationship("Kid", back_populates="reward_transactions")
