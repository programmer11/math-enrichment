import { CheckCircle2, XCircle } from "lucide-react";
import { QuestionResult } from "@/lib/types";
import { getTopicMeta } from "@/lib/topicIcons";
import { formatGrade } from "@/lib/gradeLabel";

interface QuestionReviewListProps {
  results: QuestionResult[];
}

const LETTERS = ["A", "B", "C", "D"];

export default function QuestionReviewList({ results }: QuestionReviewListProps) {
  return (
    <div style={{ padding: "28px 24px" }}>
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
        Question-by-question review
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {results.map((r, i) => {
          const { icon: TopicIcon, color } = getTopicMeta(r.topic);
          return (
            <div
              key={r.id}
              style={{
                padding: "16px 18px",
                borderRadius: "var(--radius-md)",
                border: `2px solid ${r.is_correct ? "var(--ink)" : "var(--coral)"}`,
                boxShadow: r.is_correct ? "3px 3px 0 var(--ink)" : "3px 3px 0 var(--coral)",
                background: r.is_correct ? "var(--card)" : "var(--coral-dim)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                  gap: 12,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-soft)" }}>
                  <TopicIcon size={13} color={color} />
                  Q{i + 1} &middot; Grade {formatGrade(r.grade)} &middot; {r.topic}
                </span>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    color: r.is_correct ? "var(--forest)" : "var(--coral)",
                    flexShrink: 0,
                  }}
                >
                  {r.is_correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {r.is_correct ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 15, color: "var(--ink)" }}>{r.question}</p>
              <div style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>
                <div>
                  Student answer:{" "}
                  <strong style={{ color: "var(--ink)" }}>
                    {LETTERS[r.student_answer_index]}. {r.options[r.student_answer_index]}
                  </strong>
                </div>
                {!r.is_correct && (
                  <div style={{ marginTop: 2 }}>
                    Correct answer:{" "}
                    <strong style={{ color: "var(--forest)" }}>
                      {LETTERS[r.correct_index]}. {r.options[r.correct_index]}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
