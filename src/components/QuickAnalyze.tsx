import { useState, useEffect, useCallback, useRef } from "react";
import { Zap, X, ArrowRight, Loader2, ExternalLink, Save, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { callGemini, GeminiError, type GeminiErrorCode } from "@/lib/gemini";
import { addToHistory, incrementStat } from "@/lib/store";
import { parseTarget, contextToPromptBlock } from "@/lib/parseTarget";
import { Badge } from "@/components/ui/badge";
import useOnline from "@/hooks/useOnline";

interface QuickPath {
  title: string;
  severity: string;
}

const severityColor = (s: string) => {
  const sl = s.toLowerCase();
  if (sl === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (sl === "high") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (sl === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  if (sl === "low") return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  return "bg-muted text-muted-foreground border-border";
};

const parseQuickPaths = (raw: string): QuickPath[] => {
  const paths: QuickPath[] = [];
  // Match patterns like "## 1. Title" or "**1. Title**" followed by severity
  const blocks = raw.split(/#{1,3}\s+\d+[\.\)]/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    const titleMatch = block.match(/^\s*\**\s*(.+?)[\*\n]/);
    const sevMatch = block.match(/\**(Critical|High|Medium|Low|Info)\**/i);
    if (titleMatch) {
      paths.push({
        title: titleMatch[1].replace(/\*+/g, "").trim().slice(0, 80),
        severity: sevMatch ? sevMatch[1] : "Medium",
      });
    }
  }
  // Fallback: line-by-line
  if (paths.length === 0) {
    const lines = raw.split("\n").filter((l) => l.match(/^\s*[\-\*]\s+.+/));
    for (const line of lines.slice(0, 10)) {
      const clean = line.replace(/^[\s\-\*]+/, "").trim();
      const sevMatch = clean.match(/(Critical|High|Medium|Low|Info)/i);
      paths.push({ title: clean.slice(0, 80), severity: sevMatch ? sevMatch[1] : "Medium" });
    }
  }
  return paths.slice(0, 15);
};

const QuickAnalyze = () => {
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawResult, setRawResult] = useState("");
  const [paths, setPaths] = useState<QuickPath[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      // Reset on close
      setTarget("");
      setRawResult("");
      setPaths([]);
      setError("");
      setSaved(false);
    }
  }, [open]);

  const handleAnalyze = useCallback(async () => {
    const trimmed = target.trim();
    if (!trimmed) { setError("Enter a target URL or endpoint."); return; }

    setLoading(true);
    setError("");
    setRawResult("");
    setPaths([]);
    setSaved(false);

    try {
      const ctx = parseTarget(trimmed);
      const contextBlock = contextToPromptBlock(ctx);
      const prompt = `You are a bug bounty hunter. Quickly analyze this target for security vulnerabilities.

Target: ${trimmed}

${contextBlock}

Provide a concise list of the top 8 most critical attack paths. For each, give:
1. **Attack Vector Name**
2. **Severity** (Critical / High / Medium / Low)
3. Brief one-line description

Format as numbered list with markdown.`;

      const response = await callGemini(prompt);
      setRawResult(response);
      setPaths(parseQuickPaths(response));
      incrementStat("totalAnalyses");
    } catch (e) {
      if (e instanceof GeminiError) {
        setError(`${e.message}`);
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed.");
      }
    } finally {
      setLoading(false);
    }
  }, [target]);

  const handleSave = useCallback(() => {
    if (!rawResult || saved) return;
    const pathCount = paths.length || 1;
    incrementStat("attackPaths", pathCount);
    try {
      const url = new URL(target.startsWith("http") ? target : `https://${target}`);
      incrementStat("domainsTested");
      addToHistory({
        id: crypto.randomUUID(),
        target: url.hostname + url.pathname,
        type: "url",
        pathsFound: pathCount,
        date: new Date().toLocaleDateString(),
        result: rawResult,
      });
    } catch {
      addToHistory({
        id: crypto.randomUUID(),
        target: target.slice(0, 60),
        type: "domain",
        pathsFound: pathCount,
        date: new Date().toLocaleDateString(),
        result: rawResult,
      });
    }
    setSaved(true);
  }, [rawResult, target, paths, saved]);

  const handleViewFull = () => {
    setOpen(false);
    navigate("/analyzer");
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-110 transition-all duration-200 glow-primary"
        title="Quick Analyze (Ctrl+K)"
      >
        <Zap size={24} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl shadow-primary/10 animate-enter z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-primary" />
                <h2 className="font-heading text-sm font-bold text-foreground">Quick Analyze</h2>
                <kbd className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Ctrl+K</kbd>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Input row */}
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={target}
                  onChange={(e) => { setTarget(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleAnalyze(); }}
                  placeholder="https://example.com/api/users?id=123"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !online}
                  title={!online ? "Requires internet for AI analysis" : undefined}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 font-heading text-xs font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : !online ? <WifiOff size={14} /> : <ArrowRight size={14} />}
                  {loading ? "Scanning" : !online ? "Offline" : "Analyze"}
                </button>
              </div>

              {error && <p className="text-xs text-destructive font-mono">{error}</p>}

              {/* Results */}
              {paths.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    {paths.length} Attack Paths Found
                  </p>
                  <div className="space-y-1.5">
                    {paths.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 animate-fade-in"
                        style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                      >
                        <Badge className={`${severityColor(p.severity)} text-[9px] shrink-0 uppercase`}>
                          {p.severity}
                        </Badge>
                        <span className="text-xs font-mono text-foreground truncate">{p.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <button
                      onClick={handleViewFull}
                      className="flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors"
                    >
                      <ExternalLink size={12} /> View Full Results
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saved}
                      className={`flex items-center gap-1.5 text-xs font-mono transition-colors ml-auto ${
                        saved
                          ? "text-green-400 cursor-default"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Save size={12} /> {saved ? "Saved ✓" : "Save to History"}
                    </button>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading && paths.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm font-mono text-muted-foreground">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  Scanning for vulnerabilities…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickAnalyze;
