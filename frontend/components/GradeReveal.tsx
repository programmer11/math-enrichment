import { Trophy } from "lucide-react";

interface GradeRevealProps {
  estimatedGradeLevel: string;
  overallScore: number;
  totalCorrect: number;
  totalQuestions: number;
  fontScale?: number;
}

function celebrate(score: number): string {
  if (score >= 90) return "Outstanding work!";
  if (score >= 70) return "Great job out there!";
  if (score >= 50) return "Nice effort — keep it up!";
  return "Good start — practice makes progress!";
}

export default function GradeReveal({
  estimatedGradeLevel,
  overallScore,
  totalCorrect,
  totalQuestions,
  fontScale = 1,
}: GradeRevealProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "44px 24px 36px",
        borderBottom: "3px solid var(--ink)",
      }}
    >
      <div
        className="comic-btn"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--gold)",
          color: "var(--ink)",
          marginBottom: 16,
          transform: "rotate(-6deg)",
        }}
      >
        <Trophy size={26} strokeWidth={2.5} />
      </div>
      <p style={{ fontSize: 14 * fontScale, fontWeight: 800, color: "var(--ink-soft)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.2 }}>
        {celebrate(overallScore)}
      </p>
      <p style={{ fontSize: 13 * fontScale, color: "var(--ink-soft)", margin: "0 0 14px" }}>
        Estimated math proficiency
      </p>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: 46 * fontScale,
          lineHeight: 1.15,
          textTransform: "uppercase",
          color: "var(--forest)",
          margin: "0 0 16px",
        }}
      >
        {estimatedGradeLevel}
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 15 * fontScale, margin: 0, fontWeight: 600 }}>
        {totalCorrect} of {totalQuestions} correct &middot; {overallScore}% overall
      </p>
    </div>
  );
}
