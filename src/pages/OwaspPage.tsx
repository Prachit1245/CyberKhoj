import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, ArrowRight, Shield, CheckCircle2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OWASP_TOP_10 } from "@/lib/owasp";

const COVERAGE_KEY = "hackmind_owasp_coverage";

const getCoverage = (): Record<string, boolean> => {
  try { return JSON.parse(localStorage.getItem(COVERAGE_KEY) || "{}"); }
  catch { return {}; }
};
const saveCoverage = (c: Record<string, boolean>) => localStorage.setItem(COVERAGE_KEY, JSON.stringify(c));

const sevGradient: Record<string, string> = {
  A01: "from-red-500/20 to-red-500/5 border-red-500/20",
  A02: "from-orange-500/20 to-orange-500/5 border-orange-500/20",
  A03: "from-red-600/20 to-red-600/5 border-red-600/20",
  A04: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20",
  A05: "from-orange-400/20 to-orange-400/5 border-orange-400/20",
  A06: "from-yellow-600/20 to-yellow-600/5 border-yellow-600/20",
  A07: "from-red-400/20 to-red-400/5 border-red-400/20",
  A08: "from-orange-600/20 to-orange-600/5 border-orange-600/20",
  A09: "from-blue-500/20 to-blue-500/5 border-blue-500/20",
  A10: "from-red-500/20 to-red-500/5 border-red-500/20",
};

const idColor: Record<string, string> = {
  A01: "text-red-400", A02: "text-orange-400", A03: "text-red-500",
  A04: "text-yellow-400", A05: "text-orange-300", A06: "text-yellow-500",
  A07: "text-red-300", A08: "text-orange-500", A09: "text-blue-400", A10: "text-red-400",
};

const OwaspPage = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Record<string, boolean>>(getCoverage());
  const navigate = useNavigate();

  useEffect(() => { saveCoverage(coverage); }, [coverage]);

  const toggleCoverage = (id: string) => {
    setCoverage((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const coveredCount = OWASP_TOP_10.filter((o) => coverage[o.id]).length;
  const coveragePct = Math.round((coveredCount / OWASP_TOP_10.length) * 100);

  const handleAnalyze = (item: typeof OWASP_TOP_10[0]) => {
    // Store context in sessionStorage so Analyzer can pick it up
    sessionStorage.setItem("hackmind_prefill", JSON.stringify({
      target: item.analyzerExample,
      templateContext: item.analyzerContext,
    }));
    navigate("/analyzer");
  };

  const copyPayloads = (payloads: string[]) => {
    navigator.clipboard.writeText(payloads.join("\n"));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Coverage tracker */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <h2 className="font-heading text-sm font-bold text-foreground">My OWASP Coverage</h2>
          </div>
          <span className="text-sm font-heading font-bold text-primary">{coveragePct}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${coveragePct}%` }}
          />
        </div>

        {/* Mini checkboxes */}
        <div className="flex flex-wrap gap-2">
          {OWASP_TOP_10.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleCoverage(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono transition-all ${
                coverage[item.id]
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              }`}
            >
              {coverage[item.id] && <CheckCircle2 size={10} />}
              {item.id}
            </button>
          ))}
        </div>

        <p className="text-[10px] font-mono text-muted-foreground">
          {coveredCount} of {OWASP_TOP_10.length} categories tested · Click items above to mark as covered
        </p>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {OWASP_TOP_10.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-xl border overflow-hidden transition-all ${
                isExpanded
                  ? `bg-gradient-to-b ${sevGradient[item.id] || "border-border"}`
                  : "bg-card border-border/50 hover:border-border"
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
              >
                {isExpanded
                  ? <ChevronDown size={16} className="text-primary shrink-0" />
                  : <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                }
                <span className={`font-heading text-base font-bold shrink-0 ${idColor[item.id] || "text-foreground"}`}>
                  {item.id}
                </span>
                <span className="font-heading text-sm font-bold text-foreground flex-1">{item.name}</span>

                {coverage[item.id] && (
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] shrink-0">
                    <CheckCircle2 size={10} className="mr-1" /> Tested
                  </Badge>
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-5 animate-fade-in">
                  {/* Description */}
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Risk Description</p>
                    <p className="text-sm font-mono text-foreground/90 leading-relaxed">{item.description}</p>
                  </div>

                  {/* Real-world example */}
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Real-World Example</p>
                    <div className="bg-muted/20 border border-border/30 rounded-lg p-3">
                      <p className="text-xs font-mono text-foreground/80 leading-relaxed">{item.realWorldExample}</p>
                    </div>
                  </div>

                  {/* How to test */}
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">How to Test</p>
                    <ul className="space-y-1">
                      {item.howToTest.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-mono text-foreground/80">
                          <span className="text-primary shrink-0 mt-0.5">▸</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Payloads */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Common Payloads & Techniques</p>
                      <button onClick={() => copyPayloads(item.payloads)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Copy size={12} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {item.payloads.map((p, i) => (
                        <pre key={i} className="text-xs font-mono bg-muted/30 rounded-md px-3 py-1.5 border border-border/30 text-foreground/80 whitespace-pre-wrap">{p}</pre>
                      ))}
                    </div>
                  </div>

                  {/* Remediation */}
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">Remediation</p>
                    <ul className="space-y-1">
                      {item.remediation.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-mono text-foreground/80">
                          <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border/20">
                    <button
                      onClick={() => handleAnalyze(item)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-heading text-xs font-bold text-primary-foreground hover:brightness-110 transition-all"
                    >
                      Analyze For This <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => toggleCoverage(item.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 font-heading text-xs font-bold transition-all ${
                        coverage[item.id]
                          ? "border-primary/30 text-primary bg-primary/5"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      {coverage[item.id] ? "Tested ✓" : "Mark as Tested"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OwaspPage;
