import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { detectTech, type DetectedTech } from "@/lib/techDetector";

interface Props {
  url: string;
  headers?: string;
}

export default function TechStackDetector({ url, headers }: Props) {
  const techs = useMemo(() => detectTech(url, headers), [url, headers]);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!techs.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Cpu size={14} className="text-primary" />
        <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">
          Tech Stack Detected
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">instant • no API</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {techs.map((t) => (
          <button
            key={t.name}
            onClick={() => setExpanded(expanded === t.name ? null : t.name)}
            className="group"
          >
            <Badge
              variant="outline"
              className={`cursor-pointer transition-all text-xs border ${t.color} ${
                expanded === t.name ? "ring-1 ring-primary/40" : ""
              }`}
            >
              {t.icon} {t.name}
              {expanded === t.name ? (
                <ChevronUp size={10} className="ml-1" />
              ) : (
                <ChevronDown size={10} className="ml-1" />
              )}
            </Badge>
          </button>
        ))}
      </div>

      {expanded && (
        <TechAttackPanel tech={techs.find((t) => t.name === expanded)!} />
      )}
    </div>
  );
}

function TechAttackPanel({ tech }: { tech: DetectedTech }) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${tech.color} bg-opacity-5`}>
      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
        {tech.icon} {tech.name} — Known vulnerabilities to check →
      </p>
      <ul className="space-y-1.5">
        {tech.attacks.map((attack, i) => (
          <li key={i} className="flex items-start gap-2 text-xs font-mono text-foreground/80 leading-relaxed">
            <span className="text-primary mt-0.5 shrink-0">▸</span>
            {attack}
          </li>
        ))}
      </ul>
    </div>
  );
}
