import { memo } from "react";
import { Cpu, AlertTriangle, Flag, Crosshair, ChevronRight } from "lucide-react";
import type { TargetIntelligence } from "@/lib/targetIntelligence";

const CONFIDENCE_STYLES = {
  high: "bg-primary/15 text-primary border-primary/30",
  medium: "bg-secondary/15 text-secondary border-secondary/30",
  low: "bg-muted text-muted-foreground border-border",
};

const RISK_STYLES = {
  HIGH: "bg-red-500/15 text-red-400",
  MEDIUM: "bg-yellow-500/15 text-yellow-400",
  LOW: "bg-blue-500/15 text-blue-400",
};

const SEVERITY_STYLES = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  info: "text-muted-foreground",
};

interface Props {
  intel: TargetIntelligence;
}

const TargetIntelligenceCard = memo(({ intel }: Props) => (
  <div className="rounded-xl border border-primary/20 bg-card overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-300">
    {/* Header */}
    <div className="flex items-center gap-2 px-5 py-3 border-b border-border/30 bg-primary/5">
      <Cpu size={15} className="text-primary" />
      <h3 className="font-heading text-sm font-bold text-foreground">Target Intelligence</h3>
      <span className="text-[10px] font-mono text-primary/60 uppercase tracking-wider ml-auto">Instant · No API</span>
    </div>

    <div className="p-5 space-y-4">
      {/* Tech Hints */}
      {intel.techHints.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Cpu size={11} /> Detected Technologies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {intel.techHints.map((t, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-mono ${CONFIDENCE_STYLES[t.confidence]}`}
                title={t.indicator}
              >
                {t.name}
                <span className="opacity-50 text-[9px]">({t.confidence})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Parameter Risk Assessment */}
      {intel.paramRisks.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle size={11} /> Parameter Risk Assessment
          </p>
          <div className="space-y-1.5">
            {intel.paramRisks.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs font-mono">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${RISK_STYLES[r.risk]}`}>
                  {r.risk}
                </span>
                <div className="min-w-0">
                  <span className="text-foreground font-bold">{r.param}</span>
                  <span className="text-muted-foreground">={r.value}</span>
                  <span className="text-muted-foreground/70 ml-1.5">— {r.type}</span>
                  <p className="text-muted-foreground/60 text-[11px] leading-relaxed">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pattern Flags */}
      {intel.patternFlags.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Flag size={11} /> Interesting Patterns
          </p>
          <div className="space-y-1">
            {intel.patternFlags.map((f, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs font-mono ${SEVERITY_STYLES[f.severity]}`}>
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Focus Areas */}
      {intel.focusAreas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Crosshair size={11} /> Recommended Focus Areas
          </p>
          <div className="space-y-1">
            {intel.focusAreas.map((area, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs font-mono text-foreground/80">
                <ChevronRight size={12} className="text-primary shrink-0 mt-0.5" />
                <span>{area}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
));

TargetIntelligenceCard.displayName = "TargetIntelligenceCard";

export default TargetIntelligenceCard;
