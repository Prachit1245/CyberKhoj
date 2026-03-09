import { useState, useMemo, useCallback } from "react";
import { Search, Copy, Check, Download, Loader2, Globe, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { callGemini, safeParseJSON, GeminiError } from "@/lib/ai";
import { sanitizeInput } from "@/lib/sanitize";
import { toast } from "@/components/Toast";
import GeminiErrorDisplay from "@/components/GeminiErrorDisplay";

const COMMON_PATHS = [
  "/api", "/api/v1", "/api/v2", "/api/v3", "/api/v4",
  "/swagger", "/swagger-ui.html", "/swagger-ui", "/swagger.json", "/swagger.yaml",
  "/api-docs", "/api-docs.json", "/docs", "/docs/api",
  "/graphql", "/graphiql", "/playground",
  "/rest", "/rest/v1", "/rest/v2",
  "/.well-known/openid-configuration", "/.well-known/security.txt", "/.well-known/change-password",
  "/health", "/healthz", "/health/check", "/status", "/ping",
  "/admin", "/admin/api", "/admin/login",
  "/auth", "/auth/login", "/auth/token", "/oauth/token", "/oauth/authorize",
  "/users", "/users/me", "/user/profile",
  "/config", "/configuration", "/settings", "/env",
  "/debug", "/debug/vars", "/debug/pprof",
  "/metrics", "/prometheus", "/actuator", "/actuator/health", "/actuator/env",
  "/info", "/version", "/about",
  "/sitemap.xml", "/robots.txt", "/.env", "/.git/config",
  "/wp-json", "/wp-json/wp/v2/users",
  "/server-status", "/server-info",
  "/phpinfo.php", "/info.php",
  "/console", "/shell", "/terminal",
];

interface AIPrediction {
  endpoint: string;
  reasoning: string;
  likelihood: string;
}

function buildPrompt(url: string): string {
  return `Based on this URL "${url}", predict 10 specific API endpoints most likely to exist on this target.
Consider technology stack hints in the URL (path patterns, file extensions, framework clues).

Return a JSON array of objects:
[{"endpoint": "/full/path", "reasoning": "why this endpoint likely exists", "likelihood": "high|medium|low"}]

Be specific and creative. Consider the domain name, URL structure, and common patterns for the detected tech stack. Return ONLY the JSON array.`;
}

export default function ApiDiscovery() {
  const [baseUrl, setBaseUrl] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<AIPrediction[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<GeminiError | null>(null);

  const normalizedBase = useMemo(() => {
    let u = baseUrl.trim().replace(/\/+$/, "");
    if (u && !u.startsWith("http")) u = "https://" + u;
    return u;
  }, [baseUrl]);

  const fullUrls = useMemo(() => {
    if (!normalizedBase) return [];
    return COMMON_PATHS.map((p) => normalizedBase + p);
  }, [normalizedBase]);

  const copyUrl = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(fullUrls.join("\n"));
    toast.success(`Copied ${fullUrls.length} URLs to clipboard.`);
  };

  const downloadTxt = () => {
    const blob = new Blob([fullUrls.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `api-paths-${new URL(normalizedBase).hostname}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Downloaded as .txt");
  };

  const generatePredictions = useCallback(async () => {
    const clean = sanitizeInput(normalizedBase);
    if (!clean) return;
    setAiLoading(true);
    setAiError(null);
    setPredictions([]);
    try {
      const raw = await callGemini(buildPrompt(clean), true);
      const parsed = safeParseJSON(raw);
      setPredictions(Array.isArray(parsed) ? parsed : parsed.endpoints ?? []);
    } catch (e) {
      if (e instanceof GeminiError) setAiError(e);
      else toast.error("Failed to generate predictions.");
    } finally {
      setAiLoading(false);
    }
  }, [normalizedBase]);

  const LIKELIHOOD_COLORS: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Base URL</label>
        <Input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://example.com"
          className="font-mono"
        />
      </div>

      {normalizedBase && (
        <>
          {/* Section 1: Common API Paths */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-primary" />
                <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">
                  Common API Paths ({fullUrls.length})
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground">instant • no API</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copyAll}>
                  <Copy size={12} className="mr-1" /> Copy All
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={downloadTxt}>
                  <Download size={12} className="mr-1" /> Download .txt
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/30 bg-muted/20 max-h-[300px] overflow-y-auto">
              {fullUrls.map((url, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-border/10 last:border-b-0 hover:bg-muted/30 group text-xs"
                >
                  <code className="flex-1 font-mono text-foreground/80 break-all select-all">{url}</code>
                  <button
                    onClick={() => copyUrl(url, i)}
                    className="shrink-0 p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    {copiedIdx === i ? <Check size={10} className="text-green-400" /> : <Copy size={10} className="text-muted-foreground" />}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ExternalLink size={10} className="text-muted-foreground" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: AI Predictions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">
                  AI Endpoint Predictions
                </h3>
              </div>
              <Button size="sm" onClick={generatePredictions} disabled={aiLoading} className="h-8 text-xs">
                {aiLoading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
                {aiLoading ? "Predicting…" : predictions.length ? "Regenerate" : "Predict Endpoints"}
              </Button>
            </div>

            {aiError && <GeminiErrorDisplay code={aiError.code} message={aiError.message} onRetry={generatePredictions} />}

            {predictions.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {predictions.map((p, i) => (
                  <Card key={i} className="bg-card/40 border-border/30 hover:border-primary/30 transition-colors">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] border ${LIKELIHOOD_COLORS[p.likelihood?.toLowerCase()] || ""}`}>
                          {p.likelihood}
                        </Badge>
                        <code className="text-xs font-mono font-bold text-foreground break-all">{p.endpoint}</code>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{p.reasoning}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyUrl(normalizedBase + p.endpoint, 1000 + i)}
                          className="text-[10px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          {copiedIdx === 1000 + i ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                          Copy full URL
                        </button>
                        <a
                          href={normalizedBase + p.endpoint}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={10} /> Open
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
