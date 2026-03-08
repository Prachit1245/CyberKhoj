import { useState, useMemo, useRef, useCallback } from "react";
import { Search, Copy, Check, ChevronRight, Heart, X, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/Toast";
import { PAYLOAD_CATEGORIES, TOTAL_PAYLOADS, type Payload } from "@/lib/payloads";
import { incrementStat } from "@/lib/store";

const SEV_STYLES: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const FAVORITES_KEY = "hackmind_payload_favorites";

function getFavorites(): Set<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"));
  } catch { return new Set(); }
}
function saveFavorites(favs: Set<number>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
}

type SortMode = "severity" | "category" | "recent";
type SevFilter = "all" | "critical" | "high" | "medium" | "low";

const SEV_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function PayloadCard({ payload, isFav, onToggleFav }: { payload: Payload; isFav: boolean; onToggleFav: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(payload.code);
    setCopied(true);
    incrementStat("payloadsCopied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-border/20 bg-card/50 hover:bg-card/80 hover:border-border/40 transition-all overflow-hidden">
      <div className="relative group">
        <pre className="p-3 pr-20 text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          {payload.code}
        </pre>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onToggleFav}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              isFav
                ? "bg-destructive/15 border-destructive/30 text-destructive"
                : "bg-muted/60 border-border/30 text-muted-foreground hover:text-destructive"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={copy}
            className="p-1.5 rounded-md bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
        {/* Always-visible fav indicator */}
        {isFav && (
          <Heart className="absolute top-2.5 right-2.5 h-3 w-3 text-destructive fill-current group-hover:opacity-0 transition-opacity" />
        )}
      </div>
      <div className="px-3 pb-3 pt-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-mono text-foreground/80 font-semibold leading-snug">{payload.description}</p>
          <Badge variant="outline" className={`text-[9px] shrink-0 ${SEV_STYLES[payload.severity] || ""}`}>
            {payload.severity.toUpperCase()}
          </Badge>
        </div>
        {payload.category && (
          <span className="inline-block text-[9px] font-mono text-muted-foreground bg-muted/30 border border-border/20 rounded px-1.5 py-0.5">
            {payload.category}
          </span>
        )}
        {payload.useCase && (
          <p className="text-[10px] font-mono text-muted-foreground/70 leading-snug">{payload.useCase}</p>
        )}
      </div>
    </div>
  );
}

export default function Payloads() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("severity");
  const [favorites, setFavorites] = useState<Set<number>>(() => getFavorites());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const toggleFav = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const scrollTo = useCallback((catId: string) => {
    setActiveCategory(catId === activeCategory ? null : catId);
    if (catId !== activeCategory) {
      sectionRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeCategory]);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    let cats = PAYLOAD_CATEGORIES.map((cat) => {
      let payloads = [...cat.payloads];

      // Category filter
      if (activeCategory && cat.id !== activeCategory) return { ...cat, payloads: [] };

      // Search
      if (q) {
        payloads = payloads.filter(
          (p) =>
            p.code.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (p.useCase && p.useCase.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        );
      }

      // Severity
      if (sevFilter !== "all") payloads = payloads.filter((p) => p.severity === sevFilter);

      // Favorites
      if (showFavOnly) payloads = payloads.filter((p) => favorites.has(p.id));

      // Sort
      if (sort === "severity") payloads.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
      else if (sort === "category") payloads.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      else payloads.sort((a, b) => b.id - a.id);

      return { ...cat, payloads };
    });

    return cats.filter((c) => c.payloads.length > 0);
  }, [search, activeCategory, sevFilter, showFavOnly, sort, favorites]);

  const filteredTotal = filteredCategories.reduce((sum, cat) => sum + cat.payloads.length, 0);

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-full text-[11px] font-mono border cursor-pointer transition-colors ${
      active ? "bg-primary/20 text-primary border-primary/40" : "bg-card/50 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50"
    }`;

  return (
    <div className="flex gap-6 h-[calc(100vh-5rem)]">
      {/* Left Sidebar */}
      <div className="w-52 shrink-0 space-y-1 overflow-y-auto pr-2 hidden md:block">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3 px-2">Categories</p>
        {PAYLOAD_CATEGORIES.map((cat) => {
          const matchCount = filteredCategories.find((fc) => fc.id === cat.id)?.payloads.length ?? 0;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => scrollTo(cat.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
              }`}
            >
              <span className="truncate">{cat.name}</span>
              <span className={`text-[10px] ${isActive ? "text-primary/70" : "text-muted-foreground/50"}`}>
                {matchCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-1 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-mono font-bold text-foreground">Payload Library</h1>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                {filteredTotal === TOTAL_PAYLOADS
                  ? `${TOTAL_PAYLOADS} payloads total`
                  : `Showing ${filteredTotal} of ${TOTAL_PAYLOADS} payloads`}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payloads..."
                className="w-full h-9 pl-9 pr-8 rounded-lg bg-card/50 border border-border/30 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Severity filters */}
            {(["all", "critical", "high", "medium", "low"] as SevFilter[]).map((sev) => (
              <button key={sev} onClick={() => setSevFilter(sev)} className={chip(sevFilter === sev)}>
                {sev === "all" ? "All Severities" : sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            ))}

            {/* Favorites toggle */}
            <button
              onClick={() => setShowFavOnly(!showFavOnly)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono border cursor-pointer transition-colors flex items-center gap-1 ${
                showFavOnly
                  ? "bg-destructive/15 text-destructive border-destructive/30"
                  : "bg-card/50 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50"
              }`}
            >
              <Heart className={`h-3 w-3 ${showFavOnly ? "fill-current" : ""}`} />
              Favorites{favorites.size > 0 ? ` (${favorites.size})` : ""}
            </button>

            <div className="flex-1" />

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              {([
                { key: "severity" as SortMode, label: "Severity" },
                { key: "category" as SortMode, label: "Category" },
                { key: "recent" as SortMode, label: "Recent" },
              ]).map((s) => (
                <button key={s.key} onClick={() => setSort(s.key)} className={chip(sort === s.key)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm font-mono text-muted-foreground/50">
              {showFavOnly ? "No favorited payloads match your filters" : "No payloads match your search"}
            </p>
            {(search || sevFilter !== "all" || showFavOnly || activeCategory) && (
              <button
                onClick={() => { setSearch(""); setSevFilter("all"); setShowFavOnly(false); setActiveCategory(null); }}
                className="text-xs font-mono text-primary hover:text-primary/80 cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
              className="scroll-mt-32"
            >
              <div className="mb-3">
                <h2 className="text-base font-mono font-bold text-foreground flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-primary" />
                  {cat.name}
                  <span className="text-xs font-normal text-muted-foreground">({cat.payloads.length})</span>
                </h2>
                <p className="text-xs font-mono text-muted-foreground mt-1 ml-6">{cat.description}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 ml-6">
                {cat.payloads.map((payload) => (
                  <PayloadCard
                    key={payload.id}
                    payload={payload}
                    isFav={favorites.has(payload.id)}
                    onToggleFav={() => toggleFav(payload.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
