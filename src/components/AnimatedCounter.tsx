import { useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Users, Crosshair, Globe, TrendingUp } from "lucide-react";

const COUNTERS = [
  { icon: Users, target: 2400, suffix: "+", label: "Active Hunters" },
  { icon: Crosshair, target: 58000, suffix: "+", label: "Analyses Run" },
  { icon: Globe, target: 80, suffix: "+", label: "Countries" },
  { icon: TrendingUp, target: 12, suffix: "M+", label: "Attack Paths Generated" },
];

function useCountUp(target: number, active: boolean, duration = 2000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [active, target, duration]);

  return value;
}

function CounterCard({ icon: Icon, target, suffix, label, active, delay }: {
  icon: typeof Users;
  target: number;
  suffix: string;
  label: string;
  active: boolean;
  delay: number;
}) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [active, delay]);

  const value = useCountUp(target, started);

  return (
    <div className="text-center space-y-3">
      <div className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-3">
        <Icon size={28} className="text-primary" />
      </div>
      <p className="text-3xl md:text-5xl font-heading font-extrabold text-foreground tabular-nums">
        {started ? value.toLocaleString() : "0"}{suffix}
      </p>
      <p className="text-xs md:text-sm font-mono text-muted-foreground">{label}</p>
    </div>
  );
}

const AnimatedCounter = () => {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.2);

  return (
    <section ref={ref} className="relative py-20 md:py-28 px-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">
            How Many Hunters Use{" "}
            <span className="text-primary text-glow-primary">HackMind</span>?
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-mono max-w-lg mx-auto">
            Growing every day. Completely organic. Zero marketing spend.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {COUNTERS.map((c, i) => (
            <CounterCard key={c.label} {...c} active={visible} delay={i * 150} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnimatedCounter;
