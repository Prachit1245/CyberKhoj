import { useEffect, useState, useRef } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Users, Crosshair, Globe, TrendingUp } from "lucide-react";

const COUNTERS = [
  { Icon: Users, target: 500, label: "Active Hunters" },
  { Icon: Crosshair, target: 10000, label: "Analyses Run" },
  { Icon: Globe, target: 50, label: "Countries" },
  { Icon: TrendingUp, target: 25000, label: "Attack Paths Generated" },
];

const formatNumber = (n: number, target: number): string => {
  if (target >= 1000000) return Math.floor(n / 1000000) + "M+";
  if (target >= 1000) return n.toLocaleString() + "+";
  return n.toString() + "+";
};

function CounterCard({ Icon, target, label, active, delay }: {
  Icon: typeof Users;
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
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      padding: "16px",
      overflow: "hidden",
    }}>
      <div className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-3">
        <Icon size={24} className="text-primary" />
      </div>
      <div style={{
        fontSize: "clamp(1.25rem, 4vw, 2rem)",
        fontWeight: "bold",
        color: "hsl(var(--foreground))",
        whiteSpace: "nowrap",
        lineHeight: "1.2",
        marginTop: "8px",
        fontVariantNumeric: "tabular-nums",
      }}>
        {formatNumber(count, target)}
      </div>
      <div style={{
        fontSize: "0.8rem",
        color: "hsl(var(--muted-foreground))",
        marginTop: "4px",
        whiteSpace: "nowrap",
      }}>
        {label}
      </div>
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-[900px] mx-auto">
          {COUNTERS.map((c, i) => (
            <CounterCard key={c.label} {...c} active={visible} delay={i * 150} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnimatedCounter;
