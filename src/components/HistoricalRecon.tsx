import { useState, useCallback } from "react";
import { History, ExternalLink, Copy, Check, Loader2, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { callGemini, safeParseJSON, GeminiError } from "@/lib/ai";
import { sanitizeInput } from "@/lib/sanitize";
import { toast } from "@/components/Toast";
import GeminiErrorDisplay from "@/components/GeminiErrorDisplay";

interface WhatToLookFor {
  item: string;
  reason: string;
  priority: string;
}

interface CommonFinding {
  finding: string;
  description: string;
  severity: string;
}

interface ReconResult {
  waybackUrls: string[];
  whatToLookFor: WhatToLookFor[];
  oldEndpoints: string;
  jsFiles: string;
  parameterMining: string;
  commonFindings: CommonFinding[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
};

function buildPrompt(domain: string): string {
  return `Generate a comprehensive Wayback Machine reconnaissance guide for the domain "${domain}" for bug bounty hunting.

Return JSON with these exact fields:
{
  "waybackUrls": ["list of 8-10 specific Wayback Machine search URLs targeting different interesting paths for ${domain}"],
  "whatToLookFor": [{"item": "what to look for", "reason": "why it matters for bug bounty", "priority": "high|medium|low"}],
  "oldEndpoints": "detailed guide on finding old API endpoints that may still be active",
  "jsFiles": "detailed guide on finding old JavaScript files that may contain API keys, secrets, or internal endpoints",
  "parameterMining": "detailed guide on finding old parameters that were removed from the live site but may still work server-side",
  "commonFindings": [{"finding": "finding name", "description": "description", "severity": "critical|high|medium|low"}]
}

Make waybackUrls real clickable URLs using web.archive.org/web/*/ format.
Include 8-10 whatToLookFor items and 6-8 commonFindings.
Return ONLY valid JSON.`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors" title="Copy">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-muted-foreground" />}
    </button>
  );
}

function CommandBlock({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/30 font-mono text-xs text-foreground/90">
      <Terminal size={12} className="text-primary shrink-0" />
      <code className="flex-1 select-all break-all">{command}</code>
      <CopyButton text={command} />
    </div>
  );
}

export default function HistoricalRecon({ domain }: { domain: string }) {
  const [result, setResult] = useState<ReconResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GeminiError | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [expandedSection, setExpandedSection] = useState<string | null>("wayback");

  const generate = useCallback(async () => {
    const clean = sanitizeInput(domain.trim());
    if (!clean) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCheckedItems(new Set());
    try {
      const raw = await callGemini(buildPrompt(clean), true);
      const parsed = safeParseJSON(raw) as ReconResult;
      setResult(parsed);
    } catch (e) {
      if (e instanceof GeminiError) setError(e);
      else toast.error("Failed to generate recon guide.");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon: React.ReactNode }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center gap-2 w-full text-left py-2 text-sm font-mono font-bold text-foreground hover:text-primary transition-colors"
    >
      {icon}
      {title}
      {expandedSection === id ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
    </button>
  );

  const toolCommands = [
    `waybackurls ${domain} | sort -u | tee wayback_${domain.replace(/\./g, "_")}.txt`,
    `waybackurls ${domain} | grep "\\.js$" | sort -u`,
    `waybackurls ${domain} | grep "api" | sort -u`,
    `waybackurls ${domain} | grep "admin" | sort -u`,
    `waybackurls ${domain} | grep -E "\\.(json|xml|yaml|yml|conf|env|bak|sql)$"`,
    `waybackurls ${domain} | grep -iE "(password|secret|token|key|auth)" | sort -u`,
    `waybackurls ${domain} | unfurl --unique keys`,
  ];

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 md:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary" />
          <h3 className="font-heading font-bold text-foreground text-sm">Historical Recon</h3>
          <span className="text-[10px] font-mono text-muted-foreground">Wayback Machine</span>
        </div>
        <Button onClick={generate} disabled={loading} size="sm" variant="outline" className="h-8 text-xs">
          {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <History size={12} className="mr-1" />}
          {loading ? "Generating…" : result ? "Regenerate" : "Generate Guide"}
        </Button>
      </div>

      {error && <GeminiErrorDisplay code={error.code} message={error.message} onRetry={generate} />}

      {/* Always show tool commands */}
      <div className="space-y-2">
        <SectionHeader id="commands" title="waybackurls Commands" icon={<Terminal size={14} className="text-primary" />} />
        {expandedSection === "commands" && (
          <div className="space-y-2 pl-1">
            {toolCommands.map((cmd, i) => (
              <CommandBlock key={i} command={cmd} />
            ))}
          </div>
        )}
      </div>

      {result && (
        <>
          {/* Wayback URLs */}
          <div className="space-y-2">
            <SectionHeader id="wayback" title={`Wayback Search URLs (${result.waybackUrls?.length || 0})`} icon={<ExternalLink size={14} className="text-primary" />} />
            {expandedSection === "wayback" && (
              <div className="space-y-1.5 pl-1">
                {result.waybackUrls?.map((url, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline break-all flex-1"
                    >
                      {url}
                    </a>
                    <CopyButton text={url} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* What to look for — checklist */}
          <div className="space-y-2">
            <SectionHeader
              id="checklist"
              title={`What to Look For (${checkedItems.size}/${result.whatToLookFor?.length || 0})`}
              icon={<Check size={14} className="text-primary" />}
            />
            {expandedSection === "checklist" && (
              <div className="space-y-1.5 pl-1">
                {result.whatToLookFor?.map((item, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border border-border/30 cursor-pointer transition-all hover:border-primary/30 ${
                      checkedItems.has(i) ? "bg-primary/5 opacity-60" : "bg-card/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checkedItems.has(i)}
                      onChange={() => toggleCheck(i)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold ${checkedItems.has(i) ? "line-through" : ""}`}>
                          {item.item}
                        </span>
                        <span className={`text-[10px] font-mono ${PRIORITY_COLORS[item.priority?.toLowerCase()] || "text-muted-foreground"}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.reason}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Guides: Old Endpoints, JS Files, Parameter Mining */}
          {[
            { id: "endpoints", title: "Old Endpoints", content: result.oldEndpoints },
            { id: "jsfiles", title: "JS Files & Secrets", content: result.jsFiles },
            { id: "params", title: "Parameter Mining", content: result.parameterMining },
          ].map(({ id, title, content }) => (
            <div key={id} className="space-y-2">
              <SectionHeader id={id} title={title} icon={<Terminal size={14} className="text-primary" />} />
              {expandedSection === id && (
                <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
                  <p className="text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed">{content}</p>
                </div>
              )}
            </div>
          ))}

          {/* Common Findings */}
          <div className="space-y-2">
            <SectionHeader id="findings" title={`Common Findings (${result.commonFindings?.length || 0})`} icon={<History size={14} className="text-primary" />} />
            {expandedSection === "findings" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {result.commonFindings?.map((f, i) => (
                  <Card key={i} className="bg-card/40 border-border/30">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] border ${SEVERITY_COLORS[f.severity?.toLowerCase()] || ""}`}>
                          {f.severity}
                        </Badge>
                        <span className="text-xs font-mono font-bold text-foreground">{f.finding}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{f.description}</p>
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
