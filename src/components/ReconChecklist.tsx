import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2, CheckSquare, Square, Copy, ChevronDown, ChevronRight, Search as SearchIcon, Download, Terminal, Globe, Eye } from "lucide-react";
import { callGemini, GeminiError } from "@/lib/ai";
import { toast } from "@/components/Toast";

/* ── Types ── */
export interface ReconItem {
  id: number;
  task: string;
  category: "passive" | "active" | "osint";
  tool?: string;
  command?: string;
}

/* ── Prompt ── */
const buildReconPrompt = (domain: string): string =>
  `You are an expert penetration tester specializing in reconnaissance. Generate a comprehensive recon checklist for "${domain}".

Return ONLY a valid JSON array with no markdown formatting, no code blocks, no explanation text. Start your response with [.

STRICT RULES:
- Do NOT repeat tasks. Every item must be unique.
- Do NOT give generic advice. Every task must be specific to "${domain}".
- Every command must use the actual domain "${domain}".

Return exactly 30-40 checklist items. Each object must match this schema:
[
  {
    "id": 1,
    "task": "Enumerate subdomains of ${domain} using certificate transparency logs",
    "category": "passive",
    "tool": "crt.sh",
    "command": "curl -s 'https://crt.sh/?q=%25.${domain}&output=json' | jq -r '.[].name_value' | sort -u"
  }
]

Categories MUST be one of: "passive", "active", "osint".
"tool" and "command" are optional but strongly encouraged.

Cover ALL of these recon areas comprehensively:
- Subdomain enumeration (amass, subfinder, crt.sh, assetfinder)
- Port scanning (nmap, masscan, rustscan)
- Technology detection (whatweb, wappalyzer, builtwith)
- Google dorks specific to ${domain}
- Shodan/Censys queries for ${domain}
- Certificate transparency (crt.sh)
- Wayback Machine / web archive queries
- Directory and file bruteforce (gobuster, feroxbuster, dirsearch)
- Admin panel discovery
- API endpoint discovery
- DNS enumeration (dig, dnsrecon, dnsx)
- Email harvesting (theHarvester, hunter.io)
- JavaScript file analysis
- Cloud storage enumeration (S3, GCS, Azure)
- GitHub/GitLab secret scanning
- WHOIS and ASN lookup
- Favicon hash lookup (Shodan)
- WAF detection (wafw00f)
- Screenshot and visual recon (gowitness, aquatone)
- Content discovery with custom wordlists

Return ONLY valid JSON. Start with [.`;

/* ── Parse ── */
const parseReconItems = (raw: string): ReconItem[] => {
  let cleaned = raw.trim().replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "");
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse recon checklist");
  const parsed = JSON.parse(match[0]);
  return parsed.map((item: any, i: number) => ({
    id: item.id ?? i + 1,
    task: String(item.task || ""),
    category: (["passive", "active", "osint"].includes(item.category) ? item.category : "passive") as ReconItem["category"],
    tool: item.tool ? String(item.tool) : undefined,
    command: item.command ? String(item.command) : undefined,
  }));
};

/* ── Storage ── */
const reconKey = (domain: string) => `hackmind_recon_${domain.replace(/[^a-zA-Z0-9]/g, "_")}`;
const reconCheckedKey = (domain: string) => `hackmind_recon_checked_${domain.replace(/[^a-zA-Z0-9]/g, "_")}`;

