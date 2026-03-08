import { useState, useMemo, useCallback, useRef } from "react";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { Search, Trash2, Clock, ArrowUpDown, X, StickyNote, GitCompareArrows, ArrowLeft, AlertTriangle, ShieldAlert, Shield, ShieldCheck } from "lucide-react";
import { extractDomain, hasNote } from "@/lib/targetNotes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/Toast";
import { getHistory, deleteFromHistory, clearHistory, setHistory, type AnalysisRecord } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";

/* ── Type mapping ── */
const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  url: { label: "URL Analysis", className: "bg-secondary/20 text-secondary border-secondary/30" },
  domain: { label: "Mind Map", className: "bg-primary/20 text-primary border-primary/30" },
  request: { label: "Attack Mode", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "url", label: "URL Analysis" },
  { key: "request", label: "Attack Mode" },
  { key: "domain", label: "Mind Map" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most", label: "Most Paths" },
];

const SEV_ORDER = ["critical", "high", "medium", "low"] as const;
const SEV_META: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  critical: { label: "Critical", color: "hsl(0 72% 51%)", icon: AlertTriangle },
  high: { label: "High", color: "hsl(25 95% 53%)", icon: ShieldAlert },
  medium: { label: "Medium", color: "hsl(48 96% 53%)", icon: Shield },
  low: { label: "Low", color: "hsl(217 91% 60%)", icon: ShieldCheck },
};

/* ── Parse severity counts from result JSON ── */
function parseSeverities(result: string): Record<string, number> {
  const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  try {
    const data = JSON.parse(result);
    const paths = Array.isArray(data) ? data : data?.paths || data?.nodes || [];
    for (const p of paths) {
      const sev = (p.severity || "").toLowerCase();
      if (sev in c) c[sev]++;
    }
  } catch { /* ignore */ }
  return c;
}

/* ── Parse attack path titles/categories ── */
interface ParsedPath { title: string; category: string; severity: string }

function parsePaths(result: string): ParsedPath[] {
  try {
    const data = JSON.parse(result);
    const paths = Array.isArray(data) ? data : data?.paths || data?.nodes || [];
    return paths.map((p: any) => ({
      title: p.title || p.name || "Unknown",
      category: p.category || p.type || "Other",
      severity: (p.severity || "low").toLowerCase(),
    }));
  } catch { return []; }
}

/* ── Severity mini-bar ── */
function SeverityBar({ result }: { result: string }) {
  const counts = useMemo(() => parseSeverities(result), [result]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const segments = [
    { count: counts.critical, color: "bg-[hsl(0,72%,51%)]" },
    { count: counts.high, color: "bg-[hsl(25,95%,53%)]" },
    { count: counts.medium, color: "bg-[hsl(48,96%,53%)]" },
    { count: counts.low, color: "bg-[hsl(217,91%,60%)]" },
  ];

  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted/30 gap-px">
      {segments.map((s, i) =>
        s.count > 0 ? <div key={i} className={`${s.color} rounded-full`} style={{ flex: s.count }} /> : null
      )}
    </div>
  );
}

