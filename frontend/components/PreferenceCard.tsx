import { LucideIcon } from "lucide-react";

interface PreferenceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  color: string;
}

export default function PreferenceCard({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
  color,
}: PreferenceCardProps) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        textAlign: "left",
        padding: "18px 20px",
        borderRadius: "var(--radius-md)",
        border: `3px solid ${checked ? color : "var(--ink)"}`,
        boxShadow: checked ? `4px 4px 0 ${color}` : "3px 3px 0 var(--ink)",
        background: checked ? "var(--card)" : "var(--paper)",
        cursor: "pointer",
        flex: 1,
        minWidth: 220,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: checked ? color : "var(--card)",
          color: checked ? "#fff" : "var(--ink)",
          border: "2px solid var(--ink)",
          flexShrink: 0,
        }}
      >
        <Icon size={22} strokeWidth={2.25} />
      </span>
      <span>
        <span
          style={{
            display: "block",
            fontWeight: 800,
            fontSize: 15.5,
            color: "var(--ink)",
            marginBottom: 3,
          }}
        >
          {title}
        </span>
        <span style={{ display: "block", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.45 }}>
          {description}
        </span>
      </span>
      <span
        style={{
          marginLeft: "auto",
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: `2px solid var(--ink)`,
          background: checked ? color : "transparent",
          flexShrink: 0,
        }}
      />
    </button>
  );
}