const loadReconItems = (domain: string): ReconItem[] | null => {
  try {
    const raw = localStorage.getItem(reconKey(domain));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
const saveReconItems = (domain: string, items: ReconItem[]) =>
  localStorage.setItem(reconKey(domain), JSON.stringify(items));

const loadReconChecked = (domain: string): Set<number> => {
  try {
    const raw = localStorage.getItem(reconCheckedKey(domain));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};
const saveReconChecked = (domain: string, s: Set<number>) =>
  localStorage.setItem(reconCheckedKey(domain), JSON.stringify([...s]));

/* ── Category styles ── */
const CAT_STYLES: Record<string, { label: string; icon: typeof Globe; className: string }> = {
  passive: { label: "Passive", icon: Eye, className: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  active: { label: "Active", icon: Terminal, className: "text-orange-400 border-orange-400/30 bg-orange-400/10" },
  osint: { label: "OSINT", icon: Globe, className: "text-primary border-primary/30 bg-primary/10" },
};

/* ── Component ── */
interface Props {
  domain: string;
}

const ReconChecklist = ({ domain }: Props) => {
  const [items, setItems] = useState<ReconItem[]>(() => loadReconItems(domain) || []);
  const [checked, setChecked] = useState<Set<number>>(() => loadReconChecked(domain));
  const [loading, setLoading] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [expandedCmd, setExpandedCmd] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Reload when domain changes
  useEffect(() => {
    const saved = loadReconItems(domain);
    setItems(saved || []);
    setChecked(loadReconChecked(domain));
  }, [domain]);

  const generate = async () => {
    setLoading(true);
    try {
      const raw = await callGemini(buildReconPrompt(domain), true);
      const parsed = parseReconItems(raw);
      setItems(parsed);
      saveReconItems(domain, parsed);
      setChecked(new Set());
      saveReconChecked(domain, new Set());
      toast.success(`Generated ${parsed.length} recon tasks ✓`);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error("[ReconChecklist]", err);
      if (err instanceof GeminiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to generate checklist. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = useCallback((id: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveReconChecked(domain, next);
      return next;
    });
  }, [domain]);

  const toggleCmd = (id: number) => {
    setExpandedCmd(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyCommand = async (cmd: string, id: number) => {
    await navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const exportMarkdown = () => {
    const lines = [
      `# Recon Checklist — ${domain}`,
      "",
      `Progress: ${checked.size} / ${items.length}`,
      "",
    ];
    const grouped: Record<string, ReconItem[]> = {};
    for (const item of items) {
      (grouped[item.category] ??= []).push(item);
    }
    for (const [cat, catItems] of Object.entries(grouped)) {
      lines.push(`## ${cat.toUpperCase()}`);
      lines.push("");
      for (const item of catItems) {
        lines.push(`- [${checked.has(item.id) ? "x" : " "}] ${item.task}${item.tool ? ` *(${item.tool})*` : ""}`);
        if (item.command) lines.push(`  \`\`\`\n  ${item.command}\n  \`\`\``);
      }
      lines.push("");
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Recon checklist copied as markdown ✓");
  };

  const filtered = useMemo(() => {
    let result = [...items];
    if (catFilter) result = result.filter(i => i.category === catFilter);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      result = result.filter(i =>
        i.task.toLowerCase().includes(q) ||
        (i.tool?.toLowerCase().includes(q)) ||
        (i.command?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, catFilter, searchQ]);

  const progress = items.length > 0 ? (checked.size / items.length) * 100 : 0;

  if (items.length === 0 && !loading) {
    return (
      <div className="rounded-lg border border-border/30 bg-card/30 p-6 text-center space-y-3">
        <p className="text-sm font-mono text-muted-foreground">
          Generate a comprehensive recon checklist for <span className="text-primary font-bold">{domain}</span>
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-heading font-bold text-sm text-primary-foreground bg-primary hover:brightness-110 transition-all cursor-pointer"
        >
          <SearchIcon size={14} />
          Generate Recon Checklist
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-card/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <SearchIcon size={15} className="text-primary" />
          <h3 className="font-heading text-sm font-bold text-foreground">Recon Checklist</h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            {checked.size}/{items.length} complete
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportMarkdown} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border/30 transition-colors cursor-pointer">
            <Download size={11} /> Export
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono text-primary border border-primary/30 hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <SearchIcon size={11} />}
            {loading ? "Generating…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted/30">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search tasks..."
            className="h-7 w-full rounded bg-muted/30 border border-border/30 pl-7 pr-2 text-[11px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        {(["passive", "active", "osint"] as const).map(cat => {
          const style = CAT_STYLES[cat];
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? null : cat)}
              className={`px-2 py-1 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                catFilter === cat ? style.className : "text-muted-foreground border-border/30 hover:border-primary/30"
              }`}
            >
              {style.label}
            </button>
          );
        })}
      </div>

      {/* Items */}
      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
        {filtered.map(item => {
          const done = checked.has(item.id);
          const catStyle = CAT_STYLES[item.category] || CAT_STYLES.passive;
          const hasCmd = !!item.command;
          const cmdOpen = expandedCmd.has(item.id);

          return (
            <div
              key={item.id}
              className={`rounded-lg border p-3 transition-colors ${
                done ? "border-primary/20 bg-primary/5 opacity-60" : "border-border/20 bg-card/50 hover:border-primary/20"
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => toggleCheck(item.id)}
                  className={`shrink-0 mt-0.5 transition-colors cursor-pointer ${done ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {done ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className={`text-xs font-mono leading-relaxed ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.task}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${catStyle.className}`}>
                      {catStyle.label}
                    </span>
                    {item.tool && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground">
                        {item.tool}
                      </span>
                    )}
                    {hasCmd && (
                      <button
                        onClick={() => toggleCmd(item.id)}
                        className="flex items-center gap-0.5 text-[10px] font-mono text-primary/70 hover:text-primary transition-colors cursor-pointer"
                      >
                        {cmdOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        Command
                      </button>
                    )}
                  </div>
                  {hasCmd && cmdOpen && (
                    <div className="relative rounded bg-muted/40 border border-border/30 p-2 mt-1">
                      <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-all pr-14">
                        {item.command}
                      </pre>
                      <button
                        onClick={() => copyCommand(item.command!, item.id)}
                        className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {copiedId === item.id ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-xs font-mono text-muted-foreground/50 py-4">
          No matching tasks
        </p>
      )}

      {/* Celebration */}
      {items.length > 0 && checked.size === items.length && (
        <div className="text-center py-3 animate-scale-in">
          <p className="text-sm font-heading font-bold text-primary">Recon complete! 🔍</p>
          <p className="text-[10px] font-mono text-muted-foreground">All tasks checked for {domain}</p>
        </div>
      )}
    </div>
  );
};

export default ReconChecklist;
