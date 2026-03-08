import { useMemo } from "react";
import { ACHIEVEMENTS, getUnlocked, type AchievementDef, type UnlockedAchievement } from "@/lib/achievements";
import { Trophy, Lock } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  analysis: "Analysis",
  discovery: "Discovery",
  dedication: "Dedication",
  mastery: "Mastery",
};

const CATEGORY_ORDER = ["analysis", "discovery", "dedication", "mastery"];

function AchievementCard({ def, unlocked }: { def: AchievementDef; unlocked?: UnlockedAchievement }) {
  const isLocked = !unlocked;

  return (
    <div
      className={`relative rounded-lg border p-4 transition-all duration-300 ${
        isLocked
          ? "border-border/40 bg-muted/20 opacity-50 grayscale"
          : "border-primary/30 bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
      }`}
    >
      {/* Glow ring for unlocked */}
      {!isLocked && (
        <div className="absolute inset-0 rounded-lg ring-1 ring-primary/20 animate-pulse pointer-events-none" />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-lg text-2xl shrink-0 ${
            isLocked ? "bg-muted/30" : "bg-primary/10"
          }`}
        >
          {isLocked ? <Lock size={20} className="text-muted-foreground" /> : def.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={`font-heading text-sm font-bold ${
              isLocked ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {def.title}
          </h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5 leading-relaxed">
            {def.description}
          </p>
          {unlocked && (
            <p className="text-[10px] font-mono text-primary mt-1.5">
              Unlocked {new Date(unlocked.unlockedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Achievements() {
  const unlockedList = useMemo(() => getUnlocked(), []);
  const unlockedMap = useMemo(
    () => new Map(unlockedList.map((u) => [u.id, u])),
    [unlockedList]
  );

  const totalUnlocked = unlockedList.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const pct = Math.round((totalUnlocked / totalAchievements) * 100);

  const grouped = useMemo(() => {
    const map: Record<string, AchievementDef[]> = {};
    for (const a of ACHIEVEMENTS) {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    }
    return map;
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/30">
          <Trophy size={28} className="text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Achievements</h2>
          <p className="text-sm font-mono text-muted-foreground">
            {totalUnlocked} / {totalAchievements} unlocked
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs font-mono text-muted-foreground text-right">{pct}% complete</p>
      </div>

      {/* Categories */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items) return null;
        const catUnlocked = items.filter((a) => unlockedMap.has(a.id)).length;
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-bold text-foreground">
                {CATEGORY_LABELS[cat]}
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                {catUnlocked}/{items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((def) => (
                <AchievementCard
                  key={def.id}
                  def={def}
                  unlocked={unlockedMap.get(def.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
