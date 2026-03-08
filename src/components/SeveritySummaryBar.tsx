import { useMemo, useState, useEffect } from "react";
import type { AttackPath, Severity } from "@/types";

const SEV_CONFIG: { key: Severity; label: string; color: string; text: string }[] = [
  { key: "critical", label: "Critical", color: "hsl(0 80% 50%)", text: "hsl(0 0% 100%)" },
  { key: "high", label: "High", color: "hsl(25 95% 53%)", text: "hsl(0 0% 100%)" },
  { key: "medium", label: "Medium", color: "hsl(45 93% 47%)", text: "hsl(0 0% 10%)" },
  { key: "low", label: "Low", color: "hsl(210 80% 55%)", text: "hsl(0 0% 100%)" },
];

interface Props {
  paths: AttackPath[];
  onFilterSeverity?: (severity: Severity) => void;
}

export default function SeveritySummaryBar({ paths, onFilterSeverity }: Props) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [paths]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    paths.forEach((p) => { c[p.severity] = (c[p.severity] || 0) + 1; });
    return c;
  }, [paths]);

  const total = paths.length;
  if (total === 0) return null;

  const segments = SEV_CONFIG.filter((s) => counts[s.key] > 0);

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div
        className="flex h-9 rounded-lg overflow-hidden border border-border/20 transition-all duration-700"
        style={{ width: animated ? "100%" : "0%" }}
      >
        {segments.map((s) => {
          const pct = (counts[s.key] / total) * 100;
          return (
            <button
              key={s.key}
              onClick={() => onFilterSeverity?.(s.key)}
              className="flex items-center justify-center text-xs font-mono font-semibold transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                width: `${pct}%`,
                backgroundColor: s.color,
                color: s.text,
                minWidth: counts[s.key] > 0 ? "2rem" : 0,
              }}
              title={`${counts[s.key]} ${s.label}`}
            >
              {counts[s.key]}
            </button>
          );
        })}
      </div>

      {/* Text summary */}
      <p className="text-xs font-mono text-muted-foreground">
        Found{" "}
        {SEV_CONFIG.filter((s) => counts[s.key] > 0)
          .map((s) => (
            <span key={s.key}>
              <span style={{ color: s.color }} className="font-semibold">
                {counts[s.key]} {s.label}
              </span>
            </span>
          ))
          .reduce<React.ReactNode[]>((acc, el, i, arr) => {
            acc.push(el);
            if (i < arr.length - 1) acc.push(<span key={`sep-${i}`}>, </span>);
            return acc;
          }, [])}
        {" "}— {total} total attack path{total !== 1 ? "s" : ""}.
      </p>
    </div>
  );
}
