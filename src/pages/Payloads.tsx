import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search, Copy, Check, ChevronRight, Heart, X, ArrowUpDown,
  Bookmark, BookmarkCheck, Plus, Pencil, Trash2, Download, Upload,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/Toast";
import {
  PAYLOAD_CATEGORIES, TOTAL_PAYLOADS, CUSTOM_CATEGORIES,
  type Payload, type CustomPayload,
  getCustomPayloads, addCustomPayload, updateCustomPayload,
  deleteCustomPayload, exportCustomPayloadsJson, importCustomPayloads,
} from "@/lib/payloads";
import { incrementStat } from "@/lib/store";
import { toggleBookmark, isBookmarked as isBm } from "@/lib/bookmarks";
import LZString from "lz-string";

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

/* ── Share payload via URL hash ── */
function sharePayload(payload: CustomPayload) {
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  const url = `${window.location.origin}/payloads#payload=${compressed}`;
  navigator.clipboard.writeText(url);
  if (url.length > 2000) {
    toast.info("Share link copied (URL is long, may not work in all browsers)");
  } else {
    toast.success("Share link copied to clipboard ✓");
  }
}

function decodeSharedPayload(): CustomPayload | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith("#payload=")) return null;
    const compressed = hash.slice("#payload=".length);
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    return JSON.parse(json);
  } catch { return null; }
}

