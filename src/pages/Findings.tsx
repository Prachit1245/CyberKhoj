import { useState, useMemo } from "react";
import { Plus, Download, Trash2, ChevronDown, ChevronUp, X, DollarSign, Target, Shield, Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  type Finding, type FindingSeverity, type FindingStatus, type FindingPlatform, type VulnType,
  VULN_TYPES, getFindings, addFinding, deleteFinding, exportFindingsMarkdown,
} from "@/lib/findings";

const SEVERITIES: FindingSeverity[] = ["Critical", "High", "Medium", "Low", "Info"];
const STATUSES: FindingStatus[] = ["Draft", "Submitted", "Triaged", "Resolved", "Duplicate"];
const PLATFORMS: FindingPlatform[] = ["HackerOne", "Bugcrowd", "Private", "Other"];

type SortKey = "createdAt" | "severity" | "bountyEarned" | "status" | "title";
type SortDir = "asc" | "desc";

const sevOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };
const statusOrder: Record<string, number> = { Triaged: 0, Submitted: 1, Draft: 2, Resolved: 3, Duplicate: 4 };

const sevColor = (s: string) => {
  switch (s) {
    case "Critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "High": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "Medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "Low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case "Triaged": return "bg-primary/20 text-primary border-primary/30";
    case "Submitted": return "bg-secondary/20 text-secondary border-secondary/30";
    case "Resolved": return "bg-green-500/20 text-green-400 border-green-500/30";
    case "Duplicate": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const emptyFinding = (): Omit<Finding, "id" | "createdAt" | "updatedAt"> => ({
  title: "", targetDomain: "", vulnType: "XSS", severity: "Medium",
  description: "", stepsToReproduce: "", pocNote: "",
  bountyEarned: null, platform: "HackerOne", status: "Draft",
});

const Findings = () => {
  const [findings, setFindings] = useState<Finding[]>(getFindings());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyFinding());
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => setFindings(getFindings());

  const handleSubmit = () => {
    if (!form.title.trim() || !form.targetDomain.trim()) return;
    const now = new Date().toISOString();
    addFinding({ ...form, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
    setForm(emptyFinding());
    setShowForm(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteFinding(id);
    refresh();
  };

  const handleExport = () => {
    const md = exportFindingsMarkdown(sorted);
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `findings-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    const arr = [...findings];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case "severity": cmp = (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5); break;
        case "bountyEarned": cmp = (a.bountyEarned || 0) - (b.bountyEarned || 0); break;
        case "status": cmp = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5); break;
        case "title": cmp = a.title.localeCompare(b.title); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [findings, sortKey, sortDir]);

  // Stats
  const totalBounty = findings.reduce((s, f) => s + (f.bountyEarned || 0), 0);
  const sevCounts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1; return acc;
  }, {});

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors";
  const selectClass = "rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bug size={14} />
            <span className="text-[10px] font-mono uppercase tracking-widest">Total Findings</span>
          </div>
          <p className="text-2xl font-heading font-bold text-foreground">{findings.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign size={14} />
            <span className="text-[10px] font-mono uppercase tracking-widest">Bounty Earned</span>
          </div>
          <p className="text-2xl font-heading font-bold text-primary">${totalBounty.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1 col-span-2">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Shield size={14} />
            <span className="text-[10px] font-mono uppercase tracking-widest">By Severity</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {SEVERITIES.map((s) => (
              <Badge key={s} className={`${sevColor(s)} text-[10px]`}>
                {s}: {sevCounts[s] || 0}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "New Finding"}
        </button>
        {findings.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Download size={16} /> Export Markdown
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-heading font-bold text-foreground">Log New Finding</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Stored XSS via profile bio" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Target Domain *</label>
              <input value={form.targetDomain} onChange={(e) => setForm({ ...form, targetDomain: e.target.value })} placeholder="example.com" className={inputClass} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Vuln Type</label>
              <select value={form.vulnType} onChange={(e) => setForm({ ...form, vulnType: e.target.value as VulnType })} className={selectClass}>
                {VULN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as FindingSeverity })} className={selectClass}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Platform</label>
              <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as FindingPlatform })} className={selectClass}>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FindingStatus })} className={selectClass}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Bounty Earned ($)</label>
              <input type="number" value={form.bountyEarned ?? ""} onChange={(e) => setForm({ ...form, bountyEarned: e.target.value ? Number(e.target.value) : null })} placeholder="0" className={inputClass} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the vulnerability…" rows={3} className={inputClass + " resize-y"} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Steps to Reproduce</label>
            <textarea value={form.stepsToReproduce} onChange={(e) => setForm({ ...form, stepsToReproduce: e.target.value })} placeholder="1. Navigate to…&#10;2. Enter payload…&#10;3. Observe…" rows={4} className={inputClass + " resize-y"} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">PoC URL / Screenshot Note</label>
            <input value={form.pocNote} onChange={(e) => setForm({ ...form, pocNote: e.target.value })} placeholder="https://imgur.com/proof or note about screenshot" className={inputClass} />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.title.trim() || !form.targetDomain.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Save Finding
          </button>
        </div>
      )}

      {/* Findings table */}
      {findings.length > 0 ? (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_80px_80px_90px_40px] gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/50 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            <button onClick={() => toggleSort("title")} className="flex items-center gap-1 text-left hover:text-foreground transition-colors">Title <SortIcon col="title" /></button>
            <button onClick={() => toggleSort("severity")} className="flex items-center gap-1 hover:text-foreground transition-colors">Severity <SortIcon col="severity" /></button>
            <button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-foreground transition-colors">Status <SortIcon col="status" /></button>
            <button onClick={() => toggleSort("bountyEarned")} className="flex items-center gap-1 hover:text-foreground transition-colors">Bounty <SortIcon col="bountyEarned" /></button>
            <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1 hover:text-foreground transition-colors">Date <SortIcon col="createdAt" /></button>
            <span />
          </div>

          {/* Rows */}
          {sorted.map((f) => {
            const isExpanded = expandedId === f.id;
            return (
              <div key={f.id} className="border-b border-border/30 last:border-b-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : f.id)}
                  className="grid grid-cols-[1fr_100px_80px_80px_90px_40px] gap-2 px-4 py-3 w-full text-left hover:bg-muted/10 transition-colors items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{f.title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{f.targetDomain} · {f.vulnType}</p>
                  </div>
                  <Badge className={`${sevColor(f.severity)} text-[9px] w-fit`}>{f.severity}</Badge>
                  <Badge className={`${statusColor(f.status)} text-[9px] w-fit`}>{f.status}</Badge>
                  <span className="text-xs font-mono text-foreground">{f.bountyEarned ? `$${f.bountyEarned.toLocaleString()}` : "—"}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</span>
                  {isExpanded ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/5 animate-fade-in">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{f.platform}</Badge>
                      <Badge variant="outline" className="text-[10px]">{f.vulnType}</Badge>
                    </div>

                    {f.description && (
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Description</p>
                        <p className="text-xs font-mono text-foreground whitespace-pre-wrap">{f.description}</p>
                      </div>
                    )}

                    {f.stepsToReproduce && (
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Steps to Reproduce</p>
                        <p className="text-xs font-mono text-foreground whitespace-pre-wrap">{f.stepsToReproduce}</p>
                      </div>
                    )}

                    {f.pocNote && (
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">PoC / Screenshot</p>
                        <p className="text-xs font-mono text-foreground break-all">{f.pocNote}</p>
                      </div>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                      className="flex items-center gap-1.5 text-xs font-mono text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 size={12} /> Delete Finding
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !showForm && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Target size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm font-mono text-muted-foreground/50">No findings logged yet.</p>
            <p className="text-xs font-mono text-muted-foreground/30 mt-1">Click "New Finding" to log your first confirmed vulnerability.</p>
          </div>
        )
      )}
    </div>
  );
};

export default Findings;
