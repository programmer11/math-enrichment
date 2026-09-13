"""
Grade-level proficiency scoring logic.

Approach
--------
Each question belongs to a grade level, Kindergarten through Grade 6
(Kindergarten is represented as integer 0 -- see grade_label() below --
so no schema change was needed to add it). After the student answers
every question:

1. We compute the accuracy (correct / total) within each grade level that
   had at least one question answered.
2. We look for a "basal" grade: the highest grade level G such that the
   student scored >= MASTERY_THRESHOLD at G, AND scored >= FOUNDATION_THRESHOLD
   at every grade level below G. This mirrors how many real adaptive
   placement tests establish a floor of foundational competence before
   crediting a higher grade level.
3. If no grade meets the basal criteria, we fall back to the lowest grade
   level tested (labelled "Below Grade X").
4. We also return the full per-grade-level breakdown and per-question
   results so the user can see exactly where they were strong or weak.

This is a simplified heuristic for demonstration purposes and is NOT a
substitute for a validated, standardized educational assessment.

Note: this module is intentionally decoupled from the database -- it
takes a plain list of question dicts as input rather than importing
`models.Question` or touching a DB session. That keeps it a pure,
easily-testable function; `main.py` is responsible for fetching the
question rows from Postgres and shaping them into the dicts this module
expects.
"""

from typing import Any, Dict, List, TypedDict

MASTERY_THRESHOLD = 0.70      # accuracy needed at a grade to "pass" it
FOUNDATION_THRESHOLD = 0.50   # minimum accuracy needed at lower grades


def grade_label(grade: int) -> str:
    """
    Kindergarten is stored as grade 0 (see module docstring). This is the
    single place that maps it to "K" for display -- used here and by the
    frontend's lib/gradeLabel.ts, which mirrors this exact logic for
    grade numbers the API returns elsewhere (e.g. grade_breakdown rows).
    """
    return "K" if grade == 0 else str(grade)


class QuestionResult(TypedDict):
    id: int
    grade: int
    topic: str
    question: str
    options: List[str]
    student_answer_index: int
    correct_index: int
    is_correct: bool


class GradeBreakdown(TypedDict):
    grade: int
    total: int
    correct: int
    accuracy: float


class TopicBreakdown(TypedDict):
    topic: str
    total: int
    correct: int
    accuracy: float


class AssessmentResult(TypedDict):
    estimated_grade_level: str
    overall_score: float
    total_questions: int
    total_correct: int
    grade_breakdown: List[GradeBreakdown]
    topic_breakdown: List[TopicBreakdown]
    question_results: List[QuestionResult]


def score_assessment(
    questions: List[Dict[str, Any]], answers: Dict[int, int]
) -> AssessmentResult:
    """
    questions: the full question bank as plain dicts, each with at least
               id, grade, topic, question, options, correct_index
               (typically fetched from the `questions` table)
    answers:   mapping of question_id -> selected option index
    """
    question_results: List[QuestionResult] = []
    per_grade_total: Dict[int, int] = {}
    per_grade_correct: Dict[int, int] = {}
    per_topic_total: Dict[str, int] = {}
    per_topic_correct: Dict[str, int] = {}

    total_correct = 0

    for q in questions:
        qid = q["id"]
        if qid not in answers:
            # Skip unanswered questions from scoring but they simply won't
            # count toward either total or correct.
            continue

        student_idx = answers[qid]
        is_correct = student_idx == q["correct_index"]

        per_grade_total[q["grade"]] = per_grade_total.get(q["grade"], 0) + 1
        per_topic_total[q["topic"]] = per_topic_total.get(q["topic"], 0) + 1
        if is_correct:
            per_grade_correct[q["grade"]] = per_grade_correct.get(q["grade"], 0) + 1
            per_topic_correct[q["topic"]] = per_topic_correct.get(q["topic"], 0) + 1
            total_correct += 1

        question_results.append(
            {
                "id": qid,
                "grade": q["grade"],
                "topic": q["topic"],
                "question": q["question"],
                "options": q["options"],
                "student_answer_index": student_idx,
                "correct_index": q["correct_index"],
                "is_correct": is_correct,
            }
        )

    total_answered = len(question_results)
    overall_score = (total_correct / total_answered) if total_answered else 0.0

    grade_breakdown: List[GradeBreakdown] = []
    for grade in sorted(per_grade_total.keys()):
        total = per_grade_total[grade]
        correct = per_grade_correct.get(grade, 0)
        grade_breakdown.append(
            {
                "grade": grade,
                "total": total,
                "correct": correct,
                "accuracy": correct / total if total else 0.0,
            }
        )

    topic_breakdown: List[TopicBreakdown] = []
    for topic in sorted(per_topic_total.keys()):
        total = per_topic_total[topic]
        correct = per_topic_correct.get(topic, 0)
        topic_breakdown.append(
            {
                "topic": topic,
                "total": total,
                "correct": correct,
                "accuracy": round((correct / total if total else 0.0) * 100, 1),
            }
        )

    estimated_grade_level = _estimate_grade_level(grade_breakdown)

    return {
        "estimated_grade_level": estimated_grade_level,
        "overall_score": round(overall_score * 100, 1),
        "total_questions": total_answered,
        "total_correct": total_correct,
        "grade_breakdown": [
            {**g, "accuracy": round(g["accuracy"] * 100, 1)} for g in grade_breakdown
        ],
        "topic_breakdown": topic_breakdown,
        "question_results": question_results,
    }


def _estimate_grade_level(grade_breakdown: List[GradeBreakdown]) -> str:
    if not grade_breakdown:
        return "No data"

    grades_tested = [g["grade"] for g in grade_breakdown]
    lowest_grade = min(grades_tested)
    accuracy_by_grade = {g["grade"]: g["accuracy"] for g in grade_breakdown}

    best_qualified_grade = None

    for grade in sorted(grades_tested):
        meets_mastery = accuracy_by_grade[grade] >= MASTERY_THRESHOLD
        # Check every lower tested grade meets the foundation threshold
        foundation_ok = all(
            accuracy_by_grade[g] >= FOUNDATION_THRESHOLD
            for g in grades_tested
            if g < grade
        )
        if meets_mastery and foundation_ok:
            best_qualified_grade = grade

    if best_qualified_grade is None:
        return f"Below Grade {grade_label(lowest_grade)}"

    highest_tested = max(grades_tested)
    if best_qualified_grade == highest_tested and accuracy_by_grade[highest_tested] >= MASTERY_THRESHOLD:
        return f"Grade {grade_label(best_qualified_grade)}+ (at or above highest level tested)"

    return f"Grade {grade_label(best_qualified_grade)}"
