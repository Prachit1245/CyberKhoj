import { useState } from "react";
import { Trash2, ArrowRight, Loader2 } from "lucide-react";
import { callGemini } from "@/lib/gemini";
import { addToHistory, incrementStat } from "@/lib/store";

const DEPTHS = ["Quick", "Standard", "Deep"] as const;
const TYPES = ["URL", "HTTP Request", "JWT Token", "GraphQL"] as const;
const RESULT_TABS = ["Attack Paths", "Explanation", "Raw JSON"] as const;

type Depth = (typeof DEPTHS)[number];
type AnalysisType = (typeof TYPES)[number];

const buildPrompt = (target: string, depth: Depth, type: AnalysisType): string => {
  const depthInstruction =
    depth === "Quick"
      ? "Provide a brief, concise analysis with the top 5 most critical attack paths."
      : depth === "Deep"
        ? "Provide an exhaustive, extremely detailed analysis with every possible attack vector, edge case, and bypass technique. Include at least 15-20 attack paths."
        : "Provide a thorough analysis with 8-12 attack paths covering major vulnerability categories.";

  return `You are an elite bug bounty hunter and penetration tester. Analyze the following ${type} target for security vulnerabilities.

Target:
${target}

${depthInstruction}

For each attack path, provide:
1. **Attack Vector Name** (e.g., "IDOR via user ID parameter")
2. **Severity** (Critical / High / Medium / Low / Info)
3. **Description** — What the vulnerability is
4. **Steps to Test** — Exact steps a bug bounty hunter would take
5. **Example Payload** — A ready-to-use test payload if applicable
6. **Potential Impact** — What an attacker could achieve

Also provide:
- A brief explanation of why this target is interesting from a security perspective
- Any headers, parameters, or patterns that stand out
- Recommended tools for testing (Burp Suite, ffuf, sqlmap, etc.)

Format your response clearly with markdown headers and bullet points.`;
};

const Analyzer = () => {
  const [target, setTarget] = useState("");
  const [depth, setDepth] = useState<Depth>("Standard");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("URL");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [resultTab, setResultTab] = useState<(typeof RESULT_TABS)[number]>("Attack Paths");

  const handleAnalyze = async () => {
    const trimmed = target.trim();
    if (!trimmed) {
      setError("Please paste a target to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const prompt = buildPrompt(trimmed, depth, analysisType);
      const response = await callGemini(prompt);
      setResult(response);

      // Count attack paths (rough heuristic)
      const pathCount = (response.match(/#{1,3}\s+\d+[\.\)]/g) || []).length || Math.max(1, Math.floor(response.length / 500));

      incrementStat("totalAnalyses");
      incrementStat("attackPaths", pathCount);

      // Extract domain for stats
      try {
        const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
        incrementStat("domainsTested");
        addToHistory({
          id: crypto.randomUUID(),
          target: url.hostname + url.pathname,
          type: analysisType === "URL" ? "url" : analysisType === "HTTP Request" ? "request" : "domain",
          pathsFound: pathCount,
          date: new Date().toLocaleDateString(),
          result: response,
        });
      } catch {
        addToHistory({
          id: crypto.randomUUID(),
          target: trimmed.slice(0, 60),
          type: "domain",
          pathsFound: pathCount,
          date: new Date().toLocaleDateString(),
          result: response,
        });
      }

      setResultTab("Attack Paths");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    if (resultTab === "Raw JSON") {
      return (
        <pre className="whitespace-pre-wrap text-xs font-mono text-foreground bg-muted/30 rounded-lg p-4 border border-border/50 max-h-[60vh] overflow-y-auto">
          {JSON.stringify({ target, depth, type: analysisType, result }, null, 2)}
        </pre>
      );
    }

    if (resultTab === "Explanation") {
      // Extract explanation section or show full result
      const explanationMatch = result.match(/(?:explanation|why.*interesting|overview)([\s\S]*?)(?=##|\*\*\d|$)/i);
      const explanation = explanationMatch ? explanationMatch[0] : result.split("\n\n").slice(0, 3).join("\n\n");
      return (
        <div className="prose-result whitespace-pre-wrap text-sm font-mono text-foreground leading-relaxed">
          {explanation}
        </div>
      );
    }

    // Attack Paths (default)
    return (
      <div className="prose-result whitespace-pre-wrap text-sm font-mono text-foreground leading-relaxed">
        {result}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Input area */}
      <div className="space-y-2">
        <label className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
          Paste Your Target
        </label>
        <textarea
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setError("");
          }}
          placeholder="https://example.com/api/user?id=45"
          rows={5}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors resize-y"
        />
        {error && <p className="text-xs text-destructive font-mono">{error}</p>}
      </div>

      {/* Options row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Depth toggle */}
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Depth</p>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {DEPTHS.map((d) => (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`px-4 py-2 text-xs font-mono transition-all ${
                  depth === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Type tabs */}
        <div className="space-y-1.5">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setAnalysisType(t)}
                className={`px-3 py-2 text-xs font-mono rounded-md border transition-all ${
                  analysisType === t
                    ? "border-secondary bg-secondary/10 text-secondary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed glow-primary"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              Analyze <ArrowRight size={16} />
            </>
          )}
        </button>
        <button
          onClick={() => {
            setTarget("");
            setResult("");
            setError("");
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-5 py-3 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
        >
          <Trash2 size={16} /> Clear
        </button>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {/* Result tabs */}
        <div className="flex border-b border-border/50">
          {RESULT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setResultTab(tab)}
              className={`px-4 py-2.5 text-xs font-mono transition-all border-b-2 -mb-px ${
                resultTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Result content */}
        <div className="rounded-xl border border-border bg-card p-5 min-h-[200px]">
          {loading ? (
            <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
              <Loader2 size={16} className="animate-spin text-primary" />
              Running {depth.toLowerCase()} analysis on {analysisType.toLowerCase()}…
            </div>
          ) : result ? (
            renderResult()
          ) : (
            <p className="text-sm font-mono text-muted-foreground/40 italic">
              Your attack paths will appear here...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analyzer;
