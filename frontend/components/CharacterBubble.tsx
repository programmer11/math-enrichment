import { Volume2, VolumeX } from "lucide-react";
import { Character } from "@/lib/characters";
import { useSpeech } from "@/lib/speech";

interface CharacterBubbleProps {
  character: Character;
  comment: string;
  fontScale?: number;
}

export default function CharacterBubble({ character, comment, fontScale = 1 }: CharacterBubbleProps) {
  const { supported, speaking, speak, stop } = useSpeech();

  return (
    <div
      key={comment}
      className="pop-in"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 26,
      }}
    >
      <span
        style={{
          fontSize: 26,
          lineHeight: 1,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "var(--gold)",
          border: "3px solid var(--ink)",
          transform: "rotate(-4deg)",
        }}
      >
        {character.emoji}
      </span>

      <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
        {/* Comic speech-bubble tail, pointing left toward the avatar */}
        <span
          style={{
            position: "absolute",
            left: -13,
            top: 16,
            width: 0,
            height: 0,
            borderTop: "9px solid transparent",
            borderBottom: "9px solid transparent",
            borderRight: "11px solid var(--ink)",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: -8,
            top: 16,
            width: 0,
            height: 0,
            borderTop: "7px solid transparent",
            borderBottom: "7px solid transparent",
            borderRight: "9px solid var(--card)",
          }}
        />
        <div
          style={{
            background: "var(--card)",
            border: "3px solid var(--ink)",
            borderRadius: "var(--radius-md)",
            boxShadow: "4px 4px 0 var(--ink)",
            padding: "12px 16px",
          }}
        >
          <p
            style={{
              margin: "0 0 2px",
              fontSize: 11.5 * fontScale,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.3,
              color: character.color,
            }}
          >
            {character.name}
          </p>
          <p style={{ margin: 0, fontSize: 14.5 * fontScale, color: "var(--ink)", lineHeight: 1.45, fontWeight: 600 }}>
            {comment}
          </p>
        </div>
      </div>

      {supported && (
        <button
          onClick={() => (speaking ? stop() : speak(comment))}
          aria-label={speaking ? "Stop reading comment aloud" : "Read comment aloud"}
          className="comic-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: speaking ? character.color : "var(--card)",
            color: speaking ? "#fff" : "var(--ink)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      )}
    </div>
  );
}
