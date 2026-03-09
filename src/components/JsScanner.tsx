import { useState, useMemo } from "react";
import { Search, AlertTriangle, Copy, Check, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PatternMatch {
  pattern: string;
  category: string;
  matches: string[];
  severity: "critical" | "high" | "medium" | "low";
}

const PATTERNS: { name: string; category: string; regex: RegExp; severity: PatternMatch["severity"] }[] = [
  { name: "AWS Access Key", category: "Cloud Keys", regex: /AKIA[0-9A-Z]{16}/g, severity: "critical" },
  { name: "AWS Secret Key", category: "Cloud Keys", regex: /[0-9a-zA-Z/+]{40}/g, severity: "critical" },
  { name: "Google API Key", category: "Cloud Keys", regex: /AIza[0-9A-Za-z_-]{35}/g, severity: "critical" },
  { name: "Stripe Key", category: "Payment", regex: /(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}/g, severity: "critical" },
  { name: "Slack Token", category: "Tokens", regex: /xox[bpors]-[0-9a-zA-Z-]{10,}/g, severity: "high" },
  { name: "GitHub Token", category: "Tokens", regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g, severity: "critical" },
  { name: "JWT Token", category: "Tokens", regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+/g, severity: "high" },
  { name: "Bearer Token", category: "Tokens", regex: /Bearer\s+[a-zA-Z0-9._-]{20,}/g, severity: "high" },
  { name: "Generic Secret", category: "Secrets", regex: /(secret|key|token|password|passwd|pwd|auth)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: "high" },
  { name: "Firebase URL", category: "Cloud", regex: /[a-zA-Z0-9_-]+-default-rtdb\.firebaseio\.com/g, severity: "medium" },
  { name: "Firebase App", category: "Cloud", regex: /[a-zA-Z0-9_-]+\.firebaseapp\.com/g, severity: "medium" },
  { name: "S3 Bucket", category: "Cloud", regex: /[a-zA-Z0-9._-]+\.s3\.amazonaws\.com/g, severity: "high" },
  { name: "Internal Domain", category: "Infrastructure", regex: /https?:\/\/[a-z0-9._-]+\.(internal|local|staging|dev|test)/gi, severity: "medium" },
  { name: "Private IP", category: "Infrastructure", regex: /(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})/g, severity: "medium" },
  { name: "API Endpoint", category: "Endpoints", regex: /\/api\/[a-zA-Z0-9_/]+/g, severity: "low" },
  { name: "Fetch/Axios Call", category: "Endpoints", regex: /(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*['"`][^'"`]+['"`]/g, severity: "low" },
  { name: "Google OAuth Client", category: "Cloud", regex: /\d+-[a-z0-9_]+\.apps\.googleusercontent\.com/g, severity: "medium" },
  { name: "Base64 Blob (40+ chars)", category: "Encoded", regex: /[A-Za-z0-9+/]{40,}={0,2}/g, severity: "low" },
];

const SEV_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function JsScanner() {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState<number | null>(null);

  const results = useMemo<PatternMatch[]>(() => {
    if (!code.trim()) return [];
    const found: PatternMatch[] = [];
    for (const p of PATTERNS) {
      const matches = [...new Set(code.match(new RegExp(p.regex.source, p.regex.flags)) || [])];
      if (matches.length > 0) {
        found.push({ pattern: p.name, category: p.category, matches, severity: p.severity });
      }
    }
    return found.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });
  }, [code]);

  const totalMatches = results.reduce((s, r) => s + r.matches.length, 0);

  const copyMatch = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-primary" />
        <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">
          JS Scanner — Paste & Scan
        </h3>
        <span className="text-[10px] font-mono text-muted-foreground ml-auto">instant • client-side only</span>
      </div>

      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste JavaScript code here to scan for secrets, endpoints, and sensitive data…"
          rows={8}
          className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y min-h-[120px]"
        />
        {code && (
          <button
            onClick={() => setCode("")}
            className="absolute top-2 right-2 p-1 rounded bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {code.trim() && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {totalMatches > 0 ? (
              <>
                <AlertTriangle size={14} className="text-destructive" />
                <span className="text-destructive font-bold">{totalMatches} match{totalMatches !== 1 ? "es" : ""}</span>
                <span className="text-muted-foreground">across {results.length} pattern{results.length !== 1 ? "s" : ""}</span>
              </>
            ) : (
              <span className="text-muted-foreground">✓ No sensitive patterns detected</span>
            )}
          </div>

          {/* Results */}
          {results.map((r, ri) => (
            <div key={ri} className="rounded-lg border border-border/30 bg-card/30 p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] border ${SEV_COLORS[r.severity]}`}>
                  {r.severity}
                </Badge>
                <span className="text-xs font-mono font-bold text-foreground">{r.pattern}</span>
                <span className="text-[10px] font-mono text-muted-foreground">({r.category})</span>
                <span className="text-[10px] font-mono text-muted-foreground ml-auto">{r.matches.length} found</span>
              </div>
              <div className="space-y-1">
                {r.matches.slice(0, 10).map((m, mi) => {
                  const globalIdx = ri * 100 + mi;
                  return (
                    <div key={mi} className="flex items-center gap-2 group">
                      <code className="flex-1 text-[11px] font-mono bg-muted/30 rounded px-2 py-1 text-foreground/80 break-all select-all">
                        {m.length > 120 ? m.slice(0, 120) + "…" : m}
                      </code>
                      <button
                        onClick={() => copyMatch(m, globalIdx)}
                        className="shrink-0 p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        {copied === globalIdx ? <Check size={10} className="text-green-400" /> : <Copy size={10} className="text-muted-foreground" />}
                      </button>
                    </div>
                  );
                })}
                {r.matches.length > 10 && (
                  <p className="text-[10px] font-mono text-muted-foreground">…and {r.matches.length - 10} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
