import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AlertTriangle, Zap, ShoppingCart, LogIn, Server, Shield, Upload, ListChecks, Download, CheckSquare, XSquare, Copy, Search, Shuffle, WifiOff } from "lucide-react";
import useOnline from "@/hooks/useOnline";
import { callGemini, GeminiError } from "@/lib/gemini";
import { buildAttackModePrompt, parseAttackIdeas, type AttackIdea } from "@/lib/prompts";
import { toast } from "@/components/Toast";
import { useDebouncedCallback } from "@/hooks/useDebounce";

const TEMPLATES = [
  { label: "E-commerce Site", icon: ShoppingCart, context: "e-commerce web application with cart, checkout, payments" },
  { label: "Login Page", icon: LogIn, context: "authentication page with login, signup, password reset" },
  { label: "REST API", icon: Server, context: "REST API with CRUD endpoints, token auth, rate limiting" },
  { label: "Admin Panel", icon: Shield, context: "admin dashboard with user management, settings, logs" },
  { label: "File Upload", icon: Upload, context: "file upload feature accepting images, documents, media" },
];

const checklistKey = (domain: string) => `hackmind_checklist_${domain.replace(/[^a-zA-Z0-9]/g, "_")}`;

const loadChecked = (domain: string): Set<number> => {
  try {
    const raw = localStorage.getItem(checklistKey(domain));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};

const saveChecked = (domain: string, checked: Set<number>) => {
  localStorage.setItem(checklistKey(domain), JSON.stringify([...checked]));
};

const AttackMode = () => {
  const online = useOnline();
  const [domain, setDomain] = useState("");
  const [templateContext, setTemplateContext] = useState("");
  const [allIdeas, setAllIdeas] = useState<AttackIdea[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checklistMode, setChecklistMode] = useState(false);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [celebrated, setCelebrated] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [debouncedSearchQ, setDebouncedSearchQ] = useState("");
  const applySearchQ = useDebouncedCallback((val: string) => setDebouncedSearchQ(val), 200);
  const handleSearchQ = (val: string) => { setSearchQ(val); applySearchQ(val); };
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [diffFilter, setDiffFilter] = useState<string>("all");
  const [prioFilter, setPrioFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"priority" | "difficulty" | "category">("priority");
  const [untestedOnly, setUntestedOnly] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const streamRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => { if (streamRef.current) clearInterval(streamRef.current); }, []);

  // Keyboard shortcut: Ctrl+Enter = generate
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("hackmind:run-attack"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const run = () => { if (!loading) generate(); };
    document.addEventListener("hackmind:run-attack", run);
    return () => document.removeEventListener("hackmind:run-attack", run);
  });

  // Load saved checklist when domain changes and ideas exist
  useEffect(() => {
    if (domain && allIdeas.length > 0) {
      setChecked(loadChecked(domain));
    }
  }, [domain, allIdeas.length]);

  // Check for celebration
  useEffect(() => {
    if (checklistMode && allIdeas.length > 0 && checked.size === allIdeas.length && !celebrated) {
      setCelebrated(true);
      toast.success("Attack surface fully tested! 🎯");
    }
  }, [checked.size, allIdeas.length, checklistMode, celebrated]);

  const toggleCheck = useCallback((id: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (domain) saveChecked(domain, next);
      return next;
    });
    setCelebrated(false);
  }, [domain]);

  const checkAll = () => {
    const all = new Set(allIdeas.map(i => i.id));
    setChecked(all);
    if (domain) saveChecked(domain, all);
  };

  const clearAll = () => {
    setChecked(new Set());
    if (domain) saveChecked(domain, new Set());
    setCelebrated(false);
  };

  const exportChecklist = () => {
    const lines = ["# Attack Checklist — " + domain, "", `Progress: ${checked.size} / ${allIdeas.length}`, ""];
    allIdeas.forEach(i => {
      lines.push(`- [${checked.has(i.id) ? "x" : " "}] **#${String(i.id).padStart(3, "0")}** [${i.category}] ${i.idea}`);
    });
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Checklist copied as markdown ✓");
  };

  const generate = async () => {
    if (!domain.trim()) { toast.error("Enter a target domain"); return; }
    setLoading(true);
    setAllIdeas([]);
    setVisibleCount(0);
    setCelebrated(false);
    if (streamRef.current) clearInterval(streamRef.current);

    try {
      const raw = await callGemini(buildAttackModePrompt(domain, templateContext || undefined));
      const parsed = parseAttackIdeas(raw);
      setAllIdeas(parsed);
      setChecked(loadChecked(domain));

      let shown = 0;
      streamRef.current = setInterval(() => {
        shown += 1;
        setVisibleCount(shown);
        if (shown >= parsed.length) {
          if (streamRef.current) clearInterval(streamRef.current);
          toast.success(`Generated ${parsed.length} attack ideas ✓`);
        }
      }, 50);
    } catch (err: any) {
      if (err instanceof GeminiError) {
        toast.error(`${err.code}: ${err.message}`);
      } else {
        toast.error(err.message || "Failed to generate ideas");
      }
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (t: typeof TEMPLATES[0]) => {
    setTemplateContext(t.context);
    if (!domain.trim()) setDomain(t.label.toLowerCase().replace(/\s+/g, "-") + ".example.com");
    toast.info(`Template applied: ${t.label}`);
  };

  const catColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("xss")) return "text-yellow-400 border-yellow-400/30";
    if (c.includes("sql")) return "text-red-400 border-red-400/30";
    if (c.includes("auth")) return "text-orange-400 border-orange-400/30";
    if (c.includes("idor")) return "text-purple-400 border-purple-400/30";
    if (c.includes("ssrf")) return "text-cyan-400 border-cyan-400/30";
    if (c.includes("logic")) return "text-pink-400 border-pink-400/30";
    if (c.includes("rce")) return "text-red-500 border-red-500/30";
    return "text-primary border-primary/30";
  };

  const diffDot = (d: string) =>
    d === "advanced" ? "bg-red-500" : d === "intermediate" ? "bg-yellow-500" : "bg-emerald-500";

  const total = allIdeas.length;
  const revealed = allIdeas.slice(0, visibleCount);
  const progress = total > 0 ? (visibleCount / total) * 100 : 0;
  const streaming = visibleCount > 0 && visibleCount < total;
  const testedCount = checked.size;
  const testProgress = total > 0 ? (testedCount / total) * 100 : 0;

  // Collect unique categories
  const categories = [...new Set(revealed.map(i => i.category))].sort();

  // Filter + sort
  const filtered = (() => {
    let result = [...revealed];
    if (catFilter) result = result.filter(i => i.category === catFilter);
    if (diffFilter !== "all") result = result.filter(i => i.difficulty === diffFilter);
    if (prioFilter !== "all") result = result.filter(i => i.priority === prioFilter);
    if (untestedOnly) result = result.filter(i => !checked.has(i.id));
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      result = result.filter(i => i.idea.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    // Sort
    const prioRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const diffRank: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
    if (sortMode === "priority") result.sort((a, b) => (prioRank[a.priority] ?? 1) - (prioRank[b.priority] ?? 1));
    else if (sortMode === "difficulty") result.sort((a, b) => (diffRank[a.difficulty] ?? 1) - (diffRank[b.difficulty] ?? 1));
    else result.sort((a, b) => a.category.localeCompare(b.category));
    // Shuffle
    if (shuffleSeed > 0) {
      for (let i = result.length - 1; i > 0; i--) {
        const j = (shuffleSeed * (i + 1) * 9301 + 49297) % result.length;
        [result[i], result[j]] = [result[j], result[i]];
      }
    }
    return result;
  })();

  const btn = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border/30 bg-card/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors cursor-pointer";
  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-mono cursor-pointer transition-all duration-200 border ${
      active
        ? "bg-primary/20 border-primary text-primary"
        : "bg-card/50 border-border/30 text-muted-foreground hover:border-primary/40"
    }`;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">ATTACK MODE</h1>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-xs font-mono text-yellow-500/90">
          Only test systems you own or have explicit written permission to test.
        </p>
      </div>

      {/* Quick Templates */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => selectTemplate(t)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                templateContext === t.context
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input + Button */}
      <div className="flex gap-3">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
          placeholder="example.com"
          className="flex-1 h-12 rounded-lg bg-card/50 border border-border/30 px-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
        <button
          onClick={generate}
          disabled={loading || streaming || !online}
          title={!online ? "Requires internet for AI analysis" : "Ctrl+Enter"}
          className="h-12 px-6 rounded-lg font-heading font-bold text-sm text-white transition-all disabled:opacity-50 cursor-pointer"
          style={{ background: !online ? undefined : "linear-gradient(135deg, hsl(0 80% 50%), hsl(25 95% 53%))" }}
        >
          <span className="flex items-center gap-2">
            {!online ? <WifiOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {!online ? "OFFLINE" : loading ? "GENERATING..." : streaming ? "STREAMING..." : "GENERATE 100 ATTACK IDEAS"}
            {online && <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-white/30 text-[10px] font-mono opacity-70">⌘↵</kbd>}
          </span>
        </button>
      </div>

      {/* Progress + Counter */}
      {(loading || visibleCount > 0) && (
        <div className="space-y-2">
          <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "hsl(0 0% 15%)" }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${loading && visibleCount === 0 ? 30 : progress}%`,
                background: "linear-gradient(90deg, hsl(0 80% 50%), hsl(25 95% 53%))",
              }}
            />
          </div>
          <div className="text-center">
            <span className="text-5xl font-heading font-bold tabular-nums" style={{
              background: "linear-gradient(135deg, hsl(0 80% 50%), hsl(25 95% 53%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              {visibleCount}
            </span>
            <span className="text-muted-foreground font-mono text-sm ml-2">/ {total || 100} ideas</span>
          </div>
        </div>
      )}

      {/* Checklist toolbar */}
      {revealed.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setChecklistMode(!checklistMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
              checklistMode
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/30 bg-card/50 text-muted-foreground hover:text-primary hover:border-primary/40"
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" />
            Checklist Mode
          </button>

          {checklistMode && (
            <>
              <button onClick={checkAll} className={btn}><CheckSquare className="h-3.5 w-3.5" />Check All</button>
              <button onClick={clearAll} className={btn}><XSquare className="h-3.5 w-3.5" />Clear All</button>
              <button onClick={exportChecklist} className={btn}><Copy className="h-3.5 w-3.5" />Export Checklist</button>

              <div className="flex-1" />

              {/* Tested progress */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground">
                  <span className="text-primary font-semibold">{testedCount}</span> / {total} tested
                </span>
                <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(0 0% 15%)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300 bg-primary"
                    style={{ width: `${testProgress}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Celebration */}
      {celebrated && checklistMode && (
        <div className="text-center py-6 animate-scale-in">
          <p className="text-2xl font-heading font-bold text-primary">
            Attack surface fully tested! 🎯
          </p>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            All {total} ideas checked off for {domain}
          </p>
        </div>
      )}

      {/* Filters */}
      {revealed.length > 0 && !streaming && (
        <div className="space-y-3 rounded-lg border border-border/20 bg-card/20 p-4">
          {/* Row 1: Search + Sort + Randomize */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search ideas..."
                className="h-8 w-full rounded-lg bg-card/50 border border-border/30 pl-8 pr-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => { setSortMode(e.target.value as any); setShuffleSeed(0); }}
              className="h-8 rounded-lg bg-card/50 border border-border/30 px-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
            >
              <option value="priority">Sort: Priority</option>
              <option value="difficulty">Sort: Difficulty</option>
              <option value="category">Sort: Category</option>
            </select>
            <button onClick={() => setShuffleSeed(Date.now())} className={btn}><Shuffle className="h-3.5 w-3.5" />Randomize</button>
            {checklistMode && (
              <button
                onClick={() => setUntestedOnly(!untestedOnly)}
                className={pillClass(untestedOnly)}
              >
                Untested Only
              </button>
            )}
          </div>

          {/* Row 2: Category chips */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCatFilter(null)} className={pillClass(!catFilter)}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setCatFilter(catFilter === cat ? null : cat)} className={pillClass(catFilter === cat)}>
                {cat}
              </button>
            ))}
          </div>

          {/* Row 3: Difficulty + Priority */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-muted-foreground mr-1">Difficulty:</span>
              {["all", "beginner", "intermediate", "advanced"].map(d => (
                <button key={d} onClick={() => setDiffFilter(d)} className={pillClass(diffFilter === d)}>
                  {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-muted-foreground mr-1">Priority:</span>
              {["all", "high", "medium", "low"].map(p => (
                <button key={p} onClick={() => setPrioFilter(p)} className={pillClass(prioFilter === p)}>
                  {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <p className="text-xs font-mono text-muted-foreground">
            Showing <span className="text-primary font-semibold">{filtered.length}</span> / {revealed.length} ideas
          </p>
        </div>
      )}

      {/* Ideas Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((idea) => {
            const isChecked = checked.has(idea.id);
            return (
              <div
                key={idea.id}
                onClick={checklistMode ? () => toggleCheck(idea.id) : undefined}
                className={`p-3 rounded-lg border transition-colors animate-fade-in ${
                  checklistMode ? "cursor-pointer" : ""
                } ${
                  isChecked && checklistMode
                    ? "border-primary/30 bg-primary/5 opacity-60"
                    : "border-border/20 bg-card/30 hover:border-primary/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  {checklistMode ? (
                    <span className={`shrink-0 mt-0.5 flex items-center justify-center h-5 w-5 rounded border transition-colors ${
                      isChecked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    }`}>
                      {isChecked && <span className="text-[10px]">✓</span>}
                    </span>
                  ) : (
                    <span className="shrink-0 flex items-center justify-center h-6 w-9 rounded bg-muted/30 text-[10px] font-mono text-muted-foreground font-bold">
                      #{String(idea.id).padStart(3, "0")}
                    </span>
                  )}
                  <span className={`shrink-0 mt-2 h-2 w-2 rounded-full ${diffDot(idea.difficulty)}`} title={idea.difficulty} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className={`font-mono text-xs leading-relaxed ${isChecked && checklistMode ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {idea.idea}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${catColor(idea.category)}`}>
                        {idea.category}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        idea.priority === "high" ? "text-red-400 border-red-400/30" :
                        idea.priority === "medium" ? "text-orange-400 border-orange-400/30" :
                        "text-muted-foreground border-border/30"
                      }`}>{idea.priority}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttackMode;
