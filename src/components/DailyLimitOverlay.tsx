import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Shield, Clock, Target, Route, Globe, X } from "lucide-react";
import { getStats } from "@/lib/store";
import { isOverLimit, DAILY_LIMIT } from "@/lib/usage";

const ASCII_ART = `
    ╔══════════════════════════╗
    ║   ┌─┐                   ║
    ║   │ │  ☕  zzZ           ║
    ║  ┌┘ └┐                  ║
    ║  │ ── │   Taking a      ║
    ║  └┐  ┌┘    break...     ║
    ║   │  │  ┌──────────┐    ║
    ║   │  │  │ ████████ │    ║
    ║   │  │  │ █ HACK █ │    ║
    ║   │  │  │ ████████ │    ║
    ║  ─┘  └─ └──────────┘    ║
    ╚══════════════════════════╝
`;

const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
};

const DailyLimitOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [time, setTime] = useState(getTimeUntilMidnight());
  const stats = getStats();

  // Check limit on mount and periodically
  useEffect(() => {
    const check = () => {
      if (isOverLimit() && !dismissed) setVisible(true);
      else setVisible(false);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [dismissed]);

  // Countdown timer
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => setTime(getTimeUntilMidnight()), 1000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md animate-fade-in">
      {/* Dismiss */}
      <button
        onClick={() => { setDismissed(true); setVisible(false); }}
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
        title="Dismiss"
      >
        <X size={24} />
      </button>

      <div className="max-w-2xl w-full space-y-8 text-center">
        {/* ASCII Art */}
        <pre className="text-primary font-mono text-[10px] sm:text-xs leading-tight mx-auto inline-block text-left opacity-80">
          {ASCII_ART}
        </pre>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
            You've analyzed <span className="text-primary">{DAILY_LIMIT}</span> targets today.
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            That's impressive. Come back when the clock resets.
          </p>
        </div>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-4">
          <Clock size={20} className="text-primary animate-pulse" />
          <div className="flex items-center gap-2 font-mono text-3xl sm:text-4xl font-bold text-foreground tracking-wider">
            <span className="bg-card border border-border rounded-lg px-3 py-2 min-w-[3.5rem]">
              {pad(time.hours)}
            </span>
            <span className="text-primary animate-pulse">:</span>
            <span className="bg-card border border-border rounded-lg px-3 py-2 min-w-[3.5rem]">
              {pad(time.minutes)}
            </span>
            <span className="text-primary animate-pulse">:</span>
            <span className="bg-card border border-border rounded-lg px-3 py-2 min-w-[3.5rem]">
              {pad(time.seconds)}
            </span>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <Target size={18} className="text-primary mx-auto" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.totalAnalyses}</p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Analyses</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <Route size={18} className="text-destructive mx-auto" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.attackPaths}</p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Attack Paths</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-1">
            <Globe size={18} className="text-secondary mx-auto" />
            <p className="font-mono text-2xl font-bold text-foreground">{stats.domainsTested}</p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Domains</p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            While you wait
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/findings"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 font-mono text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <BookOpen size={16} className="text-primary" />
              Review saved findings
            </Link>
            <Link
              to="/cheatsheets"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 font-mono text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <Shield size={16} className="text-secondary" />
              Study cheat sheets
            </Link>
            <Link
              to="/payloads"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 font-mono text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <Shield size={16} className="text-accent" />
              Payload library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyLimitOverlay;
