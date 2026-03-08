import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Link2, Swords, Network, Clock, Code2,
  BookOpen, Settings, Search, ArrowRight, CornerDownLeft,
  Bug, Bookmark, Shield, Layers, ShieldAlert, Lightbulb,
} from "lucide-react";
import { getHistory, type AnalysisRecord } from "@/lib/store";
import { PAYLOAD_CATEGORIES } from "@/lib/payloads";
import { CHEAT_SHEETS } from "@/lib/cheatsheets";
import { getFindings, type Finding } from "@/lib/findings";
import { getBookmarks, type Bookmark as BookmarkItem } from "@/lib/bookmarks";

const RECENT_KEY = "hackmind_cmd_recent";
const MAX_RECENT = 8;
const MAX_PER_GROUP = 6;

interface CmdItem {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
  groupOrder: number;
  icon: React.ReactNode;
  action: () => void;
}

const getRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch { return []; }
};

const pushRecent = (query: string) => {
  const q = query.trim();
  if (!q) return;
  const list = getRecent().filter((r) => r !== q);
  list.unshift(q);
  if (list.length > MAX_RECENT) list.length = MAX_RECENT;
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
};

const ic = "shrink-0 text-muted-foreground";

const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Ctrl+Space shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const go = useCallback((path: string, searchQuery?: string) => {
    if (searchQuery) pushRecent(searchQuery);
    setOpen(false);
    navigate(path);
  }, [navigate]);

  // Build all searchable items
  const allItems = useMemo((): CmdItem[] => {
    const items: CmdItem[] = [];

    // 1. Navigation
    const navItems = [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} className={ic} /> },
      { to: "/analyzer", label: "URL Analyzer", icon: <Link2 size={16} className={ic} /> },
      { to: "/attack", label: "Attack Mode", icon: <Swords size={16} className={ic} /> },
      { to: "/mindmap", label: "Mind Map", icon: <Network size={16} className={ic} /> },
      { to: "/history", label: "History", icon: <Clock size={16} className={ic} /> },
      { to: "/payloads", label: "Payload Library", icon: <Code2 size={16} className={ic} /> },
      { to: "/cheatsheets", label: "Cheat Sheets", icon: <BookOpen size={16} className={ic} /> },
      { to: "/owasp", label: "OWASP Top 10", icon: <ShieldAlert size={16} className={ic} /> },
      { to: "/vuln-categories", label: "Vuln Categories", icon: <Layers size={16} className={ic} /> },
      { to: "/findings", label: "Findings", icon: <Bug size={16} className={ic} /> },
      { to: "/bookmarks", label: "Bookmarks", icon: <Bookmark size={16} className={ic} /> },
      { to: "/settings", label: "Settings", icon: <Settings size={16} className={ic} /> },
    ];
    for (const n of navItems) {
      items.push({ id: `nav-${n.to}`, label: n.label, sublabel: `Go to ${n.label}`, group: "Navigation", groupOrder: 0, icon: n.icon, action: () => go(n.to) });
    }

    // 2. History — search by URL and finding type
    const history = getHistory();
    for (const h of history) {
      items.push({
        id: `hist-${h.id}`,
        label: h.target,
        sublabel: `${h.type} · ${h.pathsFound} paths · ${h.date}`,
        group: "History",
        groupOrder: 1,
        icon: <Clock size={16} className={ic} />,
        action: () => go(`/history/${h.id}`),
      });
    }

    // 3. Payloads — individual payloads searchable by code + description
    for (const cat of PAYLOAD_CATEGORIES) {
      // Category-level
      items.push({
        id: `pcat-${cat.id}`,
        label: cat.name,
        sublabel: `${cat.payloads.length} payloads · ${cat.description.slice(0, 60)}`,
        group: "Payloads",
        groupOrder: 2,
        icon: <Code2 size={16} className={ic} />,
        action: () => go("/payloads"),
      });
      // Individual payloads
      for (const p of cat.payloads) {
        items.push({
          id: `pay-${p.id}`,
          label: p.description,
          sublabel: `${p.code.slice(0, 60)} · ${p.severity} · ${p.category || cat.name}`,
          group: "Payloads",
          groupOrder: 2,
          icon: <Code2 size={16} className={ic} />,
          action: () => go("/payloads"),
        });
      }
    }

    // 4. Cheat sheets — sections searchable by heading + content
    for (const cs of CHEAT_SHEETS) {
      items.push({
        id: `cs-${cs.id}`,
        label: cs.name,
        sublabel: `${cs.difficulty} · ${cs.sections.length} sections`,
        group: "Cheat Sheets",
        groupOrder: 3,
        icon: <BookOpen size={16} className={ic} />,
        action: () => go("/cheatsheets"),
      });
      for (const sec of cs.sections) {
        const codeSnippet = sec.blocks.map(b => b.code).join(" ").slice(0, 60);
        items.push({
          id: `css-${cs.id}-${sec.heading}`,
          label: sec.heading,
          sublabel: `${cs.name} · ${codeSnippet}`,
          group: "Cheat Sheets",
          groupOrder: 3,
          icon: <BookOpen size={16} className={ic} />,
          action: () => go("/cheatsheets"),
        });
      }
    }

    // 5. Findings
    const findings = getFindings();
    for (const f of findings) {
      items.push({
        id: `find-${f.id}`,
        label: f.title,
        sublabel: `${f.targetDomain} · ${f.vulnType} · ${f.severity} · ${f.status}`,
        group: "Findings",
        groupOrder: 4,
        icon: <Bug size={16} className={ic} />,
        action: () => go("/findings"),
      });
    }

    // 6. Bookmarks
    const bookmarks = getBookmarks();
    for (const b of bookmarks) {
      items.push({
        id: `bm-${b.id}`,
        label: b.title,
        sublabel: `${b.type.replace("_", " ")} · ${b.sourceContext}`,
        group: "Bookmarks",
        groupOrder: 5,
        icon: <Bookmark size={16} className={ic} />,
        action: () => go("/bookmarks"),
      });
    }

    return items;
  }, [go]);

  // Filtered results
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const words = q.split(/\s+/);
    return allItems
      .filter((item) => {
        const text = `${item.label} ${item.sublabel || ""}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .slice(0, 30);
  }, [query, allItems]);

  // Group results and cap per group
  const grouped = useMemo(() => {
    const groups: Record<string, CmdItem[]> = {};
    const groupOrder: Record<string, number> = {};
    for (const item of filtered) {
      if (!groups[item.group]) {
        groups[item.group] = [];
        groupOrder[item.group] = item.groupOrder;
      }
      if (groups[item.group].length < MAX_PER_GROUP) {
        groups[item.group].push(item);
      }
    }
    return Object.entries(groups)
      .sort(([a], [b]) => (groupOrder[a] ?? 99) - (groupOrder[b] ?? 99));
  }, [filtered]);

  const displayItems = useMemo(() => grouped.flatMap(([, items]) => items), [grouped]);

  // Recent for empty state
  const recentAnalyses = useMemo(() => getHistory().slice(0, 5), []);
  const recentSearches = useMemo(() => getRecent(), []);

  const showEmpty = !query.trim();
  const emptyTotal = recentSearches.length + recentAnalyses.length;

  // Clamp index
  useEffect(() => {
    const max = showEmpty ? emptyTotal : displayItems.length;
    if (selectedIdx >= max) setSelectedIdx(Math.max(0, max - 1));
  }, [displayItems, selectedIdx, showEmpty, emptyTotal]);

  // Scroll into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const max = showEmpty ? emptyTotal : displayItems.length;
      setSelectedIdx((prev) => Math.min(prev + 1, max - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!showEmpty && displayItems[selectedIdx]) {
        pushRecent(query);
        displayItems[selectedIdx].action();
      } else if (showEmpty) {
        if (selectedIdx < recentSearches.length) {
          setQuery(recentSearches[selectedIdx]);
        } else {
          const histIdx = selectedIdx - recentSearches.length;
          if (recentAnalyses[histIdx]) go(`/history/${recentAnalyses[histIdx].id}`);
        }
      }
    }
  };

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] md:pt-[15vh] p-2 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm animate-fade-in" />

      <div className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl shadow-primary/5 animate-enter z-10 overflow-hidden">
        {/* Input */}
        <div className="flex items-center border-b border-border/50 px-4">
          <span className="text-primary font-mono text-lg font-bold mr-1 select-none">&gt;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search everything… history, payloads, cheat sheets, findings"
            className="flex-1 bg-transparent border-none outline-none py-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/40"
          />
          <kbd className="text-[9px] font-mono text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results area */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {/* Empty state */}
          {showEmpty && (
            <div className="p-2">
              {recentSearches.length > 0 && (
                <div className="mb-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-3 py-2">Recent Searches</p>
                  {recentSearches.map((s, i) => (
                    <button
                      key={`rs-${i}`}
                      data-idx={i}
                      onClick={() => setQuery(s)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                        selectedIdx === i ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Search size={14} className="shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}

              {recentAnalyses.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-3 py-2">Recent Analyses</p>
                  {recentAnalyses.map((h, i) => {
                    const idx = recentSearches.length + i;
                    return (
                      <button
                        key={`ra-${h.id}`}
                        data-idx={idx}
                        onClick={() => go(`/history/${h.id}`)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                          selectedIdx === idx ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Clock size={14} className="shrink-0" />
                        <span className="truncate flex-1">{h.target}</span>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0">{h.pathsFound} paths</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {recentSearches.length === 0 && recentAnalyses.length === 0 && (
                <p className="text-xs font-mono text-muted-foreground/40 italic px-4 py-6 text-center">
                  Search across history, payloads, cheat sheets, findings & bookmarks…
                </p>
              )}
            </div>
          )}

          {/* No results */}
          {!showEmpty && displayItems.length === 0 && (
            <div className="px-4 py-8 text-center space-y-3">
              <Search size={28} className="mx-auto text-muted-foreground/20" />
              <p className="text-sm font-mono text-muted-foreground/50">
                No results for "<span className="text-foreground/60">{query}</span>"
              </p>
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">Try searching for</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {["XSS", "SQL injection", "IDOR", "SSRF", "bypass", "token"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); setSelectedIdx(0); }}
                      className="px-2 py-1 rounded-md border border-border/30 bg-muted/30 text-[10px] font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Grouped results */}
          {!showEmpty && grouped.map(([group, items]) => (
            <div key={group} className="p-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-3 py-1.5 flex items-center gap-2">
                {group}
                <span className="text-muted-foreground/40">({items.length}{items.length >= MAX_PER_GROUP ? "+" : ""})</span>
              </p>
              {items.map((item) => {
                const idx = flatIdx++;
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    onClick={() => { pushRecent(query); item.action(); }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg text-sm font-mono transition-colors group ${
                      selectedIdx === idx ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {item.icon}
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{highlightMatch(item.label, query)}</span>
                      {item.sublabel && (
                        <span className="block text-[10px] text-muted-foreground truncate">{item.sublabel}</span>
                      )}
                    </div>
                    {selectedIdx === idx && (
                      <CornerDownLeft size={12} className="text-primary shrink-0 opacity-60" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 text-[10px] font-mono text-muted-foreground/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">↵</kbd> Select</span>
            <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">Esc</kbd> Close</span>
          </div>
          <div className="flex items-center gap-2">
            {!showEmpty && <span>{displayItems.length} result{displayItems.length !== 1 ? "s" : ""}</span>}
            <span><kbd className="bg-muted px-1 rounded">Ctrl</kbd>+<kbd className="bg-muted px-1 rounded">Space</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Highlight matching text portions */
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const words = query.trim().toLowerCase().split(/\s+/);
  // Find the first matching word's position for a simple highlight
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;

  // Simple: highlight first occurrence of each word
  const ranges: [number, number][] = [];
  for (const w of words) {
    const idx = lower.indexOf(w, 0);
    if (idx !== -1) ranges.push([idx, idx + w.length]);
  }
  // Merge overlapping ranges
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of ranges) {
    if (merged.length && r[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], r[1]);
    } else {
      merged.push([...r]);
    }
  }

  for (const [start, end] of merged) {
    if (start > lastIdx) parts.push(text.slice(lastIdx, start));
    parts.push(<span key={start} className="text-primary font-bold">{text.slice(start, end)}</span>);
    lastIdx = end;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));

  return parts.length > 0 ? <>{parts}</> : text;
}

export default CommandPalette;
