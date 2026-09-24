import { AnswerMap, AssessmentResult, AttemptSummary, AvatarConfig, Kid, Question } from "./types";

const authHeaders = (token?: string) => token ? { Authorization: `Bearer ${token}` } : undefined;

export async function fetchQuestions(kidId?: number, token?: string): Promise<Question[]> {
  const url = kidId ? `/api/questions?kid_id=${kidId}` : "/api/questions";
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`Failed to load questions (${res.status})`);
  }
  return res.json();
}

/**
 * Register a student profile and return its signed bearer token.
 */
export async function createOrGetKid(name: string, password: string): Promise<Kid> {
  const res = await fetch("/api/kids", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to create kid profile (${res.status})`);
  }

  return res.json();
}

export async function loginKid(name: string, password: string): Promise<Kid> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function resetKidPassword(
  adminSecret: string,
  studentName: string,
  newPassword: string
): Promise<string> {
  const res = await fetch("/api/admin/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      admin_secret: adminSecret,
      student_name: studentName,
      new_password: newPassword,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || `Password reset failed (${res.status})`);
  return body.message;
}

export async function fetchCurrentKid(token: string): Promise<Kid> {
  const res = await fetch("/api/me", { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Session expired (${res.status})`);
  return res.json();
}

export async function fetchKidHistory(kidId: number, token: string): Promise<AttemptSummary[]> {
  const res = await fetch(`/api/kids/${kidId}/history`, { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(`Failed to load history (${res.status})`);
  }
  return res.json();
}

export async function updateKidCustomization(
  kidId: number,
  backgroundId: string,
  avatar: AvatarConfig,
  token: string
): Promise<Kid> {
  const res = await fetch(`/api/kids/${kidId}/customization`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ background_id: backgroundId, avatar }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to save customization (${res.status})`);
  }
  return res.json();
}

export async function submitAssessment(
  kidId: number,
  characterId: string | null,
  answers: AnswerMap,
  token: string
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
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to submit (${res.status})`);
  }

  return res.json();
}
