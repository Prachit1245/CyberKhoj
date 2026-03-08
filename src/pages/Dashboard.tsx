import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, Swords, Globe, Copy, Link2, Network, ExternalLink,
  Flame, TrendingUp, Target, Trophy, ChevronRight, Settings2,
} from "lucide-react";
import { getStats, getHistory, type AnalysisRecord } from "@/lib/store";
import { getFindings } from "@/lib/findings";
import { toast } from "@/components/Toast";

/* ── Constants ── */
const GOALS_KEY = "hackmind_monthly_goal";

const STAT_CARDS = [
  { key: "totalAnalyses" as const, label: "Total Analyses", icon: Activity },
  { key: "attackPaths" as const, label: "Attack Paths Generated", icon: Swords },
  { key: "domainsTested" as const, label: "Domains Tested", icon: Globe },
  { key: "payloadsCopied" as const, label: "Payloads Copied", icon: Copy },
];

/* ── Helper: compute streak from history dates ── */
function computeStreak(history: AnalysisRecord[]): number {
  if (history.length === 0) return 0;

  // Parse all dates and deduplicate by day
  const days = new Set<string>();
  for (const h of history) {
    // h.date is a locale date string — try to normalize
    try {
      const d = new Date(h.date);
      if (!isNaN(d.getTime())) {
        days.add(d.toISOString().slice(0, 10));
      }
    } catch {
      // Also try direct ISO parse from date string
    }
  }

  if (days.size === 0) return 0;

  const sorted = [...days].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/* ── Helper: analyses per day (last 7 days) ── */
function analysesPerDay(history: AnalysisRecord[]): { label: string; count: number }[] {
  const days: { label: string; key: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { weekday: "short" });
    days.push({ label, key, count: 0 });
  }

  for (const h of history) {
    try {
      const d = new Date(h.date);
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().slice(0, 10);
        const day = days.find((dd) => dd.key === key);
        if (day) day.count++;
      }
    } catch { /* skip */ }
  }

  return days;
}

/* ── Helper: top domains ── */
function topDomains(history: AnalysisRecord[]): { domain: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const h of history) {
    const d = h.target.split("/")[0] || h.target;
    map[d] = (map[d] || 0) + 1;
  }
  return Object.entries(map)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/* ── Helper: vuln category frequency from result text ── */
const VULN_CATS = ["XSS", "SQLi", "IDOR", "SSRF", "RCE", "CSRF", "Auth Bypass", "LFI", "JWT", "Info Disclosure"];
function vulnCategoryFreq(history: AnalysisRecord[]): { cat: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const cat of VULN_CATS) map[cat] = 0;
  for (const h of history) {
    const text = (h.result || "").toLowerCase();
    for (const cat of VULN_CATS) {
      const re = new RegExp(cat.replace(/\s+/g, "\\s*"), "gi");
      const matches = text.match(re);
      if (matches) map[cat] += matches.length;
    }
  }
  return Object.entries(map)
    .map(([cat, count]) => ({ cat, count }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/* ── Goal helpers ── */
interface MonthlyGoal {
  month: string; // "2026-03"
  target: number;
  type: "analyses" | "findings";
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getGoal(): MonthlyGoal | null {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (!raw) return null;
    const goal: MonthlyGoal = JSON.parse(raw);
    return goal.month === currentMonth() ? goal : null;
  } catch { return null; }
}

function saveGoal(goal: MonthlyGoal) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goal));
}

/* ── Sparkline SVG ── */
function Sparkline({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 280;
  const h = 60;
  const padding = 4;
  const stepX = (w - padding * 2) / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padding + i * stepX,
    y: h - padding - ((d.count / max) * (h - padding * 2)),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(110 100% 55%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(110 100% 55%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sparkGrad)" />
        <path d={linePath} fill="none" stroke="hsl(110 100% 55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(110 100% 55%)" opacity={i === points.length - 1 ? 1 : 0.5} />
        ))}
      </svg>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground/60 px-1">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Circular Progress ── */
function CircularProgress({ value, max, size = 120 }: { value: number; max: number; size?: number }) {
  const pct = Math.min(value / Math.max(max, 1), 1);
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const color = pct >= 1 ? "hsl(110 100% 55%)" : pct >= 0.7 ? "hsl(50 100% 50%)" : "hsl(185 100% 49%)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(0 0% 15%)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold text-foreground">{Math.round(pct * 100)}%</span>
        <span className="text-[9px] font-mono text-muted-foreground">{value}/{max}</span>
      </div>
    </div>
  );
}

