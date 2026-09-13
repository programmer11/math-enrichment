import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { TopicBreakdown } from "@/lib/types";

interface TopicRadarChartProps {
  breakdown: TopicBreakdown[];
}

// Shorten long topic names so the radar labels stay legible on mobile.
function shortLabel(topic: string): string {
  const overrides: Record<string, string> = {
    "Multi-digit Multiplication": "Multi-digit Mult.",
    "Algebraic Expressions": "Algebra",
    "Pythagorean Theorem": "Pythagorean",
    "Order of Operations": "Order of Ops",
    "Negative Numbers": "Negatives",
    "Long Division": "Long Div.",
  };
  return overrides[topic] || topic;
}

export default function TopicRadarChart({ breakdown }: TopicRadarChartProps) {
  if (breakdown.length < 3) return null;

  const data = breakdown.map((t) => ({
    topic: shortLabel(t.topic),
    accuracy: t.accuracy,
  }));

  return (
    <div style={{ padding: "28px 24px", borderBottom: "3px solid var(--ink)" }}>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 17,
          textTransform: "uppercase",
          letterSpacing: 0.3,
          margin: "0 0 4px",
        }}
      >
        Strengths by topic
      </h3>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 8px" }}>
        Each point is the accuracy for that topic's questions.
      </p>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="topic"
              tick={{ fill: "var(--ink-soft)", fontSize: 11 }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Accuracy"
              dataKey="accuracy"
              stroke="var(--forest)"
              fill="var(--forest)"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
