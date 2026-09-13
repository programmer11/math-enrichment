/**
 * Study-buddy characters shown during the assessment.
 *
 * These are original mascots created for this app (not existing media
 * characters) so there's no third-party IP involved. Each has a short
 * comment bank: a greeting, a few milestone lines, and a "voice" wrapper
 * applied to generic topic-flavor lines so every character sounds
 * distinct without needing a huge hand-written matrix.
 *
 * IMPORTANT: comments are encouragement/flavor only -- they never reveal
 * whether an answer was correct, to keep the assessment meaningful.
 */

export interface Character {
  id: string;
  name: string;
  emoji: string;
  color: string;
  greeting: string;
  milestones: {
    start: string;
    quarter: string;
    half: string;
    threeQuarter: string;
    last: string;
  };
  results: {
    high: string; // overall score >= 80
    mid: string; // 50-79
    low: string; // < 50
  };
  wrap: (line: string) => string;
}

export const CHARACTERS: Character[] = [
  {
    id: "terra",
    name: "Terra the Dinosaur",
    emoji: "🦕",
    color: "var(--forest)",
    greeting: "Rawr! I'm Terra, and I'll be stomping alongside you today. Let's go!",
    milestones: {
      start: "Here we go — let's warm up those math muscles!",
      quarter: "Great start — roar-some work so far!",
      half: "Halfway through the numbers jungle. Keep stomping!",
      threeQuarter: "Almost at the finish line — I can see it from here!",
      last: "Last one! Give it your best roar!",
    },
    results: {
      high: "You stomped through that like a dino on a mission. Incredible work!",
      mid: "Solid effort out there — every dinosaur has to practice their roar!",
      low: "Nice try! Even the biggest dinosaurs started small. Keep practicing and you'll grow strong.",
    },
    wrap: (line) => `Rawr! ${line}`,
  },
  {
    id: "nova",
    name: "Nova the Astronaut",
    emoji: "🚀",
    color: "var(--gold)",
    greeting: "Hi, I'm Nova! Ready to blast off into some math? Let's launch!",
    milestones: {
      start: "Countdown complete — let's blast off!",
      quarter: "Great trajectory so far — full speed ahead!",
      half: "Halfway to orbit! You're doing awesome.",
      threeQuarter: "Almost back to base — final approach!",
      last: "Last question — bring it home like a pro pilot!",
    },
    results: {
      high: "Mission accomplished — you're a true math astronaut! Stellar work.",
      mid: "Great flight overall! A little more fuel and you'll reach new heights.",
      low: "Good first mission! Every astronaut trains a lot before their big flight. Onward!",
    },
    wrap: (line) => `${line} Blast off!`,
  },
  {
    id: "marble",
    name: "Marble the Unicorn",
    emoji: "🦄",
    color: "var(--coral)",
    greeting: "Hello there! I'm Marble, and I'll sprinkle a little sparkle on your math today!",
    milestones: {
      start: "Let's make some magic happen!",
      quarter: "Sparkling start — keep it up!",
      half: "Halfway through and shining bright!",
      threeQuarter: "So close now — the magic is almost complete!",
      last: "One more question and the spell is complete!",
    },
    results: {
      high: "Pure magic! You lit up every question. Wonderful work!",
      mid: "Lovely effort — your sparkle is growing brighter every day!",
      low: "Every bit of magic takes practice. You're on your way — keep believing in yourself!",
    },
    wrap: (line) => `✨ ${line} ✨`,
  },
  {
    id: "ziggy",
    name: "Ziggy the Robot",
    emoji: "🤖",
    color: "var(--forest)",
    greeting: "Beep boop! Ziggy online. Initiating math assessment mode with you!",
    milestones: {
      start: "Systems ready. Let's compute!",
      quarter: "Processing... great progress detected!",
      half: "Halfway through my calculations — you're doing great!",
      threeQuarter: "Almost done. Battery at maximum enthusiasm!",
      last: "Final question loading. You've got this!",
    },
    results: {
      high: "Analysis complete: performance rating excellent! Beep boop, well done!",
      mid: "Analysis complete: solid performance detected. A few upgrades and you'll be unstoppable!",
      low: "Analysis complete: good first data set collected. More practice will boost your stats!",
    },
    wrap: (line) => `Beep boop! ${line}`,
  },
  {
    id: "compass",
    name: "Captain Compass",
    emoji: "🏴‍☠️",
    color: "var(--gold)",
    greeting: "Ahoy! Captain Compass here to guide you through these mathematical waters!",
    milestones: {
      start: "Anchors aweigh — let's set sail!",
      quarter: "Smooth sailing so far, matey!",
      half: "Halfway across the sea of numbers!",
      threeQuarter: "Land ho! We're almost there!",
      last: "Final stretch — steady the ship for the last question!",
    },
    results: {
      high: "Shiver me timbers, you found the treasure! Outstanding voyage!",
      mid: "A fine voyage overall! A bit more practice and you'll sail like a true captain.",
      low: "Every great sailor starts as a deckhand. Keep charting your course — you'll get there!",
    },
    wrap: (line) => `Arrr, ${line}`,
  },
  {
    id: "fern",
    name: "Fern the Fox",
    emoji: "🦊",
    color: "var(--coral)",
    greeting: "Hey there, I'm Fern! Foxes are clever, and I bet you are too. Let's find out!",
    milestones: {
      start: "Let's use those clever fox instincts!",
      quarter: "Sharp thinking so far — keep it up!",
      half: "Halfway there, and still just as sly and smart!",
      threeQuarter: "Almost through the woods — nearly there!",
      last: "Last question — time for your cleverest move yet!",
    },
    results: {
      high: "Foxy and brilliant! You outsmarted every question. Amazing work!",
      mid: "Clever effort! A little more practice and you'll be as sharp as they come.",
      low: "Good instincts! Even the cleverest foxes practice their moves. Keep at it!",
    },
    wrap: (line) => `${line} Sly and smart!`,
  },
];

