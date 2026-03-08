/* ── XP & Level System ── */

const XP_KEY = "hackmind_xp";

export interface LevelDef {
  title: string;
  minXp: number;
}

export const LEVELS: LevelDef[] = [
  { title: "Script Kiddie", minXp: 0 },
  { title: "Recon Master", minXp: 500 },
  { title: "Vulnerability Hunter", minXp: 2000 },
  { title: "Bug Bounty Pro", minXp: 5000 },
  { title: "Elite Hacker", minXp: 10000 },
];

export const XP_REWARDS = {
  analysis: 10,
  deepAnalysis: 25,
  payloadCopied: 5,
  findingSaved: 50,
  achievementUnlocked: 100,
} as const;

export function getXp(): number {
  try {
    return parseInt(localStorage.getItem(XP_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function getLevelIndex(xp: number): number {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) { idx = i; break; }
  }
  return idx;
}

export function getLevel(xp: number): LevelDef & { index: number; nextXp: number | null; progress: number } {
  const idx = getLevelIndex(xp);
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const nextXp = next ? next.minXp : null;
  const progress = next
    ? Math.min(((xp - current.minXp) / (next.minXp - current.minXp)) * 100, 100)
    : 100;
  return { ...current, index: idx, nextXp, progress };
}

/** Award XP, returns { newXp, leveledUp, oldLevel, newLevel } */
export function awardXp(amount: number): {
  newXp: number;
  leveledUp: boolean;
  oldLevelIndex: number;
  newLevelIndex: number;
} {
  const oldXp = getXp();
  const oldLevelIndex = getLevelIndex(oldXp);
  const newXp = oldXp + amount;
  localStorage.setItem(XP_KEY, String(newXp));
  const newLevelIndex = getLevelIndex(newXp);
  const leveledUp = newLevelIndex > oldLevelIndex;

  if (leveledUp) {
    window.dispatchEvent(
      new CustomEvent("hackmind:level-up", {
        detail: { level: LEVELS[newLevelIndex], index: newLevelIndex, xp: newXp },
      })
    );
  }

  window.dispatchEvent(
    new CustomEvent("hackmind:xp-changed", { detail: { xp: newXp, amount } })
  );

  return { newXp, leveledUp, oldLevelIndex, newLevelIndex };
}
