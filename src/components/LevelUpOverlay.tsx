import { useEffect, useState } from "react";
import type { LevelDef } from "@/lib/xp";

interface LevelUpEvent {
  level: LevelDef;
  index: number;
  xp: number;
}

export default function LevelUpOverlay() {
  const [data, setData] = useState<LevelUpEvent | null>(null);
  const [phase, setPhase] = useState<"enter" | "show" | "exit" | "idle">("idle");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as LevelUpEvent;
      setData(detail);
      setPhase("enter");

      const t1 = setTimeout(() => setPhase("show"), 300);
      const t2 = setTimeout(() => setPhase("exit"), 3000);
      const t3 = setTimeout(() => {
        setPhase("idle");
        setData(null);
      }, 3600);

      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    };
    window.addEventListener("hackmind:level-up", handler);
    return () => window.removeEventListener("hackmind:level-up", handler);
  }, []);

  if (!data || phase === "idle") return null;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center">
      {/* Radial glow */}
      {phase !== "exit" && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.15)_0%,transparent_70%)] animate-pulse" />
      )}

      <div
        className={`relative rounded-2xl border-2 border-primary/40 bg-card/95 backdrop-blur-xl shadow-[0_0_80px_hsl(var(--primary)/0.25)] px-10 py-8 max-w-sm text-center transition-all duration-500 ${
          phase === "enter"
            ? "scale-50 opacity-0 translate-y-8"
            : phase === "show"
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-90 opacity-0 -translate-y-4"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        <div className="text-4xl mb-2">⚡</div>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary mb-2">
          Level Up!
        </p>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
          {data.level.title}
        </h2>
        <p className="text-xs font-mono text-muted-foreground">
          Level {data.index + 1} • {data.xp.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}
