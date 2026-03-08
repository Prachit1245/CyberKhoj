import { useState, useMemo, useRef, useCallback } from "react";
import { Search, Copy, Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PAYLOAD_CATEGORIES, TOTAL_PAYLOADS, type Payload } from "@/lib/payloads";
import { incrementStat } from "@/lib/store";

const SEV_STYLES: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

function PayloadCard({ payload }: { payload: Payload }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(payload.code);
    setCopied(true);
    incrementStat("payloadsCopied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-border/20 bg-card/50 hover:bg-card/80 hover:border-border/40 transition-all overflow-hidden">
      {/* Code block */}
      <div className="relative group">
        <pre className="p-3 pr-12 text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          {payload.code}
        </pre>
        <button
          onClick={copy}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      {/* Footer */}
      <div className="px-3 pb-3 pt-1 flex items-start justify-between gap-2">
        <p className="text-[11px] font-mono text-muted-foreground leading-snug">{payload.description}</p>
        <Badge variant="outline" className={`text-[9px] shrink-0 ${SEV_STYLES[payload.severity] || ""}`}>
          {payload.severity.toUpperCase()}
        </Badge>
      </div>
    </div>
  );
}

export default function Payloads() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollTo = useCallback((catId: string) => {
    setActiveCategory(catId);
    sectionRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return PAYLOAD_CATEGORIES;
    const q = search.toLowerCase();
    return PAYLOAD_CATEGORIES.map((cat) => ({
      ...cat,
      payloads: cat.payloads.filter(
        (p) => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.payloads.length > 0);
  }, [search]);

  const filteredTotal = filteredCategories.reduce((sum, cat) => sum + cat.payloads.length, 0);

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
      <div className="flex-1 overflow-y-auto space-y-8 pr-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 pt-1">
          <div>
            <h1 className="text-xl font-mono font-bold text-foreground">Payload Library</h1>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {filteredTotal === TOTAL_PAYLOADS
                ? `${TOTAL_PAYLOADS} payloads total`
                : `${filteredTotal} of ${TOTAL_PAYLOADS} payloads`}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payloads..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-card/50 border border-border/30 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Sections */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-mono text-muted-foreground/50">No payloads match your search</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div
              key={cat.id}
              ref={(el) => { sectionRefs.current[cat.id] = el; }}
              className="scroll-mt-16"
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
                  <PayloadCard key={payload.id} payload={payload} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
