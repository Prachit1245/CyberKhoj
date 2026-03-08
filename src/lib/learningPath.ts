/* ── Learning Path System ── */

const XP_KEY = "hackmind_learning_xp";
const SKILLS_KEY = "hackmind_learning_skills";

export type Track = "beginner" | "intermediate" | "advanced";

export interface Skill {
  id: string;
  track: Track;
  label: string;
  description: string;
  xp: number;
}

export interface TrackDef {
  id: Track;
  title: string;
  icon: string;
  unlockAt: number; // analyses needed
  depth: string;
  categories: string[];
  color: string; // semantic token-friendly
  skills: Skill[];
  suggestedTargets: string[];
}

export const TRACKS: TrackDef[] = [
  {
    id: "beginner",
    title: "Beginner",
    icon: "🌱",
    unlockAt: 0,
    depth: "quick",
    categories: ["IDOR", "XSS", "SQLi"],
    color: "hsl(110 100% 55%)",
    suggestedTargets: [
      "Simple web apps with login forms",
      "Pages with user-controlled URL parameters",
      "Forms that reflect user input",
    ],
    skills: [
      { id: "b1", track: "beginner", label: "Run your first analysis", description: "Analyze any URL or domain", xp: 10 },
      { id: "b2", track: "beginner", label: "Find an XSS path", description: "Get a result containing an XSS attack path", xp: 15 },
      { id: "b3", track: "beginner", label: "Find an SQLi path", description: "Get a result containing an SQL injection path", xp: 15 },
      { id: "b4", track: "beginner", label: "Find an IDOR path", description: "Get a result with an IDOR vulnerability", xp: 15 },
      { id: "b5", track: "beginner", label: "Copy a payload", description: "Copy any payload from the library", xp: 5 },
      { id: "b6", track: "beginner", label: "Bookmark an attack path", description: "Save an interesting path for later", xp: 5 },
      { id: "b7", track: "beginner", label: "Complete 5 analyses", description: "Run 5 total analyses", xp: 20 },
      { id: "b8", track: "beginner", label: "Read a cheat sheet", description: "Visit the cheat sheets page", xp: 10 },
    ],
  },
  {
    id: "intermediate",
    title: "Intermediate",
    icon: "⚔️",
    unlockAt: 25,
    depth: "standard",
    categories: ["IDOR", "XSS", "SQLi", "SSRF", "AuthBypass", "CSRF"],
    color: "hsl(185 100% 49%)",
    suggestedTargets: [
      "APIs with authentication endpoints",
      "Apps with file upload features",
      "Services with internal resource fetching",
    ],
    skills: [
      { id: "i1", track: "intermediate", label: "Run a standard depth scan", description: "Use standard analysis depth", xp: 15 },
      { id: "i2", track: "intermediate", label: "Find an SSRF path", description: "Discover a server-side request forgery vector", xp: 20 },
      { id: "i3", track: "intermediate", label: "Find an Auth Bypass", description: "Discover an authentication bypass path", xp: 20 },
      { id: "i4", track: "intermediate", label: "Analyze an HTTP request", description: "Paste a raw HTTP request for analysis", xp: 15 },
      { id: "i5", track: "intermediate", label: "Log a finding", description: "Save a vulnerability to findings", xp: 15 },
      { id: "i6", track: "intermediate", label: "Test 5 different domains", description: "Analyze across multiple targets", xp: 25 },
      { id: "i7", track: "intermediate", label: "Use batch analysis", description: "Analyze multiple targets at once", xp: 20 },
      { id: "i8", track: "intermediate", label: "Generate a mind map", description: "Visualize attack paths in the mind map", xp: 15 },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    icon: "🔥",
    unlockAt: 100,
    depth: "deep",
    categories: ["All categories"],
    color: "hsl(0 80% 55%)",
    suggestedTargets: [
      "Complex microservice architectures",
      "GraphQL APIs with introspection",
      "JWT-based authentication systems",
    ],
    skills: [
      { id: "a1", track: "advanced", label: "Run a deep analysis", description: "Use the deep analysis depth", xp: 25 },
      { id: "a2", track: "advanced", label: "Analyze a JWT token", description: "Decode and analyze a JWT", xp: 20 },
      { id: "a3", track: "advanced", label: "Find an RCE path", description: "Discover a remote code execution vector", xp: 30 },
      { id: "a4", track: "advanced", label: "Complete 100 analyses", description: "Reach century status", xp: 50 },
      { id: "a5", track: "advanced", label: "7-day analysis streak", description: "Maintain consistency for a week", xp: 40 },
      { id: "a6", track: "advanced", label: "Test 10 domains", description: "Broad reconnaissance across targets", xp: 30 },
      { id: "a7", track: "advanced", label: "Export a report", description: "Export analysis as markdown report", xp: 15 },
      { id: "a8", track: "advanced", label: "Share an analysis", description: "Generate a shareable link", xp: 15 },
    ],
  },
];

/* ── XP & Level ── */
export function getXP(): number {
  try {
    return parseInt(localStorage.getItem(XP_KEY) || "0", 10) || 0;
  } catch { return 0; }
}

export function addXP(amount: number): number {
  const current = getXP();
  const next = current + amount;
  localStorage.setItem(XP_KEY, String(next));
  return next;
}

export function getLevel(xp: number): { level: number; currentXP: number; nextLevelXP: number } {
  // Each level requires progressively more XP: level N needs N*50 XP
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = level * 50;
    if (accumulated + needed > xp) {
      return { level, currentXP: xp - accumulated, nextLevelXP: needed };
    }
    accumulated += needed;
    level++;
  }
}

/* ── Completed Skills ── */
export function getCompletedSkills(): string[] {
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function completeSkill(skillId: string): { xpGained: number; newTotal: number; leveledUp: boolean } | null {
  const completed = getCompletedSkills();
  if (completed.includes(skillId)) return null;

  const allSkills = TRACKS.flatMap((t) => t.skills);
  const skill = allSkills.find((s) => s.id === skillId);
  if (!skill) return null;

  completed.push(skillId);
  localStorage.setItem(SKILLS_KEY, JSON.stringify(completed));

  const oldXP = getXP();
  const oldLevel = getLevel(oldXP).level;
  const newTotal = addXP(skill.xp);
  const newLevel = getLevel(newTotal).level;

  return { xpGained: skill.xp, newTotal, leveledUp: newLevel > oldLevel };
}

/* ── Current Track ── */
export function getCurrentTrack(totalAnalyses: number): Track {
  if (totalAnalyses >= 100) return "advanced";
  if (totalAnalyses >= 25) return "intermediate";
  return "beginner";
}

export function getTrackProgress(totalAnalyses: number): { current: Track; next: Track | null; progress: number } {
  if (totalAnalyses >= 100) return { current: "advanced", next: null, progress: 1 };
  if (totalAnalyses >= 25) return { current: "intermediate", next: "advanced", progress: (totalAnalyses - 25) / 75 };
  return { current: "beginner", next: "intermediate", progress: totalAnalyses / 25 };
}
