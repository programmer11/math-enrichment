import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import {
  Eye,
  Ear,
  Hand,
  PenLine,
  Sparkles,
  ChevronLeft,
  UserRound,
  Accessibility,
  ALargeSmall,
  Contrast,
  Gauge,
  MousePointerClick,
  SpellCheck,
} from "lucide-react";
import { createOrGetKid, fetchQuestions, submitAssessment } from "@/lib/api";
import { AnswerMap, AssessmentResult, Kid, Question } from "@/lib/types";
import { getCharacterById, getCharacterComment, getResultComment } from "@/lib/characters";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import ResultsView from "@/components/ResultsView";
import PreferenceCard from "@/components/PreferenceCard";
import SettingsBar from "@/components/SettingsBar";
import CharacterPicker from "@/components/CharacterPicker";
import CharacterBubble from "@/components/CharacterBubble";

type Stage = "loading" | "intro" | "quiz" | "submitting" | "results" | "error";

const PREFS_KEY = "math-assessment:prefs";
const NAME_KEY = "math-assessment:kid-name";
const OPTION_KEYS = ["1", "2", "3", "4", "a", "b", "c", "d"];

export default function Home() {
  const [stage, setStage] = useState<Stage>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Four format options aligned with the VARK learning-styles model:
  // Visual (diagrams), Auditory (read-aloud), Reading/Writing (notes),
  // Kinesthetic (hands-on/tappable diagrams). Text itself is always on.
  const [showVisuals, setShowVisuals] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [notesEnabled, setNotesEnabled] = useState(false);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [characterId, setCharacterId] = useState<string | null>(null);

  // Accessibility options for special-needs children: low vision, motor
  // impairments, sensory sensitivity (autism/ADHD), and dyslexia/reading
  // difficulty are the main things these address. See README for the
  // full rationale behind each toggle.
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [dyslexiaFriendly, setDyslexiaFriendly] = useState(false);
  const [largeTargets, setLargeTargets] = useState(false);
  const fontScale = largeText ? 1.25 : 1;

  // --- Per-kid identity: no password/auth, just a name-based profile so
  // results can be saved to Postgres and a "welcome back" summary shown. ---
  const [kidName, setKidName] = useState("");
  const [kid, setKid] = useState<Kid | null>(null);
  const resolvedForName = useRef<string | null>(null); // which name `kid` was resolved for
  const [kidLookupStatus, setKidLookupStatus] = useState<"idle" | "checking" | "error">("idle");
  const [startError, setStartError] = useState("");

  const character = getCharacterById(characterId);

  useEffect(() => {
    fetchQuestions()
      .then((qs) => {
        setQuestions(qs);
        setStage("intro");
      })
      .catch((err) => {
        setErrorMessage(err.message || "Could not load questions.");
        setStage("error");
      });

    try {
      const savedPrefs = window.localStorage.getItem(PREFS_KEY);
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (typeof parsed.showVisuals === "boolean") setShowVisuals(parsed.showVisuals);
        if (typeof parsed.audioEnabled === "boolean") setAudioEnabled(parsed.audioEnabled);
        if (typeof parsed.interactiveMode === "boolean") setInteractiveMode(parsed.interactiveMode);
        if (typeof parsed.notesEnabled === "boolean") setNotesEnabled(parsed.notesEnabled);
        if (typeof parsed.characterId === "string") setCharacterId(parsed.characterId);
        if (typeof parsed.largeText === "boolean") setLargeText(parsed.largeText);
        if (typeof parsed.highContrast === "boolean") setHighContrast(parsed.highContrast);
        if (typeof parsed.reduceMotion === "boolean") setReduceMotion(parsed.reduceMotion);
        if (typeof parsed.dyslexiaFriendly === "boolean") setDyslexiaFriendly(parsed.dyslexiaFriendly);
        if (typeof parsed.largeTargets === "boolean") setLargeTargets(parsed.largeTargets);
      }
      const savedName = window.localStorage.getItem(NAME_KEY);
      if (savedName) setKidName(savedName);
    } catch {
      // ignore malformed/missing storage
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          showVisuals,
          audioEnabled,
          interactiveMode,
          notesEnabled,
          characterId,
          largeText,
          highContrast,
          reduceMotion,
          dyslexiaFriendly,
          largeTargets,
        })
      );
    } catch {
      // ignore storage failures (e.g. private browsing)
    }
  }, [
    showVisuals,
    audioEnabled,
    interactiveMode,
    notesEnabled,
    characterId,
    largeText,
    highContrast,
    reduceMotion,
    dyslexiaFriendly,
    largeTargets,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(NAME_KEY, kidName);
    } catch {
      // ignore storage failures
    }
  }, [kidName]);

  // High contrast / reduce motion / dyslexia-friendly spacing all work by
  // toggling a class on <body>, which redefines CSS custom properties
  // that every component already consumes via var(--token) -- see
  // styles/globals.css. No component needs to know these modes exist.
  useEffect(() => {
    document.body.classList.toggle("a11y-high-contrast", highContrast);
  }, [highContrast]);

  useEffect(() => {
    document.body.classList.toggle("a11y-reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.body.classList.toggle("a11y-dyslexia-friendly", dyslexiaFriendly);
  }, [dyslexiaFriendly]);

  function handleNameChange(value: string) {
    setKidName(value);
    setStartError("");
    // A changed name invalidates any previously resolved kid profile.
    if (resolvedForName.current && resolvedForName.current !== value.trim().toLowerCase()) {
      setKid(null);
      resolvedForName.current = null;
    }
  }

  async function resolveKid(name: string): Promise<Kid> {
    const normalized = name.trim().toLowerCase();
    if (kid && resolvedForName.current === normalized) return kid;

    setKidLookupStatus("checking");
    try {
      const resolved = await createOrGetKid(name.trim());
      setKid(resolved);
      resolvedForName.current = normalized;
      setKidLookupStatus("idle");
      return resolved;
    } catch (err) {
      setKidLookupStatus("error");
      throw err;
    }
  }

  async function handleNameBlur() {
    if (!kidName.trim()) return;
    try {
      await resolveKid(kidName);
    } catch {
      // Surfaced via kidLookupStatus; not fatal, they can still try Start.
    }
  }

  async function startQuiz() {
    if (!kidName.trim()) {
      setStartError("Enter your name so we can save your results.");
      return;
    }

    setStartError("");
    let resolvedKid;
    try {
      resolvedKid = await resolveKid(kidName);
    } catch (err: any) {
      setStartError(err.message || "Could not save your profile. Please try again.");
      return;
    }

    // Re-fetch with this kid's id so the sample is drawn preferentially
    // from questions they haven't seen before -- see lib/api.ts and the
    // backend's repository.get_sampled_questions() for why this matters
    // (distinct questions across different kids, and fresh ones on a
    // retake for the same kid).
    try {
      const freshQuestions = await fetchQuestions(resolvedKid.id);
      setQuestions(freshQuestions);
    } catch (err: any) {
      setStartError(err.message || "Could not load questions. Please try again.");
      return;
    }

    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
    setNotes({});
    setStage("quiz");
  }

  function setQuestionNote(questionId: number, value: string) {
    setNotes((prev) => ({ ...prev, [questionId]: value }));
  }

  function selectAnswer(questionId: number, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  function goNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  }

  function goBack() {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }

  async function handleSubmit() {
    if (!kid) {
      setErrorMessage("Missing kid profile -- please restart and enter your name.");
      setStage("error");
      return;
    }
    setStage("submitting");
    try {
      const res = await submitAssessment(kid.id, characterId, answers);
      setResult(res);
      setStage("results");
    } catch (err: any) {
      setErrorMessage(err.message || "Could not submit assessment.");
      setStage("error");
    }
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isLastQuestion = currentIndex === questions.length - 1;

  const characterComment = useMemo(() => {
    if (!character || !currentQuestion) return null;
    return getCharacterComment(character, currentIndex, questions.length, currentQuestion.topic);
  }, [character, currentIndex, questions.length, currentQuestion]);

  const resultComment = useMemo(() => {
    if (!character || !result) return null;
    return getResultComment(character, result.overall_score);
  }, [character, result]);

  const showWelcomeBack = kid && kid.total_attempts > 0 && kid.last_attempt;

  // Keyboard navigation: number/letter keys pick an option, Enter/Right
  // arrow advances, Left arrow goes back. Ignored while typing in the
  // notes textarea or the name field so we don't hijack normal typing --
  // this matters for motor-impaired users who rely on keyboard control
  // instead of a mouse/touchscreen.
  useEffect(() => {
    if (stage !== "quiz" || !currentQuestion) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      const key = e.key.toLowerCase();
      const optionIdx = OPTION_KEYS.indexOf(key) % 4;
      if (OPTION_KEYS.includes(key)) {
        e.preventDefault();
        selectAnswer(currentQuestion.id, optionIdx);
        return;
      }
      if (e.key === "Enter" || e.key === "ArrowRight") {
        if (currentAnswer !== undefined) {
          e.preventDefault();
          goNext();
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentQuestion, currentAnswer]);

  return (
    <>
      <Head>
        <title>Math Proficiency Assessment</title>
        <meta
          name="description"
          content="A short, friendly assessment estimating a student's grade-level math proficiency, with format and accessibility options for every kind of learner, including special needs."
        />
      </Head>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 80px" }}>
        <header style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            className="comic-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--gold)",
              color: "var(--ink)",
              marginBottom: 18,
              transform: "rotate(-6deg)",
            }}
          >
            <Sparkles size={26} strokeWidth={2.5} />
          </div>
          <p
            style={{
              fontSize: 13.5 * fontScale,
              color: "var(--forest)",
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}
          >
            Grade-level math check
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: 32 * fontScale,
              lineHeight: 1.15,
              textTransform: "uppercase",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            Where does your math stand?
          </h1>
        </header>

        {stage === "loading" && (
          <p style={{ textAlign: "center", color: "var(--ink-soft)" }}>Getting things ready&hellip;</p>
        )}

        {stage === "error" && (
          <div
            className="comic-panel"
            style={{
              textAlign: "center",
              padding: 24,
              background: "var(--coral-dim)",
              borderRadius: "var(--radius-lg)",
              color: "var(--coral)",
            }}
          >
            <p style={{ margin: "0 0 6px", fontWeight: 800 }}>Something went wrong</p>
            <p style={{ margin: 0, fontSize: 14 }}>{errorMessage}</p>
          </div>
        )}

        {stage === "intro" && (
          <div
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              padding: "36px 32px",
            }}
            className="pop-in comic-panel"
          >
            <p
              style={{
                fontSize: 15.5 * fontScale,
                color: "var(--ink-soft)",
                lineHeight: 1.6,
                margin: "0 0 28px",
                textAlign: "center",
              }}
            >
              {questions.length} questions spanning Kindergarten through
              Grade 6 &mdash;
              counting and shapes through arithmetic, fractions, decimals,
              ratios, and percentages.
              Kids naturally take in information in different ways, so
              below you can mix and match how this assessment is
              presented &mdash; seeing it, hearing it, writing through it,
              or working it hands-on &mdash; plus accessibility options for
              special needs. There's no time limit, so go at your own pace.
            </p>

            <label
              htmlFor="kid-name"
              style={{ display: "block", fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px" }}
            >
              What's your name?
            </label>
            <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 10px" }}>
              We use this to save your results so you (or a parent/teacher) can see progress over time.
            </p>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <UserRound
                size={17}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }}
              />
              <input
                id="kid-name"
                type="text"
                value={kidName}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="e.g. Alex"
                maxLength={100}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 40px",
                  borderRadius: "var(--radius-md)",
                  border: `2px solid ${startError ? "var(--coral)" : "var(--border)"}`,
                  fontSize: 15 * fontScale,
                  color: "var(--ink)",
                  background: "var(--paper)",
                }}
              />
            </div>

            {kidLookupStatus === "checking" && (
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 20px" }}>Checking&hellip;</p>
            )}
            {startError && (
              <p style={{ fontSize: 12.5, color: "var(--coral)", margin: "0 0 20px" }}>{startError}</p>
            )}
            {showWelcomeBack && kid?.last_attempt && (
              <p
                className="pop-in"
                style={{
                  fontSize: 13,
                  color: "var(--forest)",
                  background: "var(--forest-dim)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  margin: "0 0 20px",
                }}
              >
                Welcome back, {kid.name}! You've taken this {kid.total_attempts}{" "}
                {kid.total_attempts === 1 ? "time" : "times"} before &mdash; last result:{" "}
                {kid.last_attempt.estimated_grade_level} ({kid.last_attempt.overall_score}%).
              </p>
            )}
            {!(kidLookupStatus === "checking") && !startError && !showWelcomeBack && (
              <div style={{ marginBottom: 20 }} />
            )}

            <p style={{ fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px" }}>
              Which study buddy do you want cheering you on today?
            </p>
            <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              Optional &mdash; they'll pop in with encouragement as you go.
            </p>
            <div style={{ marginBottom: 28 }}>
              <CharacterPicker selectedId={characterId} onSelect={setCharacterId} />
            </div>

            <p style={{ fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px" }}>
              How would you like to take it?
            </p>
            <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              These map to the four common learning styles (visual,
              auditory, reading/writing, and kinesthetic) &mdash; pick any
              combination, or none at all.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 30 }}>
              <PreferenceCard
                icon={Eye}
                title="Show visual aids"
                description="See a picture or diagram alongside each question. (Visual)"
                checked={showVisuals}
                onToggle={() => setShowVisuals((v) => !v)}
                color="var(--forest)"
              />
              <PreferenceCard
                icon={Ear}
                title="Read questions aloud"
                description="Have each question and its answer choices read out loud. (Auditory)"
                checked={audioEnabled}
                onToggle={() => setAudioEnabled((v) => !v)}
                color="var(--gold)"
              />
              <PreferenceCard
                icon={PenLine}
                title="Notes while you work"
                description="A scratchpad to jot your thinking for each question. (Reading/Writing)"
                checked={notesEnabled}
                onToggle={() => setNotesEnabled((v) => !v)}
                color="var(--coral)"
              />
              <PreferenceCard
                icon={Hand}
                title="Hands-on diagrams"
                description="Tap and count the pieces in visual aids instead of just looking. (Kinesthetic)"
                checked={interactiveMode}
                onToggle={() => setInteractiveMode((v) => !v)}
                color="var(--forest)"
              />
            </div>

            <p style={{ fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
              <Accessibility size={16} color="var(--forest)" />
              Accessibility options
            </p>
            <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              Extra support for special needs &mdash; low vision, motor
              differences, dyslexia, or sensory sensitivity (e.g. autism or
              ADHD). Turn on any that help; none are required.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 30 }}>
              <PreferenceCard
                icon={ALargeSmall}
                title="Large text"
                description="Bigger text throughout the assessment."
                checked={largeText}
                onToggle={() => setLargeText((v) => !v)}
                color="var(--forest)"
              />
              <PreferenceCard
                icon={Contrast}
                title="High contrast"
                description="Stronger black-and-white contrast for low vision."
                checked={highContrast}
                onToggle={() => setHighContrast((v) => !v)}
                color="var(--gold)"
              />
              <PreferenceCard
                icon={Gauge}
                title="Calm mode"
                description="Turns off animations and motion effects."
                checked={reduceMotion}
                onToggle={() => setReduceMotion((v) => !v)}
                color="var(--coral)"
              />
              <PreferenceCard
                icon={SpellCheck}
                title="Dyslexia-friendly spacing"
                description="Wider letter, word, and line spacing for easier reading."
                checked={dyslexiaFriendly}
                onToggle={() => setDyslexiaFriendly((v) => !v)}
                color="var(--forest)"
              />
              <PreferenceCard
                icon={MousePointerClick}
                title="Big buttons"
                description="Larger buttons and tap targets for easier clicking or tapping."
                checked={largeTargets}
                onToggle={() => setLargeTargets((v) => !v)}
                color="var(--gold)"
              />
            </div>

            <button
              onClick={startQuiz}
              disabled={kidLookupStatus === "checking"}
              className="comic-btn"
              style={{
                display: "block",
                width: "100%",
                padding: "15px 28px",
                borderRadius: "var(--radius-md)",
                background: kidLookupStatus === "checking" ? "var(--ink-faint)" : "var(--forest)",
                color: "#fff",
                fontSize: 16 * fontScale,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                cursor: kidLookupStatus === "checking" ? "not-allowed" : "pointer",
              }}
            >
              Start assessment
            </button>
          </div>
        )}

        {stage === "quiz" && currentQuestion && (
          <div
            className="comic-panel"
            style={{
              background: "var(--card)",
              borderRadius: "var(--radius-lg)",
              padding: "30px 28px 26px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <SettingsBar
                showVisuals={showVisuals}
                audioEnabled={audioEnabled}
                interactiveMode={interactiveMode}
                notesEnabled={notesEnabled}
                largeText={largeText}
                highContrast={highContrast}
                reduceMotion={reduceMotion}
                largeTargets={largeTargets}
                onToggleVisuals={() => setShowVisuals((v) => !v)}
                onToggleAudio={() => setAudioEnabled((v) => !v)}
                onToggleInteractive={() => setInteractiveMode((v) => !v)}
                onToggleNotes={() => setNotesEnabled((v) => !v)}
                onToggleLargeText={() => setLargeText((v) => !v)}
                onToggleHighContrast={() => setHighContrast((v) => !v)}
                onToggleReduceMotion={() => setReduceMotion((v) => !v)}
                onToggleLargeTargets={() => setLargeTargets((v) => !v)}
              />
            </div>

            <ProgressBar current={currentIndex + 1} total={questions.length} fontScale={fontScale} />

            {character && characterComment && (
              <CharacterBubble
                key={characterComment}
                character={character}
                comment={characterComment}
                fontScale={fontScale}
              />
            )}

            <QuestionCard
              question={currentQuestion}
              selectedIndex={currentAnswer}
              onSelect={(idx) => selectAnswer(currentQuestion.id, idx)}
              showVisuals={showVisuals}
              audioEnabled={audioEnabled}
              interactiveMode={interactiveMode}
              notesEnabled={notesEnabled}
              notesValue={notes[currentQuestion.id] || ""}
              onNotesChange={(value) => setQuestionNote(currentQuestion.id, value)}
              fontScale={fontScale}
              largeTargets={largeTargets}
            />

            <p style={{ fontSize: 11.5, color: "var(--ink-faint)", margin: "18px 0 0", textAlign: "center" }}>
              Keyboard: press 1-4 to choose an answer, Enter to continue, ← to go back.
            </p>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
              <button
                onClick={goBack}
                disabled={currentIndex === 0}
                className="comic-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: largeTargets ? "16px 22px" : "12px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--card)",
                  color: currentIndex === 0 ? "var(--ink-faint)" : "var(--ink)",
                  fontSize: 14.5 * fontScale,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  opacity: currentIndex === 0 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={17} />
                Back
              </button>
              <button
                onClick={goNext}
                disabled={currentAnswer === undefined}
                className="comic-btn"
                style={{
                  padding: largeTargets ? "16px 30px" : "12px 26px",
                  borderRadius: "var(--radius-md)",
                  background: currentAnswer === undefined ? "var(--ink-faint)" : "var(--forest)",
                  color: "#fff",
                  fontSize: 14.5 * fontScale,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  cursor: currentAnswer === undefined ? "not-allowed" : "pointer",
                  opacity: currentAnswer === undefined ? 0.6 : 1,
                }}
              >
                {isLastQuestion ? "See my results" : "Next"}
              </button>
            </div>
          </div>
        )}

        {stage === "submitting" && (
          <p style={{ textAlign: "center", color: "var(--ink-soft)" }}>Saving your results&hellip;</p>
        )}

        {stage === "results" && result && (
          <ResultsView
            result={result}
            onRestart={startQuiz}
            character={character}
            resultComment={resultComment}
            fontScale={fontScale}
          />
        )}
      </div>
    </>
  );
}
