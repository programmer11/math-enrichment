import { AvatarConfig } from "@/lib/types";
import { AVATAR_ACCESSORIES, AVATAR_COLORS, AVATAR_PRESETS } from "@/lib/rewards";

interface AvatarStudioProps {
  avatar: AvatarConfig;
  onChange: (avatar: AvatarConfig) => void;
}

const colorMap: Record<string, string> = {
  blue: "var(--forest)",
  coral: "var(--coral)",
  gold: "var(--gold)",
  forest: "#237a49",
};

export default function AvatarStudio({ avatar, onChange }: AvatarStudioProps) {
  const selectedPreset = AVATAR_PRESETS.find((preset) => preset.id === avatar.avatar_id) || AVATAR_PRESETS[0];

  return (
    <div>
      <div className="avatar-preview" aria-label="Your avatar preview">
        <span className="avatar-face" style={{ background: selectedPreset.color }}>{selectedPreset.emoji}</span>
      </div>
      <p className="section-label">Choose your avatar</p>
      <div className="avatar-preset-grid">
        {AVATAR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`avatar-preset ${(avatar.avatar_id || "sunny") === preset.id ? "selected" : ""}`}
            onClick={() => onChange({ ...avatar, avatar_id: preset.id })}
            aria-label={`Choose ${preset.name} avatar`}
            aria-pressed={(avatar.avatar_id || "sunny") === preset.id}
          >
            <span style={{ background: preset.color }}>{preset.emoji}</span>
            <small>{preset.name}</small>
          </button>
        ))}
      </div>
      <div className="avatar-controls">
        <div>
          <strong>Color</strong>
          <div className="swatch-row">
            {AVATAR_COLORS.map((color) => (
              <button key={color} type="button" className={`color-swatch ${avatar.color === color ? "selected" : ""}`} style={{ background: colorMap[color] }} aria-label={`Use ${color}`} aria-pressed={avatar.color === color} onClick={() => onChange({ ...avatar, color })} />
            ))}
          </div>
        </div>
        <label>
          <strong>Accessory</strong>
          <select value={avatar.accessory} onChange={(event) => onChange({ ...avatar, accessory: event.target.value })}>
            {AVATAR_ACCESSORIES.map((accessory) => <option key={accessory} value={accessory}>{accessory}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
