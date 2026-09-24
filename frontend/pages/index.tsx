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
import { createOrGetKid, fetchCurrentKid, fetchQuestions, loginKid, resetKidPassword, submitAssessment, updateKidCustomization } from "@/lib/api";
import { AnswerMap, AssessmentResult, AvatarConfig, Kid, Question } from "@/lib/types";
import { getCharacterById, getCharacterComment, getResultComment } from "@/lib/characters";
import { DEFAULT_AVATAR } from "@/lib/rewards";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import ResultsView from "@/components/ResultsView";
import PreferenceCard from "@/components/PreferenceCard";
import SettingsBar from "@/components/SettingsBar";
import CharacterPicker from "@/components/CharacterPicker";
import CharacterBubble from "@/components/CharacterBubble";
import AvatarStudio from "@/components/AvatarStudio";
import BackgroundPicker from "@/components/BackgroundPicker";

type Stage = "loading" | "intro" | "quiz" | "submitting" | "results" | "error";

const PREFS_KEY = "math-assessment:prefs";
const NAME_KEY = "math-assessment:kid-name";
const TOKEN_KEY = "math-assessment:auth-token";
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
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [funTab, setFunTab] = useState<"avatar" | "background">("avatar");
  const [backgroundId, setBackgroundId] = useState("paper");
  const [avatar, setAvatar] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [customizationStatus, setCustomizationStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"register" | "login" | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [kid, setKid] = useState<Kid | null>(null);
  const resolvedForName = useRef<string | null>(null); // which name `kid` was resolved for
  const [kidLookupStatus, setKidLookupStatus] = useState<"idle" | "checking" | "error">("idle");
  const [startError, setStartError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [resetStudentName, setResetStudentName] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");

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
      const savedToken = window.localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        setAuthToken(savedToken);
        fetchCurrentKid(savedToken).then((resolved) => {
          setAuthMode("login");
          setAuthReady(true);
          setKid(resolved);
          setKidName(resolved.name);
          setBackgroundId(resolved.background_id);
          setAvatar(resolved.avatar);
          setCustomizationOpen(true);
          resolvedForName.current = resolved.name.trim().toLowerCase();
        }).catch(() => window.localStorage.removeItem(TOKEN_KEY));
      }
    } catch {
      // ignore malformed/missing storage
    }
  }, []);

  useEffect(() => {
    try {
      if (authToken) window.localStorage.setItem(TOKEN_KEY, authToken);
      else window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore storage failures
    }
  }, [authToken]);

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
    if (!authMode) throw new Error("Choose New Student or Existing Student first.");

    setKidLookupStatus("checking");
    try {
      const resolved = authMode === "register"
        ? await createOrGetKid(name.trim(), password)
        : await loginKid(name.trim(), password);
      if (!resolved.token) throw new Error("Authentication token missing.");
      setAuthToken(resolved.token);
      setKid(resolved);
      setAuthReady(true);
      setBackgroundId(resolved.background_id);
      setAvatar(resolved.avatar);
      setCustomizationOpen(true);
      resolvedForName.current = normalized;
      setKidLookupStatus("idle");
      return resolved;
    } catch (err) {
      setAuthReady(false);
      setKidLookupStatus("error");
      throw err;
    }
  }

  async function handleAuthContinue() {
    if (!authMode) return;
    if (!kidName.trim()) {
      setStartError("Enter a student name first.");
      return;
    }
    if (!password) {
      setStartError(authMode === "register" ? "Create a password first." : "Enter your password first.");
      return;
    }
    setStartError("");
    try {
      await resolveKid(kidName);
    } catch (err: any) {
      const message = err.message || "Could not continue. Please check your details.";
      if (message.includes("already registered")) {
        setAuthMode("login");
        setStartError("This username already exists, so we switched you to Login. Press Login to continue.");
      } else {
        setStartError(message);
      }
    }
  }

  async function saveCustomization(
    nextBackgroundId = backgroundId,
    nextAvatar = avatar
  ) {
    if (!kid) return;
    setCustomizationStatus("saving");
    try {
      const updated = await updateKidCustomization(kid.id, nextBackgroundId, nextAvatar, authToken);
      setKid(updated);
      setBackgroundId(updated.background_id);
      setAvatar(updated.avatar);
      setCustomizationStatus("saved");
    } catch (err: any) {
      setCustomizationStatus("error");
      setStartError(err.message || "Could not save your customization.");
    }
  }

  function handleAvatarChange(nextAvatar: AvatarConfig) {
    setAvatar(nextAvatar);
    setCustomizationStatus("idle");
    void saveCustomization(backgroundId, nextAvatar);
  }

  function handleBackgroundChange(nextBackgroundId: string) {
    setBackgroundId(nextBackgroundId);
    setCustomizationStatus("idle");
    void saveCustomization(nextBackgroundId, avatar);
  }

  async function handleAdminReset() {
    setResetMessage("");
    try {
      const message = await resetKidPassword(adminSecret, resetStudentName, resetPassword);
      setResetMessage(message);
      setAdminSecret("");
      setResetPassword("");
    } catch (err: any) {
      setResetMessage(err.message || "Could not reset the password.");
    }
  }

  async function startQuiz() {
    if (!authMode) {
      setStartError("Choose New Student or Existing Student first.");
      return;
    }
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
      const freshQuestions = await fetchQuestions(resolvedKid.id, authToken || resolvedKid.token || "");
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
      const res = await submitAssessment(kid.id, characterId, answers, authToken);
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

      <div className={`app-shell background-${backgroundId}`} style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 80px" }}>
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

            {!authMode && (
              <div className="auth-choice-panel">
                <p className="section-label">How are you starting?</p>
                <button type="button" className="auth-choice-button" onClick={() => setAuthMode("register")}>
                  <strong>New Student? Create an account</strong>
                  <small>Set up a name and password to save your progress.</small>
                </button>
                <button type="button" className="auth-choice-button" onClick={() => setAuthMode("login")}>
                  <strong>Existing Student? Login</strong>
                  <small>Continue with your existing name and password.</small>
                </button>
              </div>
            )}

            {authMode && !authReady && <>
              <button type="button" className="auth-back-button" onClick={() => { setAuthMode(null); setKid(null); setAuthToken(""); setPassword(""); resolvedForName.current = null; setStartError(""); }}>
                ← Choose a different option
              </button>
              <label
                htmlFor="kid-name"
                style={{ display: "block", fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px" }}
              >
                Student name
              </label>
              <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                {authMode === "register" ? "Choose a name to save your results and rewards." : "Enter the name used when the account was created."}
              </p>
              <div style={{ position: "relative", marginBottom: 8 }}>
                <UserRound size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-soft)" }} />
                <input id="kid-name" type="text" value={kidName} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Alex" maxLength={100} style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: "var(--radius-md)", border: `2px solid ${startError ? "var(--coral)" : "var(--border)"}`, fontSize: 15 * fontScale, color: "var(--ink)", background: "var(--paper)" }} />
              </div>

              <label htmlFor="kid-password" style={{ display: "block", fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "12px 0 4px" }}>
                {authMode === "register" ? "Create a password" : "Password"}
              </label>
              <input id="kid-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={authMode === "register" ? "At least 8 characters" : "Enter your password"} minLength={authMode === "register" ? 8 : 1} maxLength={128} style={{ width: "100%", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "2px solid var(--border)", fontSize: 15 * fontScale, color: "var(--ink)", background: "var(--paper)" }} />

              <button type="button" className="auth-go-button comic-btn" onClick={() => void handleAuthContinue()} disabled={kidLookupStatus === "checking" || !kidName.trim() || !password}>
                {kidLookupStatus === "checking" ? "Checking..." : authMode === "login" ? "Login" : "Create account"}
              </button>

              {authMode === "login" && <>
                <button type="button" onClick={() => setResetOpen((open) => !open)} aria-expanded={resetOpen} style={{ display: "block", margin: "12px 0", padding: 0, border: 0, background: "transparent", color: "var(--ink-soft)", fontSize: 12.5 * fontScale, fontWeight: 700, cursor: "pointer" }}>
                  {resetOpen ? "Hide teacher reset" : "Teacher / admin password reset"}
                </button>
              </>}
            </>}
            {authReady && kid && (
              <div className="signed-in-panel">
                <div>
                  <strong>Signed in as {kid.name}</strong>
                  <small>Your progress and rewards are saved.</small>
                </div>
                <button
                  type="button"
                  className="signed-in-logout"
                  onClick={() => {
                    setAuthReady(false);
                    setAuthMode(null);
                    setKid(null);
                    setAuthToken("");
                    setPassword("");
                    setCustomizationOpen(false);
                    resolvedForName.current = null;
                    setStartError("");
                  }}
                >
                  Log out
                </button>
              </div>
            )}
            {resetOpen && !authReady && (
              <div className="teacher-reset-panel pop-in">
                <strong>Reset a student password</strong>
                <p>Use the private teacher reset key configured for this app. Student progress and rewards stay intact.</p>
                <input type="text" value={resetStudentName} onChange={(e) => setResetStudentName(e.target.value)} placeholder="Student name" aria-label="Student name to reset" />
                <input type="password" value={adminSecret} onChange={(e) => setAdminSecret(e.target.value)} placeholder="Teacher reset key" aria-label="Teacher reset key" />
                <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="New password (8+ characters)" minLength={8} maxLength={128} aria-label="New student password" />
                <button type="button" className="comic-btn teacher-reset-button" onClick={() => void handleAdminReset()} disabled={!resetStudentName || !adminSecret || resetPassword.length < 8}>Reset password</button>
                {resetMessage && <p className="teacher-reset-message">{resetMessage}</p>}
              </div>
            )}

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

            {authReady && <p style={{ fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px" }}>
              Which study buddy do you want cheering you on today?
            </p>}
            {authReady && <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              Optional &mdash; they'll pop in with encouragement as you go.
            </p>}
            {authReady && <div style={{ marginBottom: 28 }}>
              <CharacterPicker selectedId={characterId} onSelect={setCharacterId} />
            </div>}

            {authReady && kid && <div className="locker-section">
              <button type="button" className="locker-toggle" onClick={() => setCustomizationOpen((open) => !open)} aria-expanded={customizationOpen}>
                <span><strong>Fun zone</strong><small>{kid.total_points} points available · customize your look</small></span>
                <span aria-hidden="true">{customizationOpen ? "−" : "+"}</span>
              </button>
              {customizationOpen && (
                <div className="locker-content pop-in">
                  <div className="fun-tabs" role="tablist" aria-label="Fun zone customization">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={funTab === "avatar"}
                      className={`fun-tab ${funTab === "avatar" ? "selected" : ""}`}
                      onClick={() => setFunTab("avatar")}
                    >
                      Avatar
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={funTab === "background"}
                      className={`fun-tab ${funTab === "background" ? "selected" : ""}`}
                      onClick={() => setFunTab("background")}
                    >
                      Background Image
                    </button>
                  </div>
                  {funTab === "avatar" && <div role="tabpanel" aria-label="Avatar choices">
                    <AvatarStudio avatar={avatar} onChange={handleAvatarChange} />
                  </div>}
                  {funTab === "background" && <div role="tabpanel" aria-label="Background image choices">
                    <p className="section-label">Choose a background image</p>
                    <BackgroundPicker selectedId={backgroundId} totalPoints={kid.total_points} unlockedIds={kid.unlocked_backgrounds} onSelect={handleBackgroundChange} />
                  </div>
                  }
                  <div className="locker-save-row">
                    <button type="button" className="comic-btn locker-save" onClick={() => void saveCustomization()} disabled={!kid || customizationStatus === "saving"}>
                      {customizationStatus === "saving" ? "Saving..." : "Save my look"}
                    </button>
                    {customizationStatus === "saved" && <span className="locker-save-status success" role="status">Saved!</span>}
                    {customizationStatus === "error" && <span className="locker-save-status error" role="alert">Could not save. Try again.</span>}
                  </div>
                </div>
              )}
            </div>}

            {authReady && <p style={{ fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px" }}>
              How would you like to take it?
            </p>}
            {authReady && <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              These map to the four common learning styles (visual,
              auditory, reading/writing, and kinesthetic) &mdash; pick any
              combination, or none at all.
            </p>}
            {authReady && <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 30 }}>
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
            </div>}

            {authReady && <p style={{ fontSize: 13.5 * fontScale, fontWeight: 800, color: "var(--ink)", textTransform: "uppercase", letterSpacing: 0.3, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
              <Accessibility size={16} color="var(--forest)" />
              Accessibility options
            </p>}
            {authReady && <p style={{ fontSize: 12.5 * fontScale, color: "var(--ink-soft)", margin: "0 0 12px" }}>
              Extra support for special needs &mdash; low vision, motor
              differences, dyslexia, or sensory sensitivity (e.g. autism or
              ADHD). Turn on any that help; none are required.
            </p>}
            {authReady && <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 30 }}>
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
            </div>}

            {authReady && <button
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
            </button>}
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
