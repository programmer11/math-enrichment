import { CHARACTERS } from "@/lib/characters";

interface CharacterPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CharacterPicker({ selectedId, onSelect }: CharacterPickerProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
        gap: 10,
      }}
    >
      {CHARACTERS.map((c) => {
        const isSelected = selectedId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            aria-pressed={isSelected}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "14px 8px",
              borderRadius: "var(--radius-md)",
              border: `3px solid ${isSelected ? c.color : "var(--ink)"}`,
              boxShadow: isSelected ? `3px 3px 0 ${c.color}` : "3px 3px 0 var(--ink)",
              background: isSelected ? "var(--card)" : "var(--paper)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 32, lineHeight: 1 }}>{c.emoji}</span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: isSelected ? 800 : 700,
                color: isSelected ? c.color : "var(--ink-soft)",
                textAlign: "center",
                lineHeight: 1.25,
                textTransform: "uppercase",
                letterSpacing: 0.2,
              }}
            >
              {c.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
