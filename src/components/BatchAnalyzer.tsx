import { useState, useCallback, useRef } from "react";
import { INPUT_LIMITS, enforceLimit } from "@/lib/sanitize";
import { ArrowRight, Loader2, ChevronDown, ChevronRight, Download, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { callGemini } from "@/lib/ai";
import { addToHistory, incrementStat } from "@/lib/store";
import { checkAnalysisAchievements, checkBatchAnalysis } from "@/lib/achievements";
import { parseTarget, contextToPromptBlock } from "@/lib/parseTarget";
import { getUsageCount, DAILY_LIMIT } from "@/lib/usage";

const MAX_URLS = INPUT_LIMITS.BATCH_MAX_URLS;

interface BatchResult {
  url: string;
  result: string;
  pathCount: number;
  severities: Record<string, number>;
  error?: string;
}

const countSeverities = (text: string): Record<string, number> => {
  const s: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0 };
  const matches = text.matchAll(/\**(Critical|High|Medium|Low|Info)\**/gi);
  for (const m of matches) {
    const key = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    if (key in s) s[key]++;
  }
  return s;
};

const sevBarColor: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-blue-500",
  Info: "bg-muted-foreground",
};

const sevBadgeColor = (s: string) => {
  switch (s) {
    case "Critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "High": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "Medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "Low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const buildQuickPrompt = (url: string): string => {
  const ctx = parseTarget(url);
  const contextBlock = contextToPromptBlock(ctx);
  return `You are an elite bug bounty hunter. Analyze this URL target for security vulnerabilities.

Target: ${url}

${contextBlock}

STRICT RULES:
- Do NOT repeat attack paths. Every path must be unique.
- Do NOT give generic advice. Every path must be specific to this exact URL and its parameters.
- Every payload must use the actual URL and parameter names shown above.

Provide a thorough analysis with 8-12 attack paths covering major vulnerability categories.

For each attack path, provide:
1. **Attack Vector Name**
2. **Severity** (Critical / High / Medium / Low / Info)
3. **Description** — specific to this target
4. **Steps to Test**
5. **Example Payload** — using the actual URL and parameters
6. **Potential Impact**

Format with markdown headers and bullet points.`;
};

const BatchAnalyzer = () => {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalUrls, setTotalUrls] = useState(0);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [error, setError] = useState("");
  const abortRef = useRef(false);

  const urls = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_URLS);

  const handleAnalyze = useCallback(async () => {
    if (urls.length === 0) {
      setError("Paste at least one URL.");
      return;
    }

    // Check usage limit
    const currentUsage = getUsageCount();
    const remaining = DAILY_LIMIT - currentUsage;
    if (remaining <= 0) {
      setError(`Daily limit of ${DAILY_LIMIT} analyses reached. Resets at midnight.`);
      return;
    }
    if (urls.length > remaining) {
      setError(`Batch of ${urls.length} URLs would exceed your daily limit. You have ${remaining} analyses remaining today.`);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setTotalUrls(urls.length);
    setExpandedIdx(null);
    abortRef.current = false;

    const batchResults: BatchResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      if (abortRef.current) break;
      setCurrentIdx(i);
      const url = urls[i];

      try {
        const prompt = buildQuickPrompt(url);
        const response = await callGemini(prompt);
        const pathCount = (response.match(/#{1,3}\s+\d+[\.\)]/g) || []).length || Math.max(1, Math.floor(response.length / 500));
        const severities = countSeverities(response);

        const entry: BatchResult = { url, result: response, pathCount, severities };
        batchResults.push(entry);
        setResults([...batchResults]);

        incrementStat("totalAnalyses");
        incrementStat("attackPaths", pathCount);
        checkAnalysisAchievements();
        checkBatchAnalysis();
      } catch (e) {
        const entry: BatchResult = {
          url,
          result: "",
          pathCount: 0,
          severities: {},
          error: e instanceof Error ? e.message : "Failed",
        };
        batchResults.push(entry);
        setResults([...batchResults]);

        // Stop on quota errors
        if (e instanceof Error && (e.message.includes("429") || e.message.includes("Daily limit"))) {
          setError(`Stopped at URL ${i + 1}: ${e.message}`);
          break;
        }
      }
    }

    // Save batch as one history entry
    const successResults = batchResults.filter((r) => !r.error);
    if (successResults.length > 0) {
      const totalPaths = successResults.reduce((sum, r) => sum + r.pathCount, 0);
      const combined = successResults.map((r) => `## ${r.url}\n\n${r.result}`).join("\n\n---\n\n");
      incrementStat("domainsTested");
      addToHistory({
        id: crypto.randomUUID(),
        target: `Batch (${successResults.length} URLs)`,
        type: "domain",
        pathsFound: totalPaths,
        date: new Date().toLocaleDateString(),
        result: combined,
      });
    }

    setLoading(false);
  }, [urls]);

  const handleStop = () => { abortRef.current = true; };

  const handleExport = () => {
    const successResults = results.filter((r) => !r.error);
    if (successResults.length === 0) return;

    const md = `# Batch Analysis Report\n\nGenerated: ${new Date().toLocaleString()}\nURLs analyzed: ${successResults.length}\n\n---\n\n` +
      successResults.map((r) => `## ${r.url}\n\n**Attack Paths Found:** ${r.pathCount}\n\n${r.result}`).join("\n\n---\n\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `batch-analysis-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Combined summary
  const combinedSev = results.reduce<Record<string, number>>((acc, r) => {
    for (const [k, v] of Object.entries(r.severities)) {
      acc[k] = (acc[k] || 0) + v;
    }
    return acc;
  }, {});
  const totalPaths = results.reduce((s, r) => s + r.pathCount, 0);
  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
            Paste Multiple URLs, One Per Line (max {MAX_URLS})
          </label>
          <span className="text-xs font-mono text-muted-foreground">
            {urls.length} / {MAX_URLS} URLs
          </span>
        </div>
        <textarea
          value={input}
          onChange={(e) => { setInput(enforceLimit(e.target.value, INPUT_LIMITS.BATCH_URL_LENGTH * MAX_URLS)); setError(""); }}
          placeholder={`https://example.com/api/users?id=1\nhttps://example.com/admin/dashboard\nhttps://example.com/auth/login\nhttps://example.com/upload`}
          rows={6}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors resize-y"
          disabled={loading}
        />
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive font-mono">
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        {/* Usage warning */}
        {urls.length > 0 && !loading && (
          <p className="text-[10px] font-mono text-muted-foreground">
            This batch will use <span className="text-foreground">{urls.length}</span> of your remaining{" "}
            <span className="text-foreground">{Math.max(0, DAILY_LIMIT - getUsageCount())}</span> daily analyses.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {!loading ? (
          <button
            onClick={handleAnalyze}
            disabled={urls.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed glow-primary"
          >
            Analyze All ({urls.length}) <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 rounded-lg bg-destructive px-6 py-3 font-heading text-sm font-bold text-destructive-foreground hover:brightness-110 transition-all"
          >
            Stop Batch
          </button>
        )}
        {results.length > 0 && !loading && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border px-5 py-3 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Download size={16} /> Export All as Markdown
          </button>
        )}
      </div>

      {/* Progress */}
      {loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Loader2 size={16} className="animate-spin text-primary" />
            <span className="text-sm font-mono text-muted-foreground">
              Analyzing <span className="text-primary font-bold">{currentIdx + 1}</span> of{" "}
              <span className="text-foreground">{totalUrls}</span>
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${((results.length) / totalUrls) * 100}%` }}
            />
          </div>
          <p className="text-xs font-mono text-muted-foreground/60 truncate">
            → {urls[currentIdx]}
          </p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {/* Combined summary */}
          {!loading && results.length > 1 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-bold text-foreground">Batch Summary</h3>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="text-primary">{successCount} completed</span>
                  {errorCount > 0 && <span className="text-destructive">{errorCount} failed</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">
                  Total paths: <span className="text-foreground font-bold">{totalPaths}</span>
                </span>
                {Object.entries(combinedSev).filter(([, v]) => v > 0).map(([sev, count]) => (
                  <Badge key={sev} className={`${sevBadgeColor(sev)} text-[10px]`}>
                    {sev}: {count}
                  </Badge>
                ))}
              </div>
              {/* Mini severity bar */}
              {totalPaths > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  {Object.entries(combinedSev).filter(([, v]) => v > 0).map(([sev, count]) => (
                    <div
                      key={sev}
                      className={`${sevBarColor[sev] || "bg-muted-foreground"} transition-all`}
                      style={{ width: `${(count / Object.values(combinedSev).reduce((a, b) => a + b, 0)) * 100}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Individual results */}
          <div className="space-y-1.5">
            {results.map((r, i) => {
              const isExpanded = expandedIdx === i;
              const sevTotal = Object.values(r.severities).reduce((a, b) => a + b, 0);
              return (
                <div key={i} className="rounded-xl border border-border/50 bg-card overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}>
                  {/* Row header */}
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-primary shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}

                    <span className="text-xs font-mono text-foreground truncate flex-1">{r.url}</span>

                    {r.error ? (
                      <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px] shrink-0">Error</Badge>
                    ) : (
                      <>
                        {/* Mini severity bar */}
                        {sevTotal > 0 && (
                          <div className="flex h-1.5 w-20 rounded-full overflow-hidden bg-muted shrink-0">
                            {Object.entries(r.severities).filter(([, v]) => v > 0).map(([sev, count]) => (
                              <div
                                key={sev}
                                className={`${sevBarColor[sev] || "bg-muted-foreground"}`}
                                style={{ width: `${(count / sevTotal) * 100}%` }}
                              />
                            ))}
                          </div>
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {r.pathCount} paths
                        </span>
                      </>
                    )}
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border/30 px-4 py-3">
                      {r.error ? (
                        <p className="text-xs font-mono text-destructive">{r.error}</p>
                      ) : (
                        <>
                          <div className="flex gap-2 flex-wrap mb-3">
                            {Object.entries(r.severities).filter(([, v]) => v > 0).map(([sev, count]) => (
                              <Badge key={sev} className={`${sevBadgeColor(sev)} text-[9px]`}>
                                {sev}: {count}
                              </Badge>
                            ))}
                          </div>
                          <div className="prose-result whitespace-pre-wrap text-xs font-mono text-foreground leading-relaxed max-h-[50vh] overflow-y-auto">
                            {r.result}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchAnalyzer;
