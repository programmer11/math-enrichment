import { useState } from "react";
import { PenLine, ChevronDown, ChevronUp } from "lucide-react";

interface NotesPadProps {
  value: string;
  onChange: (value: string) => void;
  fontScale?: number;
}

/**
 * A simple per-question scratchpad. Nothing here is graded or sent to
 * the backend -- it's just a place for a Reading/Writing-style learner
 * to jot down their thinking, the way they might on scratch paper.
 * State is owned by the parent (QuestionCard) and reset per question.
 */
export default function NotesPad({ value, onChange, fontScale = 1 }: NotesPadProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      style={{
        border: "3px solid var(--ink)",
        borderRadius: "var(--radius-md)",
        boxShadow: "3px 3px 0 var(--ink)",
        marginBottom: 26,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "10px 14px",
          background: "var(--gold-dim)",
          border: "none",
          cursor: "pointer",
          fontSize: 12.5 * fontScale,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0.3,
          color: "var(--ink)",
        }}
      >
        <PenLine size={15} color="var(--gold)" />
        Jot your thinking
        <span style={{ marginLeft: "auto", color: "var(--ink-soft)" }}>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>
      {expanded && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Work it out here -- write, draw with words, or list your steps..."
          aria-label="Notes for this question (not graded)"
          rows={3}
          style={{
            width: "100%",
            border: "none",
            borderTop: "3px solid var(--ink)",
            padding: "10px 14px",
            fontSize: 14 * fontScale,
            fontFamily: "inherit",
            color: "var(--ink)",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}
    </div>
  );
}
