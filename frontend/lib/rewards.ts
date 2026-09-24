import { AvatarConfig } from "./types";

export interface BackgroundOption {
  id: string;
  name: string;
  description: string;
  cost: number;
  color: string;
}

export const BACKGROUNDS: BackgroundOption[] = [
  { id: "paper", name: "Paper", description: "The classic assessment backdrop.", cost: 0, color: "#fff7ec" },
  { id: "space", name: "Space", description: "A starry place to explore.", cost: 200, color: "#172554" },
  { id: "jungle", name: "Jungle", description: "A leafy home for big ideas.", cost: 200, color: "#14532d" },
  { id: "ocean", name: "Ocean", description: "Cool waves and clear thinking.", cost: 200, color: "#075985" },
  { id: "sunset", name: "Sunset", description: "Warm colors for bright work.", cost: 300, color: "#9a3412" },
  { id: "blueprint", name: "Blueprint", description: "Build your next breakthrough.", cost: 300, color: "#1e3a8a" },
  { id: "celebration", name: "Celebration", description: "Bring some confetti energy.", cost: 500, color: "#9f1239" },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  avatar_id: "sunny",
  body: "round",
  color: "blue",
  accessory: "star",
  outfit: "green",
};

export const AVATAR_PRESETS = [
  { id: "sunny", name: "Sunny", emoji: "🌞", color: "#f59e0b" },
  { id: "sprout", name: "Sprout", emoji: "🌱", color: "#16a34a" },
  { id: "rocket", name: "Rocket", emoji: "🚀", color: "#2563eb" },
  { id: "rainbow", name: "Rainbow", emoji: "🌈", color: "#db2777" },
  { id: "mountain", name: "Mountain", emoji: "🏔️", color: "#0f766e" },
  { id: "comet", name: "Comet", emoji: "☄️", color: "#7c3aed" },
];

export const AVATAR_COLORS = ["blue", "coral", "gold", "forest"];
export const AVATAR_ACCESSORIES = ["none", "star", "crown", "glasses"];
