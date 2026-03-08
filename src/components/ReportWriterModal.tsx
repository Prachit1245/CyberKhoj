import { useState } from "react";
import { X, Loader2, Copy, Check, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { callGemini } from "@/lib/gemini";
import type { Finding } from "@/lib/findings";

interface Props {
  finding: Finding;
  onClose: () => void;
}

const buildReportPrompt = (f: Finding): string =>
  `You are an expert bug bounty report writer. Write a professional, clear, well-formatted vulnerability report for submission to ${f.platform} based on the following finding data.

## Finding Data
- **Title**: ${f.title}
- **Target**: ${f.targetDomain}
- **Vulnerability Type**: ${f.vulnType}
- **Severity**: ${f.severity}
- **Status**: ${f.status}
- **Description**: ${f.description || "Not provided"}
- **Steps to Reproduce**: ${f.stepsToReproduce || "Not provided"}
- **PoC Note**: ${f.pocNote || "Not provided"}
${f.bountyEarned ? `- **Bounty**: $${f.bountyEarned}` : ""}

## Instructions
Write the report with the following sections in markdown:

1. **Title** — A clear, descriptive vulnerability title
2. **Summary** — Brief 2-3 sentence overview of the vulnerability
3. **Vulnerability Details** — Technical description of the vulnerability, what causes it, and the affected component
4. **Impact Assessment** — What an attacker could achieve, business impact, affected users
5. **CVSS Score Estimate** — Provide an estimated CVSS 3.1 vector string and score with brief justification
6. **Steps to Reproduce** — Numbered, detailed, reproducible steps (expand on what was provided)
7. **Proof of Concept** — Technical PoC details, example requests/payloads
8. **Suggested Remediation** — Specific, actionable fix recommendations for the development team
9. **References** — Relevant CWE IDs, OWASP references, related advisories

Format the entire report in clean markdown. Be professional, precise, and thorough. The report should be ready to copy-paste into a ${f.platform} submission form.`;

const ReportWriterModal = ({ finding, onClose }: Props) => {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setReport("");
    try {
      const response = await callGemini(buildReportPrompt(finding));
      setReport(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />

      <div className="relative w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl shadow-primary/10 animate-enter z-10 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-primary shrink-0" />
            <h2 className="font-heading text-sm font-bold text-foreground truncate">
              Report: {finding.title}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!report && !loading && (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm font-mono text-muted-foreground">
                Generate a professional report for <span className="text-foreground">{finding.title}</span> targeting <span className="text-primary">{finding.targetDomain}</span>
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-[10px] font-mono text-muted-foreground/60">
                <span>Summary</span><span>·</span>
                <span>Impact</span><span>·</span>
                <span>CVSS</span><span>·</span>
                <span>Steps</span><span>·</span>
                <span>PoC</span><span>·</span>
                <span>Remediation</span><span>·</span>
                <span>References</span>
              </div>
              <button
                onClick={handleGenerate}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
              >
                <FileText size={16} /> Generate Report
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-3 py-12 text-sm font-mono text-muted-foreground">
              <Loader2 size={18} className="animate-spin text-primary" />
              Writing professional report…
            </div>
          )}

          {error && <p className="text-xs text-destructive font-mono text-center">{error}</p>}

          {report && (
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:font-heading prose-headings:text-foreground
              prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
              prose-p:text-sm prose-p:text-foreground/90 prose-p:font-mono prose-p:leading-relaxed
              prose-strong:text-foreground
              prose-li:text-sm prose-li:text-foreground/90 prose-li:font-mono
              prose-code:text-primary prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
              prose-pre:bg-muted/30 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg
              prose-table:text-xs prose-th:text-muted-foreground prose-td:text-foreground/80
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-hr:border-border/30
            ">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        {report && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 shrink-0">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              ↻ Regenerate
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 font-heading text-sm font-bold transition-all ${
                copied
                  ? "bg-green-500/20 text-green-400"
                  : "bg-primary text-primary-foreground hover:brightness-110"
              }`}
            >
              {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Report</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportWriterModal;
