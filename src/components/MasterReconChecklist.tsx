import { useState, useEffect, useCallback } from "react";
import { CheckSquare, Square, Download, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/Toast";

interface CheckItem {
  id: string;
  label: string;
  hint?: string;
}

interface Phase {
  id: string;
  title: string;
  items: CheckItem[];
}

const PHASES: Phase[] = [
  {
    id: "passive",
    title: "Phase 1 — Passive Recon",
    items: [
      { id: "robots", label: "Check robots.txt", hint: "Look for disallowed paths revealing hidden endpoints" },
      { id: "sitemap", label: "Check sitemap.xml", hint: "Discover all indexed pages and URL structure" },
      { id: "crtsh", label: "Run crt.sh certificate search", hint: "Find subdomains via certificate transparency logs" },
      { id: "wayback", label: "Check Wayback Machine", hint: "Find old pages, removed endpoints, and leaked files" },
      { id: "dorks", label: "Run Google dorks", hint: "Search for exposed files, admin panels, and errors" },
      { id: "github", label: "Search GitHub for leaked code", hint: "Look for API keys, credentials, and internal code" },
      { id: "jobs", label: "Check job postings for tech stack hints", hint: "Job listings reveal frameworks, databases, and tools used" },
      { id: "whois", label: "Look up WHOIS information", hint: "Find registrant details, name servers, and registration dates" },
      { id: "dns", label: "Check DNS records (MX, TXT, CNAME)", hint: "Discover mail servers, SPF/DKIM configs, and service providers" },
      { id: "shodan", label: "Search Shodan for exposed services", hint: "Find open ports, running services, and server banners" },
      { id: "git", label: "Check for exposed .git directory", hint: "Try /.git/config and /.git/HEAD for source code exposure" },
      { id: "apidocs", label: "Look for API documentation", hint: "Check /swagger, /api-docs, /graphql for exposed specs" },
      { id: "securitytxt", label: "Check security.txt file", hint: "/.well-known/security.txt may reveal scope and contacts" },
      { id: "mobile", label: "Search for mobile apps on app stores", hint: "Mobile apps often have hardcoded API keys and endpoints" },
    ],
  },
  {
    id: "active",
    title: "Phase 2 — Active Recon",
    items: [
      { id: "subdomains", label: "Enumerate subdomains", hint: "Use subfinder, amass, or assetfinder for comprehensive enumeration" },
      { id: "portscan", label: "Port scan main domain", hint: "nmap top 1000 ports, check for unusual services" },
      { id: "fingerprint", label: "Fingerprint web technologies", hint: "Use Wappalyzer, WhatWeb, or check response headers" },
      { id: "endpoints", label: "Map all visible endpoints", hint: "Spider the site, check JS files for hidden routes" },
      { id: "staging", label: "Check for dev/staging environments", hint: "Try dev., staging., test., uat. subdomains" },
      { id: "methods", label: "Test HTTP methods on endpoints", hint: "Check PUT, DELETE, PATCH, OPTIONS on each endpoint" },
      { id: "cors", label: "Check CORS configuration", hint: "Send Origin header and check Access-Control-Allow-Origin" },
      { id: "errors", label: "Look for verbose error messages", hint: "Trigger errors with malformed input to reveal stack traces" },
      { id: "headers", label: "Check security headers", hint: "CSP, HSTS, X-Frame-Options, X-Content-Type-Options" },
      { id: "auth", label: "Map authentication flows", hint: "Identify login, register, reset, OAuth, and session management" },
    ],
  },
];

const STORAGE_KEY = "hackmind_recon_checklist";

function loadChecked(domain: string): Set<string> {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return new Set(data[domain] || []);
  } catch { return new Set(); }
}

function saveChecked(domain: string, checked: Set<string>) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    data[domain] = [...checked];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota */ }
}

function exportMarkdown(domain: string, checked: Set<string>): string {
  let md = `# Recon Checklist: ${domain}\n\n`;
  md += `Generated: ${new Date().toLocaleString()}\n\n`;
  const total = PHASES.reduce((s, p) => s + p.items.length, 0);
  md += `**Progress:** ${checked.size}/${total} complete\n\n---\n\n`;
  for (const phase of PHASES) {
    const done = phase.items.filter(i => checked.has(i.id)).length;
    md += `## ${phase.title} (${done}/${phase.items.length})\n\n`;
    for (const item of phase.items) {
      md += `- [${checked.has(item.id) ? "x" : " "}] ${item.label}\n`;
      if (item.hint) md += `  - _${item.hint}_\n`;
    }
    md += "\n";
  }
  return md;
}

export default function MasterReconChecklist({ domain }: { domain: string }) {
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(domain));
  const [expanded, setExpanded] = useState<string | null>("passive");

  useEffect(() => { setChecked(loadChecked(domain)); }, [domain]);

  const toggle = useCallback((id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveChecked(domain, next);
      return next;
    });
  }, [domain]);

  const totalItems = PHASES.reduce((s, p) => s + p.items.length, 0);
  const totalDone = checked.size;
  const pct = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0;

  const handleExport = () => {
    const md = exportMarkdown(domain, checked);
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recon-checklist-${domain}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Checklist exported.");
  };

  const resetAll = () => {
    setChecked(new Set());
    saveChecked(domain, new Set());
    toast.info("Checklist reset.");
  };

  return (
    <Card className="md:col-span-2 bg-card/60 border-border/50">
      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ListChecks size={16} className="text-primary" />
            <h3 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest">Master Recon Checklist</h3>
            <span className="text-[10px] font-mono text-muted-foreground">client-side • saved per domain</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetAll}>Reset</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExport}>
              <Download size={12} className="mr-1" /> Export .md
            </Button>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="text-primary font-bold">{totalDone}/{totalItems} ({pct}%)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Phases */}
        {PHASES.map(phase => {
          const phaseDone = phase.items.filter(i => checked.has(i.id)).length;
          const isExpanded = expanded === phase.id;
          return (
            <div key={phase.id} className="space-y-2">
              <button
                onClick={() => setExpanded(isExpanded ? null : phase.id)}
                className="flex items-center gap-2 w-full text-left py-1.5 text-sm font-mono font-bold text-foreground hover:text-primary transition-colors"
              >
                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {phase.title}
                <Badge variant="outline" className={`text-[10px] ml-1 ${phaseDone === phase.items.length ? "bg-primary/20 text-primary border-primary/30" : ""}`}>
                  {phaseDone}/{phase.items.length}
                </Badge>
              </button>

              {isExpanded && (
                <div className="space-y-1 pl-1">
                  {phase.items.map(item => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all hover:border-primary/30 ${
                        checked.has(item.id) ? "bg-primary/5 border-primary/20 opacity-70" : "border-border/20 bg-card/30"
                      }`}
                    >
                      <button onClick={() => toggle(item.id)} className="mt-0.5 shrink-0 text-primary">
                        {checked.has(item.id) ? <CheckSquare size={14} /> : <Square size={14} className="text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-mono font-bold ${checked.has(item.id) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.label}
                        </span>
                        {item.hint && (
                          <p className="text-[10px] font-mono text-muted-foreground/70 leading-relaxed mt-0.5">{item.hint}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