/* ── Payload Card (built-in) ── */
function PayloadCard({ payload, isFav, onToggleFav }: { payload: Payload; isFav: boolean; onToggleFav: () => void }) {
  const [copied, setCopied] = useState(false);
  const [bookmarked, setBookmarked] = useState(() => isBm("payload", payload.description));

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
            onClick={() => {
              const { added } = toggleBookmark({
                type: "payload",
                title: payload.description,
                description: payload.code.slice(0, 100),
                sourceContext: payload.category || "Payload Library",
                severity: payload.severity,
                code: payload.code,
              });
              setBookmarked(added);
              toast[added ? "success" : "info"](added ? "Payload bookmarked ✓" : "Bookmark removed");
            }}
            className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
              bookmarked
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-muted/60 border-border/30 text-muted-foreground hover:text-primary"
            }`}
          >
            {bookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
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

/* ── Custom Payload Card ── */
function CustomPayloadCard({
  payload,
  onEdit,
  onDelete,
  onShare,
}: {
  payload: CustomPayload;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(payload.code);
    setCopied(true);
    incrementStat("payloadsCopied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-card/50 hover:bg-card/80 hover:border-primary/40 transition-all overflow-hidden">
      <div className="relative group">
        <pre className="p-3 pr-24 text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap break-all" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
          {payload.code}
        </pre>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onShare} className="p-1.5 rounded-md bg-muted/60 border border-border/30 text-muted-foreground hover:text-secondary transition-colors cursor-pointer" title="Share">
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-md bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md bg-muted/60 border border-border/30 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={copy} className="p-1.5 rounded-md bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="px-3 pb-3 pt-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-mono text-foreground/80 font-semibold leading-snug">{payload.description}</p>
          <div className="flex gap-1 shrink-0">
            <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">CUSTOM</Badge>
            <Badge variant="outline" className={`text-[9px] ${SEV_STYLES[payload.severity] || ""}`}>
              {payload.severity.toUpperCase()}
            </Badge>
          </div>
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

/* ── Add/Edit Payload Modal ── */
function PayloadFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CustomPayload | null;
  onSave: (data: { code: string; description: string; category: string; severity: Payload["severity"]; useCase: string }) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(initial?.code || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "Custom");
  const [severity, setSeverity] = useState<Payload["severity"]>(initial?.severity || "medium");
  const [useCase, setUseCase] = useState(initial?.useCase || "");

  const handleSubmit = () => {
    if (!code.trim()) { toast.error("Payload text is required"); return; }
    if (!description.trim()) { toast.error("Description is required"); return; }
    onSave({ code: code.trim(), description: description.trim(), category, severity, useCase: useCase.trim() });
  };

  const inputCls = "w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 space-y-4 animate-scale-in">
        <h3 className="font-heading text-base font-bold text-foreground">
          {initial ? "Edit Payload" : "Add Custom Payload"}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Payload Code *</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={3}
              placeholder="<script>alert(1)</script>"
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Description *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this payload tests" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                {CUSTOM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Payload["severity"])} className={inputCls}>
                {(["critical", "high", "medium", "low"] as const).map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Use Case (optional)</label>
            <input value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder="When to use this payload" className={inputCls} />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors cursor-pointer">
            {initial ? "Update" : "Add Payload"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ Main Page ═══════════════════════ */

export default function Payloads() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<SevFilter>("all");
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("severity");
  const [favorites, setFavorites] = useState<Set<number>>(() => getFavorites());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Custom payloads state
  const [customPayloads, setCustomPayloads] = useState<CustomPayload[]>(() => getCustomPayloads());
  const [showForm, setShowForm] = useState(false);
  const [editingPayload, setEditingPayload] = useState<CustomPayload | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Check for shared payload in URL hash on mount
  useState(() => {
    const shared = decodeSharedPayload();
    if (shared) {
      const exists = customPayloads.some((p) => p.code === shared.code);
      if (!exists) {
        const added = addCustomPayload({
          code: shared.code,
          description: shared.description,
          category: shared.category || "Custom",
          severity: shared.severity || "medium",
          useCase: shared.useCase || "",
        });
        setCustomPayloads(getCustomPayloads());
        toast.success("Shared payload imported ✓");
      } else {
        toast.info("This payload already exists in your collection");
      }
      // Clean hash
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

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

  // Merge custom payloads into filterable list
  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();

    // Filter custom payloads
    let filteredCustom = [...customPayloads];
    if (q) {
      filteredCustom = filteredCustom.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.useCase && p.useCase.toLowerCase().includes(q))
      );
    }
    if (sevFilter !== "all") filteredCustom = filteredCustom.filter((p) => p.severity === sevFilter);
    if (activeCategory && activeCategory !== "custom") filteredCustom = [];
    if (showFavOnly) filteredCustom = []; // Favorites only applies to built-in

    // Sort custom
    if (sort === "severity") filteredCustom.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
    else if (sort === "recent") filteredCustom.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter built-in categories
    let cats = PAYLOAD_CATEGORIES.map((cat) => {
      let payloads = [...cat.payloads];

      if (activeCategory && activeCategory !== "custom" && cat.id !== activeCategory) return { ...cat, payloads: [] };
      if (activeCategory === "custom") return { ...cat, payloads: [] };

      if (q) {
        payloads = payloads.filter(
          (p) =>
            p.code.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (p.useCase && p.useCase.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q))
        );
      }

      if (sevFilter !== "all") payloads = payloads.filter((p) => p.severity === sevFilter);
      if (showFavOnly) payloads = payloads.filter((p) => favorites.has(p.id));

      if (sort === "severity") payloads.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
      else if (sort === "category") payloads.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      else payloads.sort((a, b) => b.id - a.id);

      return { ...cat, payloads };
    });

    return { builtIn: cats.filter((c) => c.payloads.length > 0), custom: filteredCustom };
  }, [search, activeCategory, sevFilter, showFavOnly, sort, favorites, customPayloads]);

  const builtInTotal = filteredCategories.builtIn.reduce((sum, cat) => sum + cat.payloads.length, 0);
  const totalShown = builtInTotal + filteredCategories.custom.length;
  const grandTotal = TOTAL_PAYLOADS + customPayloads.length;

  // CRUD handlers
  const handleAddPayload = (data: { code: string; description: string; category: string; severity: Payload["severity"]; useCase: string }) => {
    addCustomPayload(data);
    setCustomPayloads(getCustomPayloads());
    setShowForm(false);
    toast.success("Custom payload added ✓");
  };

  const handleEditPayload = (data: { code: string; description: string; category: string; severity: Payload["severity"]; useCase: string }) => {
    if (!editingPayload) return;
    updateCustomPayload(editingPayload.id, data);
    setCustomPayloads(getCustomPayloads());
    setEditingPayload(null);
    toast.success("Payload updated ✓");
  };

  const handleDelete = (id: string) => {
    deleteCustomPayload(id);
    setCustomPayloads(getCustomPayloads());
    toast.success("Payload deleted");
  };

  const handleExport = () => {
    const json = exportCustomPayloadsJson();
    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `hackmind-custom-payloads-${new Date().toISOString().slice(0, 10)}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Custom payloads exported");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = importCustomPayloads(reader.result as string);
        setCustomPayloads(getCustomPayloads());
        toast.success(`Imported ${count} payload${count !== 1 ? "s" : ""} ✓`);
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-full text-[11px] font-mono border cursor-pointer transition-colors ${
      active ? "bg-primary/20 text-primary border-primary/40" : "bg-card/50 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50"
    }`;

  return (
    <div className="flex gap-6 h-[calc(100vh-5rem)]">
      {/* Left Sidebar */}
      <div className="w-52 shrink-0 space-y-1 overflow-y-auto pr-2 hidden md:block">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3 px-2">Categories</p>

        {/* My Payloads category */}
        <button
          onClick={() => scrollTo("custom")}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
            activeCategory === "custom"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-primary/70 hover:text-primary hover:bg-card/50 border border-transparent"
          }`}
        >
          <span className="truncate flex items-center gap-1.5">
            <Plus className="h-3 w-3" /> My Payloads
          </span>
          <span className={`text-[10px] ${activeCategory === "custom" ? "text-primary/70" : "text-muted-foreground/50"}`}>
            {customPayloads.length}
          </span>
        </button>

        <div className="border-t border-border/20 my-2" />

        {PAYLOAD_CATEGORIES.map((cat) => {
          const matchCount = filteredCategories.builtIn.find((fc) => fc.id === cat.id)?.payloads.length ?? 0;
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
                {totalShown === grandTotal
                  ? `${grandTotal} payloads total (${customPayloads.length} custom)`
                  : `Showing ${totalShown} of ${grandTotal} payloads`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="h-9 px-3 rounded-lg font-mono font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Payload
              </button>
              <div className="relative w-full sm:w-60">
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
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "critical", "high", "medium", "low"] as SevFilter[]).map((sev) => (
              <button key={sev} onClick={() => setSevFilter(sev)} className={chip(sevFilter === sev)}>
                {sev === "all" ? "All Severities" : sev.charAt(0).toUpperCase() + sev.slice(1)}
              </button>
            ))}

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

        {/* My Payloads Section */}
        {(filteredCategories.custom.length > 0 || (activeCategory === "custom" || (!activeCategory && !showFavOnly))) && (
          <div ref={(el) => { sectionRefs.current["custom"] = el; }} className="scroll-mt-32">
            <div className="mb-3">
              <h2 className="text-base font-mono font-bold text-foreground flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-primary" />
                My Payloads
                <span className="text-xs font-normal text-muted-foreground">({filteredCategories.custom.length})</span>
              </h2>
              <div className="flex items-center gap-2 mt-2 ml-6">
                <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono border border-primary/30 text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                  <Plus className="h-3 w-3" /> Add
                </button>
                {customPayloads.length > 0 && (
                  <>
                    <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono border border-border/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      <Download className="h-3 w-3" /> Export JSON
                    </button>
                  </>
                )}
                <button onClick={() => importRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono border border-border/30 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  <Upload className="h-3 w-3" /> Import JSON
                </button>
                <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              </div>
            </div>

            {filteredCategories.custom.length === 0 ? (
              <div className="ml-6 py-6 text-center rounded-lg border border-dashed border-border/30">
                <p className="text-xs font-mono text-muted-foreground/50">
                  {customPayloads.length === 0
                    ? "No custom payloads yet. Add your first one!"
                    : "No custom payloads match your filters"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 ml-6">
                {filteredCategories.custom.map((payload) => (
                  <CustomPayloadCard
                    key={payload.id}
                    payload={payload}
                    onEdit={() => setEditingPayload(payload)}
                    onDelete={() => handleDelete(payload.id)}
                    onShare={() => sharePayload(payload)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Built-in Sections */}
        {filteredCategories.builtIn.length === 0 && filteredCategories.custom.length === 0 ? (
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
          filteredCategories.builtIn.map((cat) => (
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

      {/* Add Modal */}
      {showForm && (
        <PayloadFormModal
          onSave={handleAddPayload}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Edit Modal */}
      {editingPayload && (
        <PayloadFormModal
          initial={editingPayload}
          onSave={handleEditPayload}
          onClose={() => setEditingPayload(null)}
        />
      )}
    </div>
  );
}
