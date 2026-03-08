import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap, ChevronRight, CheckCircle2, Circle, Sparkles,
  Target, Zap, ArrowRight,
} from "lucide-react";
import {
  TRACKS, getXP, getLevel, getCompletedSkills, completeSkill,
  getCurrentTrack, getTrackProgress, type Track, type TrackDef,
} from "@/lib/learningPath";
import { getStats } from "@/lib/store";
import { toast } from "@/components/Toast";

/* ── Level-up overlay ── */
function LevelUpAnimation({ level, onDone }: { level: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col items-center gap-4 animate-scale-in">
        <Sparkles size={48} className="text-primary animate-pulse" />
        <p className="font-heading text-4xl font-extrabold text-primary">Level {level}!</p>
        <p className="font-mono text-sm text-muted-foreground">Keep hacking 🔥</p>
      </div>
    </div>
  );
}

/* ── Track Tab ── */
function TrackTab({
  track, isActive, isCurrent, onClick,
}: { track: TrackDef; isActive: boolean; isCurrent: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/30"
          : "text-muted-foreground hover:text-foreground border border-transparent"
      }`}
    >
      <span>{track.icon}</span>
      <span className="font-bold">{track.title}</span>
      {isCurrent && (
        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}

export default function LearningPathCard() {
  const stats = getStats();
  const totalAnalyses = stats.totalAnalyses;
  const currentTrack = getCurrentTrack(totalAnalyses);
  const trackProgress = getTrackProgress(totalAnalyses);

  const [activeTab, setActiveTab] = useState<Track>(currentTrack);
  const [completedSkills, setCompletedSkills] = useState<string[]>(getCompletedSkills);
  const [xp, setXp] = useState(getXP);
  const [levelUp, setLevelUp] = useState<number | null>(null);

  const levelInfo = useMemo(() => getLevel(xp), [xp]);
  const activeTrackDef = TRACKS.find((t) => t.id === activeTab)!;

  const trackCompletedCount = activeTrackDef.skills.filter((s) => completedSkills.includes(s.id)).length;
  const trackTotalSkills = activeTrackDef.skills.length;

  const handleComplete = (skillId: string) => {
    const result = completeSkill(skillId);
    if (!result) return;
    setCompletedSkills(getCompletedSkills());
    setXp(result.newTotal);
    toast.success(`+${result.xpGained} XP earned!`);
    if (result.leveledUp) {
      setLevelUp(getLevel(result.newTotal).level);
    }
  };

  // Next track info
  const nextTrackDef = trackProgress.next ? TRACKS.find((t) => t.id === trackProgress.next) : null;
  const nextTrackThreshold = nextTrackDef?.unlockAt ?? 0;

  return (
    <>
      {levelUp && <LevelUpAnimation level={levelUp} onDone={() => setLevelUp(null)} />}

      <div className="space-y-4">
        <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <GraduationCap size={18} className="text-primary" /> Learning Path
        </h3>

        {/* XP & Level bar */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              <span className="font-heading text-sm font-bold text-foreground">Level {levelInfo.level}</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {xp} XP total
            </span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-muted/50 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700"
              style={{ width: `${Math.min((levelInfo.currentXP / levelInfo.nextLevelXP) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] font-mono text-muted-foreground text-right">
            {levelInfo.currentXP} / {levelInfo.nextLevelXP} XP to level {levelInfo.level + 1}
          </p>
        </div>

        {/* Track progress bar */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              Current Track: <span className="text-foreground font-bold">{TRACKS.find((t) => t.id === currentTrack)?.icon} {TRACKS.find((t) => t.id === currentTrack)?.title}</span>
            </span>
            {nextTrackDef && (
              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <ArrowRight size={10} /> {nextTrackDef.icon} at {nextTrackThreshold} analyses
              </span>
            )}
          </div>
          <div className="relative h-2 w-full rounded-full bg-muted/50 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(trackProgress.progress * 100, 100)}%`,
                backgroundColor: TRACKS.find((t) => t.id === currentTrack)?.color,
              }}
            />
          </div>
          {nextTrackDef && (
            <p className="text-[10px] font-mono text-muted-foreground text-center">
              {totalAnalyses} / {nextTrackThreshold} analyses to unlock {nextTrackDef.title}
            </p>
          )}
        </div>

        {/* Track tabs */}
        <div className="flex gap-2 flex-wrap">
          {TRACKS.map((t) => (
            <TrackTab
              key={t.id}
              track={t}
              isActive={activeTab === t.id}
              isCurrent={currentTrack === t.id}
              onClick={() => setActiveTab(t.id)}
            />
          ))}
        </div>

        {/* Active track details */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-heading text-sm font-bold text-foreground">
                {activeTrackDef.icon} {activeTrackDef.title} Track
              </p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                Depth: <span className="text-foreground">{activeTrackDef.depth}</span> · Focus: {activeTrackDef.categories.join(", ")}
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {trackCompletedCount}/{trackTotalSkills}
            </span>
          </div>

          {/* Mini progress */}
          <div className="relative h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${(trackCompletedCount / trackTotalSkills) * 100}%`,
                backgroundColor: activeTrackDef.color,
              }}
            />
          </div>

          {/* Skill checklist */}
          <div className="space-y-1.5">
            {activeTrackDef.skills.map((skill) => {
              const done = completedSkills.includes(skill.id);
              return (
                <button
                  key={skill.id}
                  onClick={() => !done && handleComplete(skill.id)}
                  disabled={done}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                    done
                      ? "bg-primary/5 opacity-70"
                      : "hover:bg-muted/30 cursor-pointer"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={16} className="text-primary shrink-0" />
                  ) : (
                    <Circle size={16} className="text-muted-foreground/40 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-mono ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {skill.label}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{skill.description}</p>
                  </div>
                  <span className={`text-[10px] font-mono shrink-0 ${done ? "text-primary" : "text-muted-foreground/50"}`}>
                    +{skill.xp} XP
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Suggested targets */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Target size={11} className="text-primary" /> Suggested Targets for {activeTrackDef.title}
          </p>
          {activeTrackDef.suggestedTargets.map((t, i) => (
            <div key={i} className="flex items-start gap-2 text-xs font-mono text-muted-foreground">
              <ChevronRight size={12} className="text-primary shrink-0 mt-0.5" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
