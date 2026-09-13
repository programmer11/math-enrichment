import { AssessmentResult } from "@/lib/types";
import { Character } from "@/lib/characters";
import GradeReveal from "./GradeReveal";
import GradeBreakdownTable from "./GradeBreakdownTable";
import TopicRadarChart from "./TopicRadarChart";
import QuestionReviewList from "./QuestionReviewList";
import CharacterBubble from "./CharacterBubble";

interface ResultsViewProps {
  result: AssessmentResult;
  onRestart: () => void;
  character?: Character | null;
  resultComment?: string | null;
  fontScale?: number;
}

export default function ResultsView({
  result,
  onRestart,
  character,
  resultComment,
  fontScale = 1,
}: ResultsViewProps) {
  return (
    <div className="pop-in">
      <div
        className="comic-panel"
        style={{
          background: "var(--card)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <GradeReveal
          estimatedGradeLevel={result.estimated_grade_level}
          overallScore={result.overall_score}
          totalCorrect={result.total_correct}
          totalQuestions={result.total_questions}
          fontScale={fontScale}
        />
        {character && resultComment && (
          <div style={{ padding: "20px 24px 0" }}>
            <CharacterBubble character={character} comment={resultComment} fontScale={fontScale} />
          </div>
        )}
        <GradeBreakdownTable breakdown={result.grade_breakdown} />
        <TopicRadarChart breakdown={result.topic_breakdown} />
        <QuestionReviewList results={result.question_results} />
      </div>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <button
          onClick={onRestart}
          className="comic-btn"
          style={{
            padding: "13px 26px",
            borderRadius: "var(--radius-md)",
            background: "var(--card)",
            color: "var(--ink)",
            fontSize: 14.5,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.3,
            cursor: "pointer",
          }}
        >
          Take it again
        </button>
      </div>
    </div>
  );
}
