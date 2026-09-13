import { useCallback, useEffect, useRef, useState } from "react";

interface UseSpeechResult {
  supported: boolean;
  speaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

/**
 * Thin wrapper around the browser's built-in SpeechSynthesis API.
 * No backend/audio-file dependency -- works fully client-side wherever
 * the browser supports it (all modern desktop and mobile browsers).
 */
export function useSpeech(): UseSpeechResult {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" && "speechSynthesis" in window
    );
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  return { supported, speaking, speak, stop };
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

/** Builds a natural sentence reading the question and its four options. */
export function buildQuestionNarration(
  question: string,
  options: string[]
): string {
  const optionsText = options
    .map((opt, i) => `${OPTION_LETTERS[i]}. ${opt}`)
    .join(". ");
  return `${question} Your choices are: ${optionsText}.`;
}