/* ── Bar Chart (horizontal) ── */
function VulnBarChart({ data }: { data: { cat: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  if (data.length === 0) {
    return <p className="text-xs font-mono text-muted-foreground/40 italic py-4 text-center">Run some analyses to see category breakdown</p>;
  }
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.cat} className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground w-24 text-right shrink-0 truncate">{d.cat}</span>
          <div className="flex-1 h-4 rounded-full bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/70 transition-all duration-500"
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground w-6 shrink-0">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════ Dashboard ═══════════════════════ */

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = getStats();
  const history = getHistory();
  const recent = history.slice(0, 5);
  const findings = getFindings();
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);

  // Goal state
  const [goal, setGoalState] = useState<MonthlyGoal | null>(() => getGoal());
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalTarget, setGoalTarget] = useState(goal?.target?.toString() || "50");
  const [goalType, setGoalType] = useState<"analyses" | "findings">(goal?.type || "analyses");

  // Computed
  const streak = useMemo(() => computeStreak(history), [history]);
  const perDay = useMemo(() => analysesPerDay(history), [history]);
  const domains = useMemo(() => topDomains(history), [history]);
  const vulnFreq = useMemo(() => vulnCategoryFreq(history), [history]);

  const goalProgress = useMemo(() => {
    if (!goal) return 0;
    if (goal.type === "analyses") {
      return history.filter((h) => {
        try { return new Date(h.date).toISOString().slice(0, 7) === goal.month; } catch { return false; }
      }).length;
    }
    return findings.filter((f) => f.createdAt.slice(0, 7) === goal.month).length;
  }, [goal, history, findings]);

  const handleSaveGoal = () => {
    const t = parseInt(goalTarget);
    if (!t || t < 1) { toast.error("Enter a valid goal number"); return; }
    const g: MonthlyGoal = { month: currentMonth(), target: t, type: goalType };
    saveGoal(g);
    setGoalState(g);
    setGoalEditing(false);
    toast.success("Monthly goal set ✓");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome */}
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">
          Welcome to <span className="text-primary text-glow-primary">HackMind</span>
        </h2>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          Your AI-powered hacking toolkit. All data stays in your browser.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-2 md:space-y-3 hover:border-primary/30 transition-colors">
            <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2">
              <card.icon size={18} className="text-primary" />
            </div>
            <p className="font-heading text-xl md:text-2xl font-bold text-foreground">{stats[card.key].toLocaleString()}</p>
            <p className="text-[10px] md:text-xs font-mono text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ═══ Your Progress + Bug Bounty Goals ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Progress */}
        <div className="lg:col-span-2 space-y-5">
          <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" /> Your Progress
          </h3>

          {/* Streak + Total Paths */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <Flame size={20} className="text-orange-400" />
              <p className="font-heading text-3xl font-bold text-foreground">{streak}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Day Streak {streak > 0 ? "🔥" : ""}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1">
              <Swords size={20} className="text-destructive" />
              <p className="font-heading text-3xl font-bold text-foreground">{stats.attackPaths.toLocaleString()}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Total Attack Paths
              </p>
            </div>
          </div>

          {/* Analyses per day sparkline */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Analyses · Last 7 Days</p>
            <Sparkline data={perDay} />
          </div>

          {/* Vuln category breakdown */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Most Tested Vulnerability Categories</p>
            <VulnBarChart data={vulnFreq} />
          </div>

          {/* Top domains */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Top Domains Analyzed</p>
            {domains.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground/40 italic py-2 text-center">No domains analyzed yet</p>
            ) : (
              <div className="space-y-1.5">
                {domains.map((d, i) => (
                  <div key={d.domain} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground/50 w-4 text-right">{i + 1}.</span>
                    <Globe size={13} className="text-primary shrink-0" />
                    <span className="text-xs font-mono text-foreground flex-1 truncate">{d.domain}</span>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{d.count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Bug Bounty Goals */}
        <div className="space-y-5">
          <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy size={18} className="text-yellow-400" /> Bug Bounty Goals
          </h3>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            {goal && !goalEditing ? (
              <>
                <div className="flex justify-center">
                  <CircularProgress value={goalProgress} max={goal.target} />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-mono text-foreground font-bold">
                    {goalProgress} / {goal.target} {goal.type}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })} goal
                  </p>
                  {goalProgress >= goal.target && (
                    <p className="text-xs font-mono text-primary font-bold animate-fade-in">🎉 Goal reached!</p>
                  )}
                </div>
                <button
                  onClick={() => setGoalEditing(true)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                >
                  <Settings2 size={13} /> Edit Goal
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-mono text-muted-foreground">
                  {goal ? "Update your monthly goal" : "Set a monthly target to stay on track"}
                </p>

                {/* Goal type */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["analyses", "findings"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setGoalType(t)}
                      className={`flex-1 px-3 py-2 text-xs font-mono capitalize transition-all ${
                        goalType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Target number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Monthly Target</label>
                  <input
                    type="number"
                    min={1}
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
                  />
                </div>

                {/* Quick presets */}
                <div className="flex gap-2">
                  {[10, 25, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGoalTarget(String(n))}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-mono transition-colors ${
                        goalTarget === String(n)
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSaveGoal}
                    className="flex-1 rounded-lg bg-primary px-3 py-2.5 text-xs font-heading font-bold text-primary-foreground hover:brightness-110 transition-all"
                  >
                    {goal ? "Update Goal" : "Set Goal"}
                  </button>
                  {goal && (
                    <button
                      onClick={() => setGoalEditing(false)}
                      className="rounded-lg border border-border px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick tips */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Quick Links</p>
            {[
              { label: "Analyze a target", to: "/analyzer", icon: Link2 },
              { label: "Review findings", to: "/findings", icon: Target },
              { label: "Study cheat sheets", to: "/cheatsheets", icon: ChevronRight },
            ].map((l) => (
              <button
                key={l.to}
                onClick={() => navigate(l.to)}
                className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
              >
                <l.icon size={13} className="text-primary" /> {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Analyses */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg font-bold text-foreground">Recent Analyses</h3>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-mono text-muted-foreground">
              No analyses yet. Start by analyzing a URL or domain.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Target</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Paths</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {recent.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className="border-b border-border/30 last:border-0 hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-foreground truncate max-w-[200px]">{record.target}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">{record.type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{record.pathsFound}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{record.date}</td>
                    <td className="px-4 py-3"><ExternalLink size={14} className="text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border/30">
              {recent.map((record) => (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="p-4 hover:bg-primary/5 cursor-pointer transition-colors active:bg-primary/10 min-h-[3.5rem]"
                >
                  <p className="font-mono text-sm text-foreground truncate">{record.target}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">{record.type}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{record.pathsFound} paths</span>
                    <span className="text-[10px] font-mono text-muted-foreground ml-auto">{record.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg font-bold text-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => navigate("/analyzer")} className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all">
            <Link2 size={16} /> Analyze URL
          </button>
          <button onClick={() => navigate("/attack")} className="flex items-center gap-2 rounded-lg border border-secondary px-5 py-2.5 font-heading text-sm font-bold text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all">
            <Swords size={16} /> Attack Mode
          </button>
          <button onClick={() => navigate("/mindmap")} className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
            <Network size={16} /> Open Mind Map
          </button>
        </div>
      </div>

      {/* Result Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedRecord(null); }}
        >
          <div className="w-full max-w-2xl max-h-[80vh] rounded-xl border border-primary/30 bg-card p-6 overflow-y-auto animate-scale-in gate-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Analysis: <span className="text-primary">{selectedRecord.target}</span>
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="text-muted-foreground hover:text-foreground text-sm font-mono">✕</button>
            </div>
            <div className="flex gap-3 mb-4 text-xs font-mono">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">{selectedRecord.type}</span>
              <span className="text-muted-foreground">{selectedRecord.date}</span>
              <span className="text-muted-foreground">{selectedRecord.pathsFound} paths</span>
            </div>
            <pre className="whitespace-pre-wrap text-sm font-mono text-foreground bg-muted/30 rounded-lg p-4 border border-border/50">
              {selectedRecord.result || "No result data available."}
            </pre>
          </div>
        </div>
      )}

      <style>{`
        .gate-card {
          box-shadow: 0 0 40px hsl(110 100% 55% / 0.08), 0 0 80px hsl(110 100% 55% / 0.04);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
