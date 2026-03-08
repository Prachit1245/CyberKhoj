import { toast } from "@/components/Toast";

/* ── Types ── */
export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  category: "analysis" | "discovery" | "dedication" | "mastery";
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string; // ISO date
}

/* ── 15 Achievement definitions ── */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_blood", title: "First Blood", description: "Complete your first analysis", icon: "🩸", category: "analysis" },
  { id: "deep_diver", title: "Deep Diver", description: "Run your first deep analysis", icon: "🤿", category: "analysis" },
  { id: "century", title: "Century", description: "Complete 100 total analyses", icon: "💯", category: "dedication" },
  { id: "critical_hunter", title: "Critical Hunter", description: "Discover a critical severity attack path", icon: "🎯", category: "discovery" },
  { id: "mind_mapper", title: "Mind Mapper", description: "Generate your first mind map", icon: "🧠", category: "mastery" },
  { id: "payload_master", title: "Payload Master", description: "Copy 50 payloads from the library", icon: "📋", category: "mastery" },
  { id: "bug_logger", title: "Bug Logger", description: "Save your first finding", icon: "🐛", category: "discovery" },
  { id: "streak_week", title: "Streak Week", description: "Maintain a 7-day analysis streak", icon: "🔥", category: "dedication" },
  { id: "batch_king", title: "Batch King", description: "Run your first batch analysis", icon: "👑", category: "analysis" },
  { id: "jwt_cracker", title: "JWT Cracker", description: "Analyze your first JWT token", icon: "🔐", category: "analysis" },
  { id: "night_owl", title: "Night Owl", description: "Perform an analysis after midnight", icon: "🦉", category: "dedication" },
  { id: "speed_runner", title: "Speed Runner", description: "Complete 10 analyses in a single day", icon: "⚡", category: "dedication" },
  { id: "domain_collector", title: "Domain Collector", description: "Test 10 different domains", icon: "🌐", category: "mastery" },
  { id: "bookworm", title: "Bookworm", description: "Bookmark 10 attack paths", icon: "📚", category: "mastery" },
  { id: "cheat_code", title: "Cheat Code", description: "Visit every cheat sheet category", icon: "🃏", category: "mastery" },
];

const STORAGE_KEY = "hackmind_achievements";

/* ── Read / Write ── */
export function getUnlocked(): UnlockedAchievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveUnlocked(items: UnlockedAchievement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function isUnlocked(id: string): boolean {
  return getUnlocked().some((a) => a.id === id);
}

/* ── Unlock (with toast) ── */
export function unlock(id: string): boolean {
  if (isUnlocked(id)) return false;
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return false;

  const items = getUnlocked();
  items.push({ id, unlockedAt: new Date().toISOString() });
  saveUnlocked(items);

  // Dispatch event so UI can react
  window.dispatchEvent(new CustomEvent("hackmind:achievement-unlocked", { detail: def }));

  // Show celebratory toast
  toast.success(`${def.icon} Achievement Unlocked: ${def.title}`);
  return true;
}

/* ── Check helpers (call these after relevant actions) ── */
export function checkAnalysisAchievements() {
  const stats = JSON.parse(localStorage.getItem("hackmind_stats") || "{}");
  const total = stats.totalAnalyses || 0;

  if (total >= 1) unlock("first_blood");
  if (total >= 100) unlock("century");

  // Night owl
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) unlock("night_owl");

  // Speed runner — count today's analyses
  try {
    const history = JSON.parse(localStorage.getItem("hackmind_history") || "[]");
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = history.filter((h: any) => {
      try { return new Date(h.date || h.createdAt).toISOString().slice(0, 10) === today; } catch { return false; }
    }).length;
    if (todayCount >= 10) unlock("speed_runner");
  } catch { /* ignore */ }

  // Streak check
  checkStreakAchievement();

  // Domain collector
  if ((stats.domainsTested || 0) >= 10) unlock("domain_collector");

  // Payload master
  if ((stats.payloadsCopied || 0) >= 50) unlock("payload_master");
}

export function checkDeepAnalysis() { unlock("deep_diver"); }
export function checkCriticalFound() { unlock("critical_hunter"); }
export function checkMindMap() { unlock("mind_mapper"); }
export function checkBugLogger() { unlock("bug_logger"); }
export function checkBatchAnalysis() { unlock("batch_king"); }
export function checkJwtAnalysis() { unlock("jwt_cracker"); }

export function checkBookmarkAchievement() {
  try {
    const bm = JSON.parse(localStorage.getItem("hackmind_bookmarks") || "[]");
    if (bm.length >= 10) unlock("bookworm");
  } catch { /* ignore */ }
}

function checkStreakAchievement() {
  try {
    const history = JSON.parse(localStorage.getItem("hackmind_history") || "[]");
    if (history.length === 0) return;
    const days = new Set<string>();
    for (const h of history) {
      try { days.add(new Date(h.date || h.createdAt).toISOString().slice(0, 10)); } catch { /* skip */ }
    }
    const sorted = [...days].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      const exp = expected.toISOString().slice(0, 10);
      if (sorted.includes(exp)) streak++;
      else break;
    }
    if (streak >= 7) unlock("streak_week");
  } catch { /* ignore */ }
}
