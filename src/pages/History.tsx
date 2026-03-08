import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trash2, Clock, ArrowUpDown, X } from "lucide-react";
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
import { toast } from "sonner";
import { getHistory, deleteFromHistory, clearHistory, setHistory, type AnalysisRecord } from "@/lib/store";

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

/* ── Severity mini-bar ── */
function SeverityBar({ result }: { result: string }) {
  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    try {
      const data = JSON.parse(result);
      const paths = Array.isArray(data) ? data : data?.paths || data?.nodes || [];
      for (const p of paths) {
        const sev = (p.severity || "").toLowerCase();
        if (sev in c) c[sev as keyof typeof c]++;
      }
    } catch { /* ignore */ }
    return c;
  }, [result]);

  const total = counts.critical + counts.high + counts.medium + counts.low;
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
        s.count > 0 ? (
          <div
            key={i}
            className={`${s.color} rounded-full`}
            style={{ flex: s.count }}
          />
        ) : null
      )}
    </div>
  );
}

/* ── Main History page ── */
export default function History() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AnalysisRecord[]>(() => getHistory());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const undoRef = useRef<{ record: AnalysisRecord; timer: ReturnType<typeof setTimeout> } | null>(null);

  const refresh = useCallback(() => setRecords(getHistory()), []);

  const filtered = useMemo(() => {
    let list = [...records];

    // Filter by type
    if (filter !== "all") list = list.filter((r) => r.type === filter);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.target.toLowerCase().includes(q));
    }

    // Sort
    if (sort === "newest") list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sort === "oldest") list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sort === "most") list.sort((a, b) => b.pathsFound - a.pathsFound);

    return list;
  }, [records, search, filter, sort]);

  const handleDelete = (record: AnalysisRecord) => {
    deleteFromHistory(record.id);
    refresh();

    // Clear any pending undo
    if (undoRef.current) clearTimeout(undoRef.current.timer);

    const timer = setTimeout(() => { undoRef.current = null; }, 5000);
    undoRef.current = { record, timer };

    toast("Analysis deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          if (undoRef.current) {
            clearTimeout(undoRef.current.timer);
            // Re-insert
            const current = getHistory();
            current.push(undoRef.current.record);
            current.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistory(current);
            refresh();
            undoRef.current = null;
            toast.success("Restored");
          }
        },
      },
    });
  };

  const handleClearAll = () => {
    clearHistory();
    refresh();
    toast.success("All history cleared");
  };


  const chipBase =
    "px-3 py-1 rounded-full text-[11px] font-mono border cursor-pointer transition-colors";
  const chipActive = "bg-primary/20 text-primary border-primary/40";
  const chipInactive = "bg-card/50 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground">History</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{records.length} analyses saved</p>
        </div>
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

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by target..."
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-card/50 border border-border/30 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type filters */}
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`${chipBase} ${filter === f.key ? chipActive : chipInactive}`}
            >
              {f.label}
            </button>
          ))}

          <div className="flex-1" />

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`${chipBase} ${sort === s.key ? chipActive : chipInactive}`}
              >
                {s.label}
              </button>
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
            return (
              <div
                key={record.id}
                onClick={() => setSelectedId(record.id)}
                className="group relative rounded-lg border border-border/20 bg-card/50 hover:bg-card/80 hover:border-border/40 p-4 cursor-pointer transition-all space-y-3"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(record); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Target + Badge */}
                <div className="flex items-start gap-2 pr-6">
                  <p className="text-sm font-mono font-semibold text-foreground truncate flex-1">
                    {record.target.length > 40 ? record.target.slice(0, 40) + "…" : record.target}
                  </p>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${typeInfo.className}`}>
                    {typeInfo.label}
                  </Badge>
                </div>

                {/* Severity bar */}
                <SeverityBar result={record.result} />

                {/* Meta */}
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{record.pathsFound} paths found</span>
                  <span>{new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
