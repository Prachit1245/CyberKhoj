import { useEffect, useState, useCallback, useRef } from "react";
import type { AchievementDef } from "@/lib/achievements";
import { awardXp, XP_REWARDS } from "@/lib/xp";
import { playAchievementSound } from "@/lib/sounds";

interface QueueItem {
  def: AchievementDef;
  id: number;
}

let counter = 0;

export default function AchievementOverlay() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const [phase, setPhase] = useState<"enter" | "show" | "exit" | "idle">("idle");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Listen for achievement unlocks
  useEffect(() => {
    const handler = (e: Event) => {
      const def = (e as CustomEvent).detail as AchievementDef;
      setQueue((q) => [...q, { def, id: counter++ }]);
      // Award XP for achievement
      awardXp(XP_REWARDS.achievementUnlocked);
    };
    window.addEventListener("hackmind:achievement-unlocked", handler);
    return () => window.removeEventListener("hackmind:achievement-unlocked", handler);
  }, []);

  // Process queue
  useEffect(() => {
    if (phase !== "idle" || queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
    setPhase("enter");
    playAchievementSound();

    // enter → show
    const t1 = setTimeout(() => setPhase("show"), 400);
    // show → exit
    const t2 = setTimeout(() => setPhase("exit"), 2800);
    // exit → idle
    const t3 = setTimeout(() => {
      setPhase("idle");
      setCurrent(null);
    }, 3400);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase, queue]);

  // Particle burst on canvas
  const burstParticles = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; color: string }[] = [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const colors = [
      "hsl(110, 100%, 55%)",
      "hsl(110, 80%, 70%)",
      "hsl(110, 100%, 40%)",
      "hsl(140, 100%, 50%)",
      "hsl(80, 100%, 60%)",
    ];

    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2 + Math.random() * 4,
        a: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.a -= 0.012;
        if (p.a <= 0) continue;
        alive = true;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (alive) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    setTimeout(() => cancelAnimationFrame(frame), 3500);
  }, []);

  useEffect(() => {
    if (phase === "enter") burstParticles();
  }, [phase, burstParticles]);

  if (!current) return null;

  const { def } = current;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      {/* Flash */}
      {phase === "enter" && (
        <div className="absolute inset-0 bg-primary/10 animate-[flash_0.4s_ease-out_forwards]" />
      )}

      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Card */}
      <div
        className={`relative rounded-2xl border-2 border-primary/50 bg-card/95 backdrop-blur-xl shadow-[0_0_60px_hsl(var(--primary)/0.3)] px-8 py-6 max-w-sm text-center transition-all duration-400 ${
          phase === "enter"
            ? "scale-0 opacity-0"
            : phase === "show"
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        <div className="text-5xl mb-3">{def.icon}</div>
        <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">
          Achievement Unlocked
        </p>
        <h2 className="font-heading text-xl font-bold text-foreground mb-1">
          {def.title}
        </h2>
        <p className="text-xs font-mono text-muted-foreground">{def.description}</p>
        <p className="text-xs font-mono text-primary mt-2">+{XP_REWARDS.achievementUnlocked} XP</p>
      </div>
    </div>
  );
}
