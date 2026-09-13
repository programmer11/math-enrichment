import { AnswerMap, AssessmentResult, AttemptSummary, Kid, Question } from "./types";

export async function fetchQuestions(kidId?: number): Promise<Question[]> {
  const url = kidId ? `/api/questions?kid_id=${kidId}` : "/api/questions";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load questions (${res.status})`);
  }
  return res.json();
}

/**
 * Get-or-create a kid profile by name. No password/auth -- this is a
 * lightweight per-kid identity for a family/classroom app so results can
 * be saved and a "welcome back" summary shown on return visits.
 */
export async function createOrGetKid(name: string): Promise<Kid> {
  const res = await fetch("/api/kids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to create kid profile (${res.status})`);
  }

  return res.json();
}

export async function fetchKidHistory(kidId: number): Promise<AttemptSummary[]> {
  const res = await fetch(`/api/kids/${kidId}/history`);
  if (!res.ok) {
    throw new Error(`Failed to load history (${res.status})`);
  }
  return res.json();
}

export async function submitAssessment(
  kidId: number,
  characterId: string | null,
  answers: AnswerMap
): Promise<AssessmentResult> {
  // Backend expects string keys since JSON object keys are always strings.
  const payload = {
    kid_id: kidId,
    character_id: characterId,
    answers: Object.fromEntries(
      Object.entries(answers).map(([id, idx]) => [id, idx])
    ),
  };

  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to submit (${res.status})`);
  }

  return res.json();
}
