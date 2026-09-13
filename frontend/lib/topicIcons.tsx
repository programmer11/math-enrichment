import {
  Plus,
  Minus,
  X as XIcon,
  Divide,
  DivideCircle,
  Hash,
  PieChart,
  Percent,
  Scale,
  ArrowLeftRight,
  Square,
  Sigma,
  Calculator,
  ListOrdered,
  GitCompare,
  Shapes,
  Ruler,
  Compass,
  Coins,
  Clock,
  Footprints,
  Shuffle,
  BarChart3,
  Box,
  Repeat,
  MapPin,
  type LucideIcon,
} from "lucide-react";

interface TopicMeta {
  icon: LucideIcon;
  color: string;
}

const TOPIC_MAP: Record<string, TopicMeta> = {
  // Kindergarten
  Counting: { icon: ListOrdered, color: "var(--forest)" },
  "Number Recognition": { icon: Hash, color: "var(--gold)" },
  "Comparing Numbers": { icon: GitCompare, color: "var(--gold)" },
  Shapes: { icon: Shapes, color: "var(--coral)" },
  Patterns: { icon: Repeat, color: "var(--forest)" },
  "Positional Words": { icon: MapPin, color: "var(--coral)" },
  Sorting: { icon: Shuffle, color: "var(--gold)" },
  // Core arithmetic
  Addition: { icon: Plus, color: "var(--forest)" },
  Subtraction: { icon: Minus, color: "var(--coral)" },
  Multiplication: { icon: XIcon, color: "var(--forest)" },
  "Multi-digit Multiplication": { icon: XIcon, color: "var(--forest)" },
  "Early Multiplication": { icon: XIcon, color: "var(--gold)" },
  Division: { icon: Divide, color: "var(--coral)" },
  "Long Division": { icon: Divide, color: "var(--coral)" },
  "Skip Counting": { icon: ListOrdered, color: "var(--coral)" },
  "Place Value": { icon: Hash, color: "var(--gold)" },
  Rounding: { icon: Hash, color: "var(--forest)" },
  // Fractions/decimals/percentages
  Fractions: { icon: PieChart, color: "var(--gold)" },
  "Dividing Fractions": { icon: DivideCircle, color: "var(--coral)" },
  Decimals: { icon: PieChart, color: "var(--coral)" },
  Percentages: { icon: Percent, color: "var(--coral)" },
  "Order of Operations": { icon: Sigma, color: "var(--gold)" },
  "Negative Numbers": { icon: ArrowLeftRight, color: "var(--gold)" },
  Ratios: { icon: Scale, color: "var(--forest)" },
  "Algebraic Expressions": { icon: Sigma, color: "var(--forest)" },
  "Factors and Multiples": { icon: DivideCircle, color: "var(--forest)" },
  // Geometry/measurement
  Area: { icon: Square, color: "var(--forest)" },
  "Area and Perimeter": { icon: Square, color: "var(--forest)" },
  Geometry: { icon: Compass, color: "var(--coral)" },
  Volume: { icon: Box, color: "var(--gold)" },
  Measurement: { icon: Ruler, color: "var(--gold)" },
  "Coordinate Plane": { icon: MapPin, color: "var(--forest)" },
  // Applied / data
  Money: { icon: Coins, color: "var(--gold)" },
  Time: { icon: Clock, color: "var(--forest)" },
  Statistics: { icon: BarChart3, color: "var(--coral)" },
  "Word Problem": { icon: Calculator, color: "var(--gold)" },
};

const DEFAULT_META: TopicMeta = { icon: Calculator, color: "var(--forest)" };

export function getTopicMeta(topic: string): TopicMeta {
  return TOPIC_MAP[topic] ?? DEFAULT_META;
}
