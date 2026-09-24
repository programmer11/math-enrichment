import { BACKGROUNDS } from "@/lib/rewards";

interface BackgroundPickerProps {
  selectedId: string;
  totalPoints: number;
  unlockedIds: string[];
  onSelect: (id: string) => void;
}

export default function BackgroundPicker({ selectedId, totalPoints, unlockedIds, onSelect }: BackgroundPickerProps) {
  return (
    <div className="background-grid">
      {BACKGROUNDS.map((background) => {
        const unlocked = unlockedIds.includes(background.id) || (background.cost === 0 && totalPoints >= 0);
        const canAfford = totalPoints >= background.cost;
        return (
          <button key={background.id} type="button" className={`background-option ${selectedId === background.id ? "selected" : ""}`} disabled={!unlocked && !canAfford} onClick={() => onSelect(background.id)}>
            <span className="background-swatch" style={{ background: background.color }} />
            <span><strong>{background.name}</strong><small>{unlocked ? background.description : `${background.cost} points to unlock`}</small></span>
          </button>
        );
      })}
    </div>
  );
}
