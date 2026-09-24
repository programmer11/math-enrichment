export interface Question {
  id: number;
  grade: number;
  topic: string;
  question: string;
  options: string[];
  visual?: VisualSpec | null;
}

// --- Visual aid specs (mirrors backend `visual` metadata) ---

interface NumberLineSpec {
  type: "number_line";
  min: number;
  max: number;
  step: number;
  marks: { value: number; label: string }[];
  jump?: { from: number; to: number; label: string };
}

interface Base10Spec {
  type: "base10";
  operator: "+" | "-";
  a: { tens: number; ones: number; label: string };
  b: { tens: number; ones: number; label: string };
}

interface PlaceValueSpec {
  type: "place_value";
  number: number;
  highlight: "ones" | "tens" | "hundreds" | "thousands";
}

interface ArrayGridSpec {
  type: "array_grid";
  rows: number;
  cols: number;
  label?: string;
}

interface GroupsSpec {
  type: "groups";
  groupCount: number;
  itemsPerGroup: number;
  itemLabel?: string;
}

interface AreaModelSpec {
  type: "area_model";
  widthParts: number[];
  heightParts: number[];
  label?: string;
}

interface FractionBarsSpec {
  type: "fraction_bars";
  bars: { numerator: number | null; denominator: number; label: string }[];
}

interface DecimalAreaSpec {
  type: "decimal_area";
  a: number;
  b: number;
}

interface PercentGridSpec {
  type: "percent_grid";
  shaded: number;
  label?: string;
}

interface RatioBlocksSpec {
  type: "ratio_blocks";
  ratioA: number;
  ratioB: number;
  labelA: string;
  labelB: string;
  multiplier: number;
}

interface TapeDiagramSpec {
  type: "tape_diagram";
  total: number;
  segments: {
    label: string;
    repeatCount: number;
    color: string;
    isConstant: boolean;
  }[];
}

interface AlgebraTilesSpec {
  type: "algebra_tiles";
  terms: { coeff: number; isConstant: boolean }[];
}

interface ExpressionStepsSpec {
  type: "expression_steps";
  expression: string;
  highlight: string;
}

interface ExponentTowerSpec {
  type: "exponent_tower";
  base: number;
  exponent: number;
}

interface TriangleSquaresSpec {
  type: "triangle_squares";
  legA: number;
  legB: number;
}

interface ShapeRowSpec {
  type: "shape_row";
  shapes: { name: "Circle" | "Square" | "Triangle" | "Rectangle" }[];
}

interface CompareGroupsSpec {
  type: "compare_groups";
  groupA: { count: number; label: string };
  groupB: { count: number; label: string };
}

export type VisualSpec =
  | NumberLineSpec
  | Base10Spec
  | PlaceValueSpec
  | ArrayGridSpec
  | GroupsSpec
  | AreaModelSpec
  | FractionBarsSpec
  | DecimalAreaSpec
  | PercentGridSpec
  | RatioBlocksSpec
  | TapeDiagramSpec
  | AlgebraTilesSpec
  | ExpressionStepsSpec
  | ExponentTowerSpec
  | TriangleSquaresSpec
  | ShapeRowSpec
  | CompareGroupsSpec;

export interface QuestionResult {
  id: number;
  grade: number;
  topic: string;
  question: string;
  options: string[];
  student_answer_index: number;
  correct_index: number;
  is_correct: boolean;
}

export interface GradeBreakdown {
  grade: number;
  total: number;
  correct: number;
  accuracy: number;
}

export interface TopicBreakdown {
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface AssessmentResult {
  estimated_grade_level: string;
  overall_score: number;
  total_questions: number;
  total_correct: number;
  grade_breakdown: GradeBreakdown[];
  topic_breakdown: TopicBreakdown[];
  question_results: QuestionResult[];
}

// question_id -> selected option index
export type AnswerMap = Record<number, number>;

export interface AttemptSummary {
  id: number;
  completed_at: string | null;
  estimated_grade_level: string | null;
  overall_score: number | null;
  total_correct: number | null;
  total_questions: number | null;
}

export interface AvatarConfig {
  avatar_id?: string;
  body: string;
  color: string;
  accessory: string;
  outfit: string;
}

export interface Kid {
  id: number;
  name: string;
  total_attempts: number;
  last_attempt: AttemptSummary | null;
  total_points: number;
  background_id: string;
  avatar: AvatarConfig;
  unlocked_backgrounds: string[];
  token?: string;
}
