import { useState, useCallback } from "react";
import { FileText, Copy, Check, Download, Loader2, Shield, Globe, Key, Server, ChevronDown, ChevronUp, Terminal, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callGemini, safeParseJSON, GeminiError } from "@/lib/ai";
import { toast } from "@/components/Toast";
import GeminiErrorDisplay from "@/components/GeminiErrorDisplay";
import type { DetectedTech } from "@/lib/techDetector";

/* ── Types ── */
interface Finding { finding: string; detail: string; severity?: string }
interface SurfaceArea { findings: Finding[]; riskLevel: string }
interface PrioritizedTarget { target: string; why: string; attackIdeas: string[]; priority: string }
interface ToolRec { tool: string; purpose: string; command: string }

export interface ReconReportData {
  executiveSummary: string;
  attackSurface: {
    webApplication: SurfaceArea;
    apiEndpoints: SurfaceArea;
    authentication: SurfaceArea;
    infrastructure: SurfaceArea;
  };
  prioritizedTargets: PrioritizedTarget[];
  recommendedTooling: ToolRec[];
  estimatedTimeToTest: string;
  difficultyRating: string;
}

/* ── Prompt ── */
function buildPrompt(domain: string, techs: DetectedTech[], apiPaths: string[]): string {
  const techList = techs.map(t => t.name).join(", ") || "unknown";
  return `You are an elite bug bounty recon specialist. Generate a comprehensive reconnaissance report for "${domain}".

Detected technologies: ${techList}
API paths checked: ${apiPaths.length} common paths

Return JSON with this exact structure:
{
  "executiveSummary": "2-3 paragraph executive summary of the target's attack surface",
  "attackSurface": {
    "webApplication": { "findings": [{"finding":"...","detail":"...","severity":"critical|high|medium|low"}], "riskLevel": "critical|high|medium|low" },
    "apiEndpoints": { "findings": [...], "riskLevel": "..." },
    "authentication": { "findings": [...], "riskLevel": "..." },
    "infrastructure": { "findings": [...], "riskLevel": "..." }
  },
  "prioritizedTargets": [
    { "target": "specific endpoint or area", "why": "reason", "attackIdeas": ["idea1","idea2","idea3"], "priority": "critical|high|medium|low" }
  ],
  "recommendedTooling": [
    { "tool": "tool name", "purpose": "what it does", "command": "exact command to run" }
  ],
  "estimatedTimeToTest": "e.g. 4-6 hours for quick assessment",
  "difficultyRating": "beginner|intermediate|advanced"
}

Include 3-4 findings per attack surface area, 5-8 prioritized targets, and 6-8 tool recommendations with real commands for ${domain}.
Return ONLY valid JSON.`;
}

/* ── Colors ── */
const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const SURFACE_ICONS: Record<string, React.ReactNode> = {
  webApplication: <Globe size={14} />,
  apiEndpoints: <Key size={14} />,
  authentication: <Shield size={14} />,
  infrastructure: <Server size={14} />,
};

