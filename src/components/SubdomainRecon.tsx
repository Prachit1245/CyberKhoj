import { useState, useCallback } from "react";
import { Globe, Copy, Loader2, AlertTriangle, ChevronDown, ChevronRight, Terminal, Search as SearchIcon, ExternalLink } from "lucide-react";
import { callGemini, GeminiError, safeParseJSON } from "@/lib/ai";
import { toast } from "@/components/Toast";
import { sanitizeInput } from "@/lib/sanitize";
import { handleAPIError } from "@/lib/errorHandler";

/* ── Types ── */
interface HighValueTarget {
  subdomain: string;
  reason: string;
  vulnerabilityLikelihood: "high" | "medium" | "low";
}

interface WordlistCategory {
  category: string;
  examples: string[];
}

interface ReconTool {
  name: string;
  command: string;
  description: string;
}

interface SubdomainReconResult {
  commonSubdomains: string[];
  highValueTargets: HighValueTarget[];
  wordlistCategories: WordlistCategory[];
  tools: ReconTool[];
  googleDorks: string[];
  crtShQuery: string;
}

/* ── Prompt builder ── */
function buildSubdomainReconPrompt(domain: string): string {
  return `Generate a comprehensive subdomain reconnaissance guide for ${domain}.

Return JSON only, no markdown, no explanation. Use this exact schema:

{
  "commonSubdomains": ["admin", "api", "dev", ...],
  "highValueTargets": [{ "subdomain": "admin", "reason": "...", "vulnerabilityLikelihood": "high" }],
  "wordlistCategories": [{ "category": "Infrastructure", "examples": ["vpn", "proxy", "gateway"] }],
  "tools": [{ "name": "subfinder", "command": "subfinder -d ${domain} -silent", "description": "..." }],
  "googleDorks": ["site:*.${domain}", "intitle:index of site:${domain}"],
  "crtShQuery": "%.${domain}"
}

Requirements:
- commonSubdomains: exactly 50 unique subdomains sorted by discovery likelihood (admin, api, dev, staging, mail, vpn, cdn, app, test, beta, etc.)
- highValueTargets: 10-15 subdomains with security analysis
- wordlistCategories: 5-7 categories (Infrastructure, Development, Cloud, Email, API, Internal, Legacy)
- tools: 6-8 popular recon tools with exact commands for this domain
- googleDorks: 8-10 Google dork queries for subdomain discovery
- crtShQuery: certificate transparency query string`;
}

