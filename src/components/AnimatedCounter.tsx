import { useEffect, useState, useRef } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Users, Crosshair, Globe, TrendingUp } from "lucide-react";

const COUNTERS = [
  { icon: Users, target: 2400, label: "Active Hunters" },
  { icon: Crosshair, target: 58000, label: "Analyses Run" },
  { icon: Globe, target: 80, label: "Countries" },
  { icon: TrendingUp, target: 12000000, label: "Attack Paths Generated" },
];

const formatNumber = (n: number): string => {
  if (n >= 1000000) return Math.floor(n / 1000000) + "M+";
  if (n >= 1000) return n.toLocaleString() + "+";
  return n.toString() + "+";
};

function CounterCard({
  icon: Icon,
  target,
  label,
  active,
  delay,
}: {
  icon: typeof Users;
  target: number;
  label: string;
  active: boolean;
  delay: number;
}) {
  const [count, setCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const duration = 2000;
      const steps = 60;
      const increment = target / steps;
      let current = 0;

      timerRef.current = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
    }, delay);

    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, target, delay]);

  return (
    <div
      style={{
        minWidth: "200px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-3">
        <Icon size={28} className="text-primary" />
      </div>
      <div
        style={{
          fontSize: "3rem",
          fontWeight: "800",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
          color: "hsl(var(--foreground))",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatNumber(count)}
      </div>
      <p className="text-xs md:text-sm font-mono text-muted-foreground">{label}</p>
    </div>
  );
}

const AnimatedCounter = () => {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.2);

  return (
    <section ref={ref} className="relative py-20 md:py-28 px-4 bg-background">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">
            How Many Hunters Use{" "}
            <span className="text-primary text-glow-primary">CyberKhoj</span>?
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-mono max-w-lg mx-auto">
            Growing every day. Completely organic. Zero marketing spend.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "2rem",
            width: "100%",
          }}
          className="grid-cols-stat"
        >
          {COUNTERS.map((c, i) => (
            <CounterCard key={c.label} {...c} active={visible} delay={i * 150} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .grid-cols-stat {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
};

export default AnimatedCounter;