const SURFACE_LABELS: Record<string, string> = {
  webApplication: "Web Application",
  apiEndpoints: "API Endpoints",
  authentication: "Authentication",
  infrastructure: "Infrastructure",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

/* ── Helpers ── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-muted-foreground" />}
    </button>
  );
}

function toMarkdown(domain: string, r: ReconReportData): string {
  let md = `# Recon Report: ${domain}\n\n`;
  md += `## Executive Summary\n\n${r.executiveSummary}\n\n`;
  md += `**Difficulty:** ${r.difficultyRating} | **Estimated Time:** ${r.estimatedTimeToTest}\n\n`;
  md += `---\n\n## Attack Surface\n\n`;
  for (const [key, area] of Object.entries(r.attackSurface)) {
    md += `### ${SURFACE_LABELS[key] || key} (Risk: ${area.riskLevel})\n\n`;
    for (const f of area.findings) {
      md += `- **${f.finding}** [${f.severity || "info"}]: ${f.detail}\n`;
    }
    md += "\n";
  }
  md += `---\n\n## Prioritized Targets\n\n`;
  for (const t of r.prioritizedTargets) {
    md += `### ${t.target} [${t.priority}]\n\n${t.why}\n\n`;
    for (const idea of t.attackIdeas) md += `- ${idea}\n`;
    md += "\n";
  }
  md += `---\n\n## Recommended Tooling\n\n`;
  for (const t of r.recommendedTooling) {
    md += `### ${t.tool}\n\n${t.purpose}\n\n\`\`\`\n${t.command}\n\`\`\`\n\n`;
  }
  return md;
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── Save to localStorage ── */
function saveReconReport(domain: string, report: ReconReportData) {
  try {
    const key = "hackmind_recon_reports";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift({ domain, date: new Date().toISOString(), report });
    if (existing.length > 20) existing.length = 20;
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* quota exceeded */ }
}

/* ── Component ── */
interface Props {
  domain: string;
  techs: DetectedTech[];
  apiPaths: string[];
}

export default function ReconReport({ domain, techs, apiPaths }: Props) {
  const [report, setReport] = useState<ReconReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GeminiError | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const raw = await callGemini(buildPrompt(domain, techs, apiPaths), true);
      const parsed = safeParseJSON(raw) as ReconReportData;
      setReport(parsed);
      saveReconReport(domain, parsed);
      toast.success("Recon report generated and saved.");
    } catch (e) {
      if (e instanceof GeminiError) setError(e);
      else toast.error("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }, [domain, techs, apiPaths]);

  const toggle = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const SectionHead = ({ id, title, icon, badge }: { id: string; title: string; icon: React.ReactNode; badge?: string }) => (
    <button onClick={() => toggle(id)} className="flex items-center gap-2 w-full text-left py-2 text-sm font-mono font-bold text-foreground hover:text-primary transition-colors">
      <span className="text-primary">{icon}</span>
      {title}
      {badge && <Badge variant="outline" className={`text-[10px] ml-1 border ${RISK_COLORS[badge.toLowerCase()] || ""}`}>{badge}</Badge>}
      {expandedSection === id ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
    </button>
  );

  return (
    <div className="md:col-span-2 space-y-4">
      {/* Generate Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <h3 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest">Recon Report</h3>
        </div>
        <div className="flex gap-2">
          {report && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { downloadFile(toMarkdown(domain, report), `recon-${domain}.md`, "text/markdown"); toast.success("Exported as Markdown."); }}>
                <Download size={12} className="mr-1" /> Markdown
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { downloadFile(JSON.stringify(report, null, 2), `recon-${domain}.json`, "application/json"); toast.success("Exported as JSON."); }}>
                <Download size={12} className="mr-1" /> JSON
              </Button>
            </>
          )}
          <Button onClick={generate} disabled={loading} size="sm" className="h-8 text-xs">
            {loading ? <Loader2 size={12} className="animate-spin mr-1" /> : <Sparkles size={12} className="mr-1" />}
            {loading ? "Generating…" : report ? "Regenerate" : "Generate Report"}
          </Button>
        </div>
      </div>

      {error && <GeminiErrorDisplay code={error.code} message={error.message} onRetry={generate} />}

      {report && (
        <Card className="bg-card/60 border-border/50">
          <CardContent className="p-4 md:p-5 space-y-4">

            {/* Meta */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant="outline" className={`text-xs border ${DIFFICULTY_COLORS[report.difficultyRating?.toLowerCase()] || ""}`}>
                {report.difficultyRating}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">⏱ {report.estimatedTimeToTest}</span>
            </div>

            {/* Executive Summary */}
            <div>
              <SectionHead id="summary" title="Executive Summary" icon={<FileText size={14} />} />
              {expandedSection === "summary" && (
                <p className="text-sm font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap pl-1">{report.executiveSummary}</p>
              )}
            </div>

            {/* Attack Surface */}
            {Object.entries(report.attackSurface || {}).map(([key, area]) => (
              <div key={key}>
                <SectionHead id={key} title={SURFACE_LABELS[key] || key} icon={SURFACE_ICONS[key] || <Shield size={14} />} badge={area.riskLevel} />
                {expandedSection === key && (
                  <div className="space-y-2 pl-1">
                    {area.findings?.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-border/20 bg-muted/10 p-2.5">
                        <Badge variant="outline" className={`text-[10px] mt-0.5 shrink-0 border ${RISK_COLORS[f.severity?.toLowerCase() || ""] || ""}`}>
                          {f.severity || "info"}
                        </Badge>
                        <div>
                          <p className="text-xs font-mono font-bold text-foreground">{f.finding}</p>
                          <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">{f.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Prioritized Targets */}
            <div>
              <SectionHead id="targets" title={`Prioritized Targets (${report.prioritizedTargets?.length || 0})`} icon={<Shield size={14} />} />
              {expandedSection === "targets" && (
                <div className="space-y-2 pl-1">
                  {report.prioritizedTargets?.map((t, i) => (
                    <div key={i} className="rounded-lg border border-border/20 bg-muted/10 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] border ${RISK_COLORS[t.priority?.toLowerCase()] || ""}`}>{t.priority}</Badge>
                        <span className="text-xs font-mono font-bold text-foreground">{t.target}</span>
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground">{t.why}</p>
                      <ul className="space-y-0.5">
                        {t.attackIdeas?.map((idea, j) => (
                          <li key={j} className="text-[11px] font-mono text-foreground/70 flex items-start gap-1.5">
                            <span className="text-primary mt-0.5 shrink-0">▸</span>{idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Tooling */}
            <div>
              <SectionHead id="tools" title={`Recommended Tools (${report.recommendedTooling?.length || 0})`} icon={<Terminal size={14} />} />
              {expandedSection === "tools" && (
                <div className="space-y-2 pl-1">
                  {report.recommendedTooling?.map((t, i) => (
                    <div key={i} className="rounded-lg border border-border/20 bg-muted/10 p-3 space-y-1.5">
                      <p className="text-xs font-mono font-bold text-foreground">{t.tool}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{t.purpose}</p>
                      <div className="flex items-center gap-2 bg-muted/30 rounded px-2.5 py-1.5 border border-border/20">
                        <Terminal size={10} className="text-primary shrink-0" />
                        <code className="flex-1 text-[11px] font-mono text-foreground/80 break-all select-all">{t.command}</code>
                        <CopyBtn text={t.command} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}
