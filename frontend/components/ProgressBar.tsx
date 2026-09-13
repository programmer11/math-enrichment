interface ProgressBarProps {
  current: number; // 1-indexed
  total: number;
  fontScale?: number;
}

function encouragement(pct: number): string {
  if (pct <= 10) return "Let's go!";
  if (pct < 40) return "Nice and steady.";
  if (pct < 60) return "Halfway there!";
  if (pct < 90) return "Almost done!";
  return "Last one!";
}

export default function ProgressBar({ current, total, fontScale = 1 }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);

  return (
    <div style={{ marginBottom: 28 }}>
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13 * fontScale,
          color: "var(--ink-soft)",
          marginBottom: 8,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>
          Question {current} of {total}
        </span>
        <span style={{ fontWeight: 800, color: "var(--forest)", textTransform: "uppercase", letterSpacing: 0.2 }}>
          {encouragement(pct)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Question ${current} of ${total}`}
        style={{
          height: 12,
          background: "var(--card)",
          border: "2px solid var(--ink)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "var(--forest)",
            borderRadius: 999,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}