/* ── Collapsible Section ── */
const Section = ({ title, icon, count, defaultOpen = true, children }: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border/30 bg-card/30 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      >
        {open ? <ChevronDown size={14} className="text-primary" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        <span className="text-primary">{icon}</span>
        <span className="text-sm font-heading font-bold text-foreground">{title}</span>
        {count !== undefined && (
          <span className="ml-auto text-xs font-mono text-muted-foreground">{count}</span>
        )}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

/* ── Copy helper ── */
function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copied ✓`),
    () => toast.error("Copy failed")
  );
}

/* ── Likelihood color ── */
function likelihoodColor(level: string) {
  switch (level) {
    case "high": return "text-red-400 border-red-400/30 bg-red-400/5";
    case "medium": return "text-orange-400 border-orange-400/30 bg-orange-400/5";
    case "low": return "text-emerald-400 border-emerald-400/30 bg-emerald-400/5";
    default: return "text-muted-foreground border-border/30";
  }
}

/* ── Main Component ── */
const SubdomainRecon = ({ domain }: { domain: string }) => {
  const [result, setResult] = useState<SubdomainReconResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!domain.trim()) {
      toast.error("Enter a domain first");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sanitized = sanitizeInput(domain.trim());
      const raw = await callGemini(buildSubdomainReconPrompt(sanitized), true);
      const parsed = safeParseJSON(raw) as SubdomainReconResult;

      // Validate structure
      if (!parsed.commonSubdomains || !Array.isArray(parsed.commonSubdomains)) {
        throw new Error("Invalid response structure");
      }

      setResult(parsed);
      toast.success(`Subdomain recon generated for ${sanitized} ✓`);
    } catch (err) {
      if (err instanceof GeminiError) {
        setError(err.message);
      } else {
        setError(handleAPIError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [domain]);

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading || !domain.trim()}
          className="flex items-center gap-2 h-10 px-5 rounded-lg font-heading font-bold text-sm text-primary-foreground bg-primary hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
          {loading ? "Generating Recon…" : "Generate Subdomain Recon"}
        </button>
        <span className="text-xs font-mono text-muted-foreground">
          for <span className="text-primary">{domain || "…"}</span>
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* ── Subdomain Wordlist ── */}
          <Section title="Subdomain Wordlist" icon={<Globe size={14} />} count={result.commonSubdomains.length}>
            <div className="space-y-2">
              <button
                onClick={() => copyText(result.commonSubdomains.join("\n"), "Wordlist")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-all"
              >
                <Copy size={12} />
                Copy All ({result.commonSubdomains.length} subdomains)
              </button>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                {result.commonSubdomains.map((sub, i) => (
                  <span
                    key={i}
                    className="text-xs font-mono text-foreground/80 bg-muted/20 rounded px-2 py-1 truncate"
                    title={`${sub}.${domain}`}
                  >
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </Section>

          {/* ── High Value Targets ── */}
          <Section title="High Value Targets" icon={<AlertTriangle size={14} />} count={result.highValueTargets.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-2 pr-3 text-muted-foreground font-normal">Subdomain</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-normal">Reason</th>
                    <th className="text-left py-2 text-muted-foreground font-normal">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {result.highValueTargets.map((target, i) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-muted/10">
                      <td className="py-2 pr-3">
                        <span className="text-primary">{target.subdomain}</span>
                        <span className="text-muted-foreground">.{domain}</span>
                      </td>
                      <td className="py-2 pr-3 text-foreground/80 max-w-xs">{target.reason}</td>
                      <td className="py-2">
                        <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${likelihoodColor(target.vulnerabilityLikelihood)}`}>
                          {target.vulnerabilityLikelihood}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Wordlist Categories ── */}
          {result.wordlistCategories && result.wordlistCategories.length > 0 && (
            <Section title="Wordlist Categories" icon={<SearchIcon size={14} />} count={result.wordlistCategories.length} defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.wordlistCategories.map((cat, i) => (
                  <div key={i} className="rounded-md border border-border/20 bg-muted/10 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-heading font-bold text-foreground">{cat.category}</span>
                      <button
                        onClick={() => copyText(cat.examples.join("\n"), cat.category)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Copy category wordlist"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cat.examples.map((ex, j) => (
                        <span key={j} className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-1.5 py-0.5">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Tools ── */}
          <Section title="Recon Tools" icon={<Terminal size={14} />} count={result.tools.length}>
            <div className="space-y-2">
              {result.tools.map((tool, i) => (
                <div key={i} className="rounded-md border border-border/20 bg-muted/10 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-primary">{tool.name}</span>
                    <button
                      onClick={() => copyText(tool.command, tool.name)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-[10px] font-mono"
                    >
                      <Copy size={10} />
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-foreground bg-background/50 rounded px-3 py-2 overflow-x-auto border border-border/10">
                    {tool.command}
                  </pre>
                  <p className="text-[10px] font-mono text-muted-foreground">{tool.description}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Google Dorks ── */}
          <Section title="Google Dorks" icon={<SearchIcon size={14} />} count={result.googleDorks.length}>
            <div className="space-y-1.5">
              <button
                onClick={() => copyText(result.googleDorks.join("\n"), "All dorks")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-all mb-2"
              >
                <Copy size={12} />
                Copy All Dorks
              </button>
              {result.googleDorks.map((dork, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <pre className="flex-1 text-xs font-mono text-foreground bg-background/50 rounded px-3 py-1.5 overflow-x-auto border border-border/10">
                    {dork}
                  </pre>
                  <button
                    onClick={() => copyText(dork, "Dork")}
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy"
                  >
                    <Copy size={12} />
                  </button>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(dork)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    title="Search in Google"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              ))}
            </div>
          </Section>

          {/* ── crt.sh Query ── */}
          {result.crtShQuery && (
            <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-card/30 px-4 py-3">
              <span className="text-xs font-mono text-muted-foreground">crt.sh query:</span>
              <code className="text-xs font-mono text-primary flex-1">{result.crtShQuery}</code>
              <button
                onClick={() => copyText(result.crtShQuery, "crt.sh query")}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Copy size={12} />
              </button>
              <a
                href={`https://crt.sh/?q=${encodeURIComponent(result.crtShQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Open in crt.sh"
              >
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubdomainRecon;
