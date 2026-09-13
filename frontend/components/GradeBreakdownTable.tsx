import { GradeBreakdown } from "@/lib/types";
import { formatGrade } from "@/lib/gradeLabel";

interface GradeBreakdownTableProps {
  breakdown: GradeBreakdown[];
}

export default function GradeBreakdownTable({
  breakdown,
}: GradeBreakdownTableProps) {
  return (
    <div style={{ padding: "28px 24px", borderBottom: "3px solid var(--ink)" }}>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 17,
          textTransform: "uppercase",
          letterSpacing: 0.3,
          margin: "0 0 16px",
        }}
      >
        Accuracy by grade level
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {breakdown.map((g) => (
          <div
            key={g.grade}
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <span
              style={{
                width: 58,
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink-soft)",
                flexShrink: 0,
              }}
            >
              Grade {formatGrade(g.grade)}
            </span>
            <div
              style={{
                flex: 1,
                height: 12,
                background: "var(--paper)",
                border: "2px solid var(--ink)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${g.accuracy}%`,
                  background:
                    g.accuracy >= 70
                      ? "var(--forest)"
                      : g.accuracy >= 50
                      ? "var(--gold)"
                      : "var(--coral)",
                }}
              />
            </div>
            <span
              style={{
                width: 96,
                fontSize: 13,
                color: "var(--ink-soft)",
                textAlign: "right",
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {g.correct}/{g.total} &middot; {g.accuracy}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
