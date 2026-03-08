import { useState, useEffect } from "react";
import { Trash2, ArrowRight, Loader2, WifiOff } from "lucide-react";
import useOnline from "@/hooks/useOnline";
import { callGemini, GeminiError, type GeminiErrorCode } from "@/lib/gemini";
import GeminiErrorDisplay from "@/components/GeminiErrorDisplay";
import { addToHistory, incrementStat } from "@/lib/store";
import { checkAnalysisAchievements, checkDeepAnalysis, checkCriticalFound, checkJwtAnalysis } from "@/lib/achievements";
import { parseTarget, contextToPromptBlock } from "@/lib/parseTarget";
import { startTypingSound, stopTypingSound } from "@/lib/sounds";
import JwtAnalyzer from "@/components/JwtAnalyzer";
import HttpRequestAnalyzer from "@/components/HttpRequestAnalyzer";
import BatchAnalyzer from "@/components/BatchAnalyzer";

const DEPTHS = ["Quick", "Standard", "Deep"] as const;
const TYPES = ["URL", "HTTP Request", "JWT Token", "GraphQL"] as const;
const RESULT_TABS = ["Attack Paths", "Explanation", "Raw JSON"] as const;
const PAGE_TABS = ["URL Analyzer", "HTTP Request", "JWT Decoder", "Batch"] as const;

type Depth = (typeof DEPTHS)[number];
type AnalysisType = (typeof TYPES)[number];

interface TargetTemplate {
  label: string;
  example: string;
  context: string;
}

const TARGET_TEMPLATES: TargetTemplate[] = [
  { label: "REST API Endpoint", example: "https://api.example.com/v2/users/1337/profile?include=billing", context: "This is a REST API endpoint. Focus especially on IDOR via numeric/sequential IDs, broken object-level authorization, mass assignment, parameter tampering, rate limiting bypass, and API versioning exploits." },
  { label: "Login Page", example: "https://example.com/auth/login", context: "This is a login/authentication endpoint. Focus especially on credential stuffing, brute force protection bypass, username enumeration via error messages/timing, SQL injection in login fields, authentication bypass, default credentials, and session fixation after login." },
  { label: "File Upload", example: "https://example.com/api/upload?type=avatar&user_id=42", context: "This is a file upload endpoint. Focus especially on unrestricted file type uploads (web shells), path traversal in filename, content-type validation bypass, file size DoS, EXIF data injection, SVG XSS, polyglot files, and storage bucket misconfiguration." },
  { label: "Admin Panel", example: "https://example.com/admin/dashboard", context: "This is an admin panel. Focus especially on authentication bypass, privilege escalation from regular user, forced browsing to admin routes, CSRF on admin actions, insecure direct object references, default admin credentials, and missing role-based access controls." },
  { label: "Payment Flow", example: "https://example.com/api/checkout?item_id=99&qty=1&price=4999", context: "This is a payment/checkout flow. Focus especially on price manipulation, quantity tampering, currency confusion, race conditions on payment processing, coupon/discount abuse, order total modification, payment callback forgery, and business logic flaws in cart calculations." },
  { label: "Search Function", example: "https://example.com/search?q=test&page=1&sort=relevance", context: "This is a search endpoint. Focus especially on reflected XSS via search parameters, SQL injection in search queries, LDAP injection, server-side template injection (SSTI), search filter bypass, information disclosure via error messages, and denial of service via expensive queries." },
  { label: "Password Reset", example: "https://example.com/auth/reset-password?token=abc123&email=user@test.com", context: "This is a password reset flow. Focus especially on token prediction/brute force, host header injection for link manipulation, token reuse, race conditions, user enumeration, email parameter injection, and password reset poisoning via manipulated reset links." },
  { label: "OAuth Endpoint", example: "https://example.com/oauth/callback?code=AUTH_CODE&state=xyz&redirect_uri=https://app.example.com", context: "This is an OAuth/SSO endpoint. Focus especially on open redirect via redirect_uri manipulation, CSRF via missing/weak state parameter, authorization code replay, scope escalation, token leakage in referrer headers, and client_id/secret exposure." },
  { label: "GraphQL API", example: "https://example.com/graphql", context: "This is a GraphQL API endpoint. Focus especially on introspection query disclosure, nested query DoS (batching attacks), authorization bypass on mutations, field-level access control issues, SQL injection via variables, and information disclosure through verbose error messages." },
  { label: "WebSocket", example: "wss://example.com/ws/chat?token=eyJhbG...", context: "This is a WebSocket endpoint. Focus especially on missing origin validation, authentication bypass after initial handshake, cross-site WebSocket hijacking (CSWSH), injection via WebSocket messages, lack of rate limiting, and insecure token transmission in connection URL." },
];