/* ═══════════ Compare View ═══════════ */
function CompareView({ a, b, onClose }: { a: AnalysisRecord; b: AnalysisRecord; onClose: () => void }) {
  const sevA = useMemo(() => parseSeverities(a.result), [a]);
  const sevB = useMemo(() => parseSeverities(b.result), [b]);
  const pathsA = useMemo(() => parsePaths(a.result), [a]);
  const pathsB = useMemo(() => parsePaths(b.result), [b]);

  const titlesA = new Set(pathsA.map((p) => p.title.toLowerCase()));
  const titlesB = new Set(pathsB.map((p) => p.title.toLowerCase()));

  const uniqueA = pathsA.filter((p) => !titlesB.has(p.title.toLowerCase()));
  const uniqueB = pathsB.filter((p) => !titlesA.has(p.title.toLowerCase()));
  const commonTitles = pathsA.filter((p) => titlesB.has(p.title.toLowerCase()));

  const catsA = new Set(pathsA.map((p) => p.category));
  const catsB = new Set(pathsB.map((p) => p.category));
  const commonCats = [...catsA].filter((c) => catsB.has(c));
  const onlyACats = [...catsA].filter((c) => !catsB.has(c));
  const onlyBCats = [...catsB].filter((c) => !catsA.has(c));

  const totalA = Object.values(sevA).reduce((s, v) => s + v, 0);
  const totalB = Object.values(sevB).reduce((s, v) => s + v, 0);

  // Recommendation
  const critA = sevA.critical + sevA.high;
  const critB = sevB.critical + sevB.high;
  let recommendation = "";
  if (critA > critB) recommendation = `Target A has more critical/high paths (${critA} vs ${critB}) — prioritize testing "${a.target}".`;
  else if (critB > critA) recommendation = `Target B has more critical/high paths (${critB} vs ${critA}) — prioritize testing "${b.target}".`;
  else if (totalA > totalB) recommendation = `Both have equal critical paths, but Target A has more total paths (${totalA} vs ${totalB}).`;
  else if (totalB > totalA) recommendation = `Both have equal critical paths, but Target B has more total paths (${totalB} vs ${totalA}).`;
  else recommendation = "Both targets have similar risk profiles. Test both thoroughly.";

  const colClass = "flex-1 min-w-0 space-y-3";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
            <GitCompareArrows size={18} className="text-primary" /> Compare Analyses
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Side-by-side vulnerability comparison</p>
        </div>
      </div>

      {/* Target headers */}
      <div className="grid grid-cols-2 gap-4">
        {[{ rec: a, label: "A", sev: sevA, total: totalA }, { rec: b, label: "B", sev: sevB, total: totalB }].map(({ rec, label, sev, total }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-mono font-bold flex items-center justify-center">{label}</span>
              <p className="text-sm font-mono font-bold text-foreground truncate flex-1">{rec.target}</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
              <span>{rec.type}</span>
              <span>{new Date(rec.date).toLocaleDateString()}</span>
              <span>{total} paths</span>
            </div>
          </div>
        ))}
      </div>

      {/* Severity Comparison */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Severity Breakdown</p>
        <div className="space-y-2">
          {SEV_ORDER.map((sev) => {
            const va = sevA[sev] || 0;
            const vb = sevB[sev] || 0;
            const max = Math.max(va, vb, 1);
            const Icon = SEV_META[sev].icon;
            return (
              <div key={sev} className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <Icon size={12} style={{ color: SEV_META[sev].color }} />
                  <span className="w-16">{SEV_META[sev].label}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(va / max) * 100}%`, backgroundColor: SEV_META[sev].color }} />
                    </div>
                    <span className={`text-xs font-mono w-6 text-right ${va > vb ? "text-foreground font-bold" : "text-muted-foreground"}`}>{va}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(vb / max) * 100}%`, backgroundColor: SEV_META[sev].color }} />
                    </div>
                    <span className={`text-xs font-mono w-6 text-right ${vb > va ? "text-foreground font-bold" : "text-muted-foreground"}`}>{vb}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Common Categories */}
      {commonCats.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Common Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {commonCats.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px] font-mono">{c}</Badge>
            ))}
          </div>
          {(onlyACats.length > 0 || onlyBCats.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground">Only in A</p>
                <div className="flex flex-wrap gap-1">
                  {onlyACats.length > 0 ? onlyACats.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] font-mono text-primary border-primary/30">{c}</Badge>
                  )) : <span className="text-[10px] font-mono text-muted-foreground/40">—</span>}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground">Only in B</p>
                <div className="flex flex-wrap gap-1">
                  {onlyBCats.length > 0 ? onlyBCats.map((c) => (
                    <Badge key={c} variant="outline" className="text-[10px] font-mono text-secondary border-secondary/30">{c}</Badge>
                  )) : <span className="text-[10px] font-mono text-muted-foreground/40">—</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unique Paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "A", unique: uniqueA, accent: "primary" as const },
          { label: "B", unique: uniqueB, accent: "secondary" as const },
        ].map(({ label, unique, accent }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Unique to {label} <span className={`text-${accent}`}>({unique.length})</span>
            </p>
            {unique.length === 0 ? (
              <p className="text-[10px] font-mono text-muted-foreground/40 italic py-2">No unique paths</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {unique.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: SEV_META[p.severity]?.color || SEV_META.low.color }}
                    />
                    <span className="text-foreground truncate flex-1">{p.title}</span>
                    <span className="text-muted-foreground/50 text-[10px] shrink-0">{p.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Common Paths */}
      {commonTitles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            Common Paths <span className="text-foreground">({commonTitles.length})</span>
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {commonTitles.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SEV_META[p.severity]?.color || SEV_META.low.color }} />
                <span className="text-foreground truncate flex-1">{p.title}</span>
                <span className="text-muted-foreground/50 text-[10px] shrink-0">{p.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
        <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Recommendation</p>
        <p className="text-sm font-mono text-foreground">{recommendation}</p>
      </div>
    </div>
  );
}

/* ═══════════ Main History page ═══════════ */
export default function History() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AnalysisRecord[]>(() => getHistory());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const applySearch = useDebouncedCallback((val: string) => setDebouncedSearch(val), 200);
  const handleSearch = (val: string) => { setSearch(val); applySearch(val); };
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const undoRef = useRef<{ record: AnalysisRecord; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Compare state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comparing, setComparing] = useState<[AnalysisRecord, AnalysisRecord] | null>(null);

  const refresh = useCallback(() => setRecords(getHistory()), []);

  const filtered = useMemo(() => {
    let list = [...records];
    if (filter !== "all") list = list.filter((r) => r.type === filter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((r) => r.target.toLowerCase().includes(q));
    }
    if (sort === "newest") list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sort === "oldest") list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sort === "most") list.sort((a, b) => b.pathsFound - a.pathsFound);
    return list;
  }, [records, debouncedSearch, filter, sort]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 2) next.add(id);
      else { toast.info("Select at most 2 analyses to compare"); return prev; }
      return next;
    });
  };

  const handleCompare = () => {
    if (selected.size !== 2) { toast.error("Select exactly 2 analyses"); return; }
    const ids = [...selected];
    const a = records.find((r) => r.id === ids[0]);
    const b = records.find((r) => r.id === ids[1]);
    if (a && b) setComparing([a, b]);
  };

  const handleDelete = (record: AnalysisRecord) => {
    deleteFromHistory(record.id);
    refresh();
    if (undoRef.current) clearTimeout(undoRef.current.timer);
    const timer = setTimeout(() => { undoRef.current = null; }, 5000);
    undoRef.current = { record, timer };
    toast.info("Analysis deleted");
  };

  const handleClearAll = () => {
    clearHistory();
    refresh();
    toast.success("All history cleared");
  };

  const chipBase = "px-3 py-1 rounded-full text-[11px] font-mono border cursor-pointer transition-colors";
  const chipActive = "bg-primary/20 text-primary border-primary/40";
  const chipInactive = "bg-card/50 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50";

  // Compare view
  if (comparing) {
    return <CompareView a={comparing[0]} b={comparing[1]} onClose={() => { setComparing(null); setSelected(new Set()); }} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground">History</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{records.length} analyses saved</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size === 2 && (
            <Button onClick={handleCompare} size="sm" className="text-xs font-mono gap-1.5 animate-scale-in cursor-pointer">
              <GitCompareArrows className="h-3.5 w-3.5" /> Compare Selected
            </Button>
          )}
          {selected.size > 0 && selected.size < 2 && (
            <span className="text-[10px] font-mono text-muted-foreground animate-fade-in">Select 1 more to compare</span>
          )}
          {records.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs font-mono text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-mono">Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription className="font-mono text-xs">
                    This will permanently delete all {records.length} saved analyses. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-mono text-xs cursor-pointer">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground font-mono text-xs cursor-pointer">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by target..."
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-card/50 border border-border/30 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          {search && (
            <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTER_OPTIONS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`${chipBase} ${filter === f.key ? chipActive : chipInactive}`}>{f.label}</button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            {SORT_OPTIONS.map((s) => (
              <button key={s.key} onClick={() => setSort(s.key)} className={`${chipBase} ${sort === s.key ? chipActive : chipInactive}`}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Clock className="h-12 w-12 text-muted-foreground/20 mx-auto" />
          <p className="text-sm font-mono text-muted-foreground/50">
            {records.length === 0 ? "No analyses yet" : "No results match your filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((record) => {
            const typeInfo = TYPE_LABELS[record.type] || TYPE_LABELS.url;
            const isSelected = selected.has(record.id);
            return (
              <div
                key={record.id}
                className={`group relative rounded-lg border bg-card/50 hover:bg-card/80 p-4 transition-all space-y-3 ${
                  isSelected ? "border-primary/50 ring-1 ring-primary/20" : "border-border/20 hover:border-border/40"
                }`}
              >
                {/* Checkbox */}
                <div
                  className="absolute top-3 left-3 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(record.id)}
                    className="cursor-pointer"
                  />
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(record); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Clickable area */}
                <div onClick={() => navigate(`/history/${record.id}`)} className="cursor-pointer pl-7">
                  {/* Target + Badge */}
                  <div className="flex items-start gap-2 pr-6">
                    <p className="text-sm font-mono font-semibold text-foreground truncate flex-1">
                      {record.target.length > 40 ? record.target.slice(0, 40) + "…" : record.target}
                    </p>
                    {hasNote(extractDomain(record.target)) && (
                      <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/10 text-primary border-primary/30 flex items-center gap-0.5">
                        <StickyNote className="h-2.5 w-2.5" /> Notes
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${typeInfo.className}`}>
                      {typeInfo.label}
                    </Badge>
                  </div>

                  {/* Severity bar */}
                  <div className="mt-3">
                    <SeverityBar result={record.result} />
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mt-3">
                    <span>{record.pathsFound} paths found</span>
                    <span>{new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
