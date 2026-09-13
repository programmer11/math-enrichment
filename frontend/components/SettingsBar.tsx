import { Eye, EyeOff, Volume2, VolumeX, Hand, PenLine, ALargeSmall, Contrast, Gauge, MousePointerClick } from "lucide-react";

interface SettingsBarProps {
  showVisuals: boolean;
  audioEnabled: boolean;
  interactiveMode: boolean;
  notesEnabled: boolean;
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  largeTargets: boolean;
  onToggleVisuals: () => void;
  onToggleAudio: () => void;
  onToggleInteractive: () => void;
  onToggleNotes: () => void;
  onToggleLargeText: () => void;
  onToggleHighContrast: () => void;
  onToggleReduceMotion: () => void;
  onToggleLargeTargets: () => void;
}

export default function SettingsBar({
  showVisuals,
  audioEnabled,
  interactiveMode,
  notesEnabled,
  largeText,
  highContrast,
  reduceMotion,
  largeTargets,
  onToggleVisuals,
  onToggleAudio,
  onToggleInteractive,
  onToggleNotes,
  onToggleLargeText,
  onToggleHighContrast,
  onToggleReduceMotion,
  onToggleLargeTargets,
}: SettingsBarProps) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <ToggleChip active={showVisuals} onClick={onToggleVisuals} icon={showVisuals ? <Eye size={15} /> : <EyeOff size={15} />} label="Visuals" />
      <ToggleChip active={audioEnabled} onClick={onToggleAudio} icon={audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />} label="Audio" />
      <ToggleChip active={interactiveMode} onClick={onToggleInteractive} icon={<Hand size={15} />} label="Hands-on" />
      <ToggleChip active={notesEnabled} onClick={onToggleNotes} icon={<PenLine size={15} />} label="Notes" />
      <ToggleChip active={largeText} onClick={onToggleLargeText} icon={<ALargeSmall size={15} />} label="Large text" />
      <ToggleChip active={highContrast} onClick={onToggleHighContrast} icon={<Contrast size={15} />} label="Contrast" />
      <ToggleChip active={reduceMotion} onClick={onToggleReduceMotion} icon={<Gauge size={15} />} label="Calm mode" />
      <ToggleChip active={largeTargets} onClick={onToggleLargeTargets} icon={<MousePointerClick size={15} />} label="Big buttons" />
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        border: `2px solid ${active ? "var(--forest)" : "var(--ink)"}`,
        background: active ? "var(--forest-dim)" : "var(--card)",
        color: active ? "var(--forest)" : "var(--ink)",
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.2,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}