export function getCharacterById(id: string | null): Character | null {
  if (!id) return null;
  return CHARACTERS.find((c) => c.id === id) ?? null;
}

// Generic, character-agnostic topic flavor lines. Never reveal an
// answer -- just frame the underlying math idea in a friendly way.
const TOPIC_FLAVOR: Record<string, string> = {
  Counting: "counting just means saying how many things are in a group.",
  "Number Recognition": "every number has its own special look -- get to know its shape.",
  "Comparing Numbers": "comparing numbers is figuring out which pile has more.",
  Shapes: "every shape has its own special number of sides and corners.",
  Patterns: "patterns are just something repeating in a way you can predict.",
  "Positional Words": "words like above, below, and next to tell you exactly where something is.",
  Sorting: "sorting means figuring out what things have in common.",
  Addition: "adding is just putting two piles together.",
  Subtraction: "subtracting is like sharing away part of your snack stash.",
  "Place Value": "every digit has its own special spot to stand in.",
  Multiplication: "multiplying is just fast repeated addition.",
  "Early Multiplication": "grouping things evenly is the first step toward multiplying.",
  Division: "dividing means sharing fairly between friends.",
  "Word Problem": "word problems are just stories hiding a math question.",
  "Multi-digit Multiplication": "big multiplication just means breaking numbers into friendly chunks.",
  "Long Division": "long division is sharing a big pile into equal groups, one step at a time.",
  "Skip Counting": "skip counting is counting by jumps instead of one at a time.",
  Fractions: "fractions are all about fair, equal slices.",
  "Dividing Fractions": "dividing fractions just flips one fraction and multiplies.",
  Rounding: "rounding just means finding the closest friendly number.",
  Decimals: "decimals are fractions wearing a little dot instead of a slash.",
  "Order of Operations": "order of operations is like a recipe -- some steps come first.",
  Ratios: "ratios compare two amounts, like flour and sugar in a recipe.",
  Percentages: "percent just means 'out of 100' -- like a grade on a test.",
  "Negative Numbers": "negative numbers live on the other side of zero.",
  "Algebraic Expressions": "letters like x are just numbers wearing a disguise.",
  "Factors and Multiples": "factors and multiples are just two sides of the same multiplication.",
  Area: "area tells you how much space is inside a shape.",
  "Area and Perimeter": "area is the space inside a shape, perimeter is the fence around it.",
  Geometry: "geometry is all about shapes, angles, and the space they take up.",
  Volume: "volume tells you how much space is inside a 3D shape.",
  Measurement: "measuring is just comparing something to a known unit.",
  "Coordinate Plane": "a coordinate pair is just an address for a point on a grid.",
  Money: "counting money is just adding up the value of each coin or bill.",
  Time: "telling time is reading how far the hands have traveled around the clock.",
  Statistics: "statistics help you find the story hiding inside a pile of numbers.",
};

/**
 * Returns the comment a character should say for the given position in
 * the quiz. Milestone lines take priority at the start/quarter/half/
 * three-quarter/last question; everything in between gets a topic-
 * flavored line in the character's voice.
 */
export function getCharacterComment(
  character: Character,
  questionIndex: number, // 0-indexed
  totalQuestions: number,
  topic: string
): string {
  const quarterIdx = Math.floor(totalQuestions * 0.25);
  const halfIdx = Math.floor(totalQuestions * 0.5);
  const threeQuarterIdx = Math.floor(totalQuestions * 0.75);
  const lastIdx = totalQuestions - 1;

  if (questionIndex === 0) return character.milestones.start;
  if (questionIndex === lastIdx) return character.milestones.last;
  if (questionIndex === threeQuarterIdx) return character.milestones.threeQuarter;
  if (questionIndex === halfIdx) return character.milestones.half;
  if (questionIndex === quarterIdx) return character.milestones.quarter;

  const flavor = TOPIC_FLAVOR[topic] ?? "you're thinking it through step by step -- nice work.";
  return character.wrap(flavor);
}

export function getResultComment(character: Character, overallScore: number): string {
  if (overallScore >= 80) return character.results.high;
  if (overallScore >= 50) return character.results.mid;
  return character.results.low;
}