const buildPrompt = (target: string, depth: Depth, type: AnalysisType, templateContext?: string): string => {
  const depthInstruction =
    depth === "Quick"
      ? "Provide a brief, concise analysis with the top 5 most critical attack paths."
      : depth === "Deep"
        ? "Provide an exhaustive, extremely detailed analysis with every possible attack vector, edge case, and bypass technique. Include at least 15-20 attack paths."
        : "Provide a thorough analysis with 8-12 attack paths covering major vulnerability categories.";

  const ctx = parseTarget(target);
  const contextBlock = contextToPromptBlock(ctx);

  return `You are an elite bug bounty hunter and penetration tester. Analyze the following ${type} target for security vulnerabilities.

Target:
${target}

${contextBlock}

${templateContext ? `## Target Type Context\n${templateContext}\n` : ""}
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
  const online = useOnline();
  const [pageTab, setPageTab] = useState<(typeof PAGE_TABS)[number]>("URL Analyzer");
  const [target, setTarget] = useState("");
  const [depth, setDepth] = useState<Depth>("Standard");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("URL");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState<GeminiErrorCode | null>(null);
  const [resultTab, setResultTab] = useState<(typeof RESULT_TABS)[number]>("Attack Paths");
  const [selectedTemplate, setSelectedTemplate] = useState<TargetTemplate | null>(null);

  // Check for prefill from OWASP page
  useEffect(() => {
    const raw = sessionStorage.getItem("hackmind_prefill");
    if (raw) {
      try {
        const { target: t, templateContext } = JSON.parse(raw);
        if (t) setTarget(t);
        if (templateContext) {
          const match = TARGET_TEMPLATES.find((tmpl) => tmpl.context === templateContext);
          if (match) setSelectedTemplate(match);
          else setSelectedTemplate({ label: "OWASP", example: t || "", context: templateContext });
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem("hackmind_prefill");
    }
  }, []);

  // Keyboard shortcuts: Ctrl+Enter = run, Ctrl+L = clear
  // Keyboard shortcuts: Ctrl+Enter = run, Ctrl+L = clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!loading && pageTab === "URL Analyzer") {
          document.dispatchEvent(new CustomEvent("hackmind:run-analysis"));
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        setTarget("");
        setResult("");
        setError("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loading, pageTab]);

  // Listen for keyboard shortcut event
  useEffect(() => {
    const run = () => { if (!loading) handleAnalyze(); };
    document.addEventListener("hackmind:run-analysis", run);
    return () => document.removeEventListener("hackmind:run-analysis", run);
  });

  const handleAnalyze = async () => {
    const trimmed = target.trim();
    if (!trimmed) {
      setError("Please paste a target to analyze.");
      return;
    }

    setLoading(true);
    setError("");
    setErrorCode(null);
    setResult("");
    startTypingSound();

    try {
      const prompt = buildPrompt(trimmed, depth, analysisType, selectedTemplate?.context);
      const response = await callGemini(prompt);
      setResult(response);

      // Count attack paths (rough heuristic)
      const pathCount = (response.match(/#{1,3}\s+\d+[\.\)]/g) || []).length || Math.max(1, Math.floor(response.length / 500));

      incrementStat("totalAnalyses");
      incrementStat("attackPaths", pathCount);
      checkAnalysisAchievements();
      if (depth === "Deep") checkDeepAnalysis();
      if (/critical/i.test(response)) checkCriticalFound();
      if (analysisType === "JWT Token") checkJwtAnalysis();

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
      if (e instanceof GeminiError) {
        setError(e.message);
        setErrorCode(e.code);
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed.");
        setErrorCode("API_ERROR");
      }
    } finally {
      stopTypingSound();
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page-level tabs — scrollable on mobile */}
      <div className="flex border-b border-border/50 mb-2 overflow-x-auto scrollbar-thin">
        {PAGE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setPageTab(tab)}
            className={`shrink-0 px-4 md:px-5 py-3 text-sm font-heading font-bold transition-all border-b-2 -mb-px min-h-[2.75rem] ${
              pageTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {pageTab === "JWT Decoder" ? (
        <JwtAnalyzer />
      ) : pageTab === "HTTP Request" ? (
        <HttpRequestAnalyzer />
      ) : pageTab === "Batch" ? (
        <BatchAnalyzer />
      ) : (
      <>
      {/* Input area */}
      <div className="space-y-2">
        <label className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
          Paste Your Target
        </label>
        <textarea
          data-tour="analyzer-input"
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setError("");
          }}
          placeholder="https://example.com/api/user?id=45"
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm md:text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors resize-y min-h-[6rem] md:min-h-0"
        />
        {error && errorCode && (
          <GeminiErrorDisplay code={errorCode} message={error} onRetry={handleAnalyze} />
        )}
        {error && !errorCode && <p className="text-xs text-destructive font-mono">{error}</p>}
      </div>

      {/* Target Templates */}
      <div className="space-y-1.5">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Target Templates</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {TARGET_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.label}
              onClick={() => {
                setTarget(tmpl.example);
                setSelectedTemplate(selectedTemplate?.label === tmpl.label ? null : tmpl);
                setError("");
              }}
              className={`shrink-0 px-3 py-1.5 text-xs font-mono rounded-full border transition-all whitespace-nowrap ${
                selectedTemplate?.label === tmpl.label
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {tmpl.label}
            </button>
          ))}
        </div>
        {selectedTemplate && (
          <p className="text-[10px] font-mono text-primary/70 leading-relaxed">
            ✦ AI will focus on: {selectedTemplate.context.split("Focus especially on ")[1]?.slice(0, 120)}…
          </p>
        )}
      </div>

      {/* Options row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Depth toggle */}
        <div className="space-y-1.5" data-tour="depth-selector">
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
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleAnalyze}
          disabled={loading || !online}
          title={!online ? "Requires internet for AI analysis" : "Ctrl+Enter"}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 md:py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed glow-primary min-h-[2.75rem]"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Analyzing…
            </>
          ) : !online ? (
            <>
              <WifiOff size={16} /> Offline
            </>
          ) : (
            <>
              Analyze <ArrowRight size={16} />
              <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 rounded border border-primary-foreground/30 text-[10px] font-mono opacity-70">⌘↵</kbd>
            </>
          )}
        </button>
        <button
          onClick={() => {
            setTarget("");
            setResult("");
            setError("");
          }}
          title="Ctrl+L"
          className="flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-3.5 md:py-3 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all min-h-[2.75rem]"
        >
          <Trash2 size={16} /> Clear
          <kbd className="hidden sm:inline-flex ml-1 px-1.5 py-0.5 rounded border border-border text-[10px] font-mono opacity-50">⌘L</kbd>
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
      </>
      )}
    </div>
  );
};

export default Analyzer;
