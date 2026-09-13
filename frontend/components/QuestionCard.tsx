import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Question } from "@/lib/types";
import { getTopicMeta } from "@/lib/topicIcons";
import { useSpeech, buildQuestionNarration } from "@/lib/speech";
import VisualAid from "./VisualAid";
import NotesPad from "./NotesPad";

interface QuestionCardProps {
  question: Question;
  selectedIndex: number | undefined;
  onSelect: (index: number) => void;
  showVisuals: boolean;
  audioEnabled: boolean;
  interactiveMode: boolean;
  notesEnabled: boolean;
  notesValue: string;
  onNotesChange: (value: string) => void;
  fontScale?: number;
  largeTargets?: boolean;
}

const LETTERS = ["A", "B", "C", "D"];

export default function QuestionCard({
  question,
  selectedIndex,
  onSelect,
  showVisuals,
  audioEnabled,
  interactiveMode,
  notesEnabled,
  notesValue,
  onNotesChange,
  fontScale = 1,
  largeTargets = false,
}: QuestionCardProps) {
  const { supported, speaking, speak, stop } = useSpeech();
  const { icon: TopicIcon, color: topicColor } = getTopicMeta(question.topic);
  const hasAutoSpoken = useRef<number | null>(null);

  const narration = buildQuestionNarration(question.question, question.options);

  useEffect(() => {
    if (audioEnabled && supported && hasAutoSpoken.current !== question.id) {
      hasAutoSpoken.current = question.id;
      speak(narration);
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, audioEnabled]);

  const buttonPaddingY = largeTargets ? 22 : 16;
  const buttonPaddingX = largeTargets ? 20 : 18;
  const letterSize = largeTargets ? 38 : 30;
  const speakerSize = largeTargets ? 48 : 44;

  return (
    <div key={question.id} className="pop-in">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: "var(--radius-sm)",
            background: topicColor,
            border: "2px solid var(--ink)",
            transform: "rotate(-1.2deg)",
          }}
        >
          <TopicIcon size={14} strokeWidth={2.75} color="#fff" />
          <p
            style={{
              fontSize: 12.5 * fontScale,
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {question.topic}
          </p>
        </div>

        {supported && (
          <button
            onClick={() => (speaking ? stop() : speak(narration))}
            aria-label={speaking ? "Stop reading question aloud" : "Read question aloud"}
            className="comic-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: speakerSize,
              height: speakerSize,
              borderRadius: "50%",
              background: speaking ? "var(--forest)" : "var(--card)",
              color: speaking ? "#fff" : "var(--ink)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </div>

      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: 25 * fontScale,
          lineHeight: 1.35,
          margin: "0 0 22px",
          color: "var(--ink)",
        }}
      >
        {question.question}
      </h2>

      {showVisuals && question.visual && (
        <VisualAid visual={question.visual} interactive={interactiveMode} largeTargets={largeTargets} />
      )}

      {notesEnabled && (
        <NotesPad value={notesValue} onChange={onNotesChange} fontScale={fontScale} />
      )}

      <div
        role="radiogroup"
        aria-label={`Answer choices for: ${question.question}`}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        {question.options.map((option, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <button
              key={idx}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(idx)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                padding: `${buttonPaddingY}px ${buttonPaddingX}px`,
                borderRadius: "var(--radius-md)",
                border: `3px solid ${isSelected ? "var(--forest)" : "var(--ink)"}`,
                boxShadow: isSelected ? "4px 4px 0 var(--forest)" : "4px 4px 0 var(--ink)",
                background: isSelected ? "var(--forest-dim)" : "var(--card)",
                cursor: "pointer",
                fontSize: 17 * fontScale,
                fontWeight: isSelected ? 700 : 600,
                color: "var(--ink)",
                transition: "border-color 150ms ease, background 150ms ease",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: letterSize,
                  height: letterSize,
                  borderRadius: "50%",
                  fontSize: 14 * fontScale,
                  fontWeight: 800,
                  flexShrink: 0,
                  background: isSelected ? "var(--forest)" : "var(--gold)",
                  color: isSelected ? "#fff" : "var(--ink)",
                  border: "2px solid var(--ink)",
                }}
              >
                {LETTERS[idx]}
              </span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
