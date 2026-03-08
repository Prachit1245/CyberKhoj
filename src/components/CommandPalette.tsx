import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Link2, Swords, Network, Clock, Code2,
  BookOpen, Settings, Search, ArrowRight, CornerDownLeft,
} from "lucide-react";
import { getHistory, type AnalysisRecord } from "@/lib/store";
import { PAYLOAD_CATEGORIES } from "@/lib/payloads";
import { CHEAT_SHEETS } from "@/lib/cheatsheets";

const RECENT_KEY = "hackmind_cmd_recent";
const MAX_RECENT = 8;

interface CmdItem {
  id: string;
  label: string;
  sublabel?: string;
  group: string;
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

const iconClass = "shrink-0 text-muted-foreground";

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

  // Focus + reset on open
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

  // Build all items
  const allItems = useMemo((): CmdItem[] => {
    const items: CmdItem[] = [];

    // Navigation
    const navItems = [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} className={iconClass} /> },
      { to: "/analyzer", label: "URL Analyzer", icon: <Link2 size={16} className={iconClass} /> },
      { to: "/attack", label: "Attack Mode", icon: <Swords size={16} className={iconClass} /> },
      { to: "/mindmap", label: "Mind Map", icon: <Network size={16} className={iconClass} /> },
      { to: "/history", label: "History", icon: <Clock size={16} className={iconClass} /> },
      { to: "/payloads", label: "Payload Library", icon: <Code2 size={16} className={iconClass} /> },
      { to: "/cheatsheets", label: "Cheat Sheets", icon: <BookOpen size={16} className={iconClass} /> },
      { to: "/settings", label: "Settings", icon: <Settings size={16} className={iconClass} /> },
    ];
    for (const n of navItems) {
      items.push({ id: `nav-${n.to}`, label: n.label, sublabel: `Go to ${n.label}`, group: "Navigation", icon: n.icon, action: () => go(n.to) });
    }

    // History
    const history = getHistory().slice(0, 20);
    for (const h of history) {
      items.push({
        id: `hist-${h.id}`,
        label: h.target,
        sublabel: `${h.type} · ${h.pathsFound} paths · ${h.date}`,
        group: "History",
        icon: <Clock size={16} className={iconClass} />,
        action: () => go(`/history/${h.id}`),
      });
    }

    // Payloads
    for (const cat of PAYLOAD_CATEGORIES) {
      items.push({
        id: `payload-${cat.id}`,
        label: cat.name,
        sublabel: `${cat.payloads.length} payloads · ${cat.description.slice(0, 60)}`,
        group: "Payloads",
        icon: <Code2 size={16} className={iconClass} />,
        action: () => go("/payloads"),
      });
    }

    // Cheat sheets
    for (const cs of CHEAT_SHEETS) {
      items.push({
        id: `cheat-${cs.id}`,
        label: cs.name,
        sublabel: `${cs.difficulty} · ${cs.sections.length} sections`,
        group: "Cheat Sheets",
        icon: <BookOpen size={16} className={iconClass} />,
        action: () => go("/cheatsheets"),
      });
    }

    return items;
  }, [go]);

  // Filtered results
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return allItems.filter((item) =>
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [query, allItems]);

  // Recent analyses for empty state
  const recentAnalyses = useMemo(() => getHistory().slice(0, 5), []);
  const recentSearches = useMemo(() => getRecent(), []);

  const displayItems = query.trim() ? filtered : [];
  const showEmpty = !query.trim();

  // Clamp index
  useEffect(() => {
    const max = displayItems.length || (showEmpty ? recentAnalyses.length + recentSearches.length : 0);
    if (selectedIdx >= max) setSelectedIdx(Math.max(0, max - 1));
  }, [displayItems, selectedIdx, showEmpty, recentAnalyses, recentSearches]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => {
        const max = query.trim() ? displayItems.length : recentAnalyses.length + recentSearches.length;
        return Math.min(prev + 1, max - 1);
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim() && displayItems[selectedIdx]) {
        pushRecent(query);
        displayItems[selectedIdx].action();
      } else if (showEmpty) {
        // Execute from empty-state items
        if (selectedIdx < recentSearches.length) {
          setQuery(recentSearches[selectedIdx]);
        } else {
          const histIdx = selectedIdx - recentSearches.length;
          if (recentAnalyses[histIdx]) {
            go(`/history/${recentAnalyses[histIdx].id}`);
          }
        }
      }
    }
  };

  // Group results
  const grouped = useMemo(() => {
    const groups: Record<string, CmdItem[]> = {};
    for (const item of displayItems) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [displayItems]);

  let flatIdx = 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl shadow-primary/5 animate-enter z-10 overflow-hidden">
        {/* Input */}
        <div className="flex items-center border-b border-border/50 px-4">
          <span className="text-primary font-mono text-lg font-bold mr-1 select-none">&gt;</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent border-none outline-none py-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/40"
          />
          <kbd className="text-[9px] font-mono text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {/* Empty state */}
          {showEmpty && (
            <div className="p-2">
              {recentSearches.length > 0 && (
                <div className="mb-1">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-3 py-2">Recent Searches</p>
                  {recentSearches.map((s, i) => {
                    const idx = i;
                    return (
                      <button
                        key={`rs-${i}`}
                        data-idx={idx}
                        onClick={() => setQuery(s)}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                          selectedIdx === idx ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Search size={14} className="shrink-0" />
                        <span className="truncate">{s}</span>
                      </button>
                    );
                  })}
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
                  Start typing to search pages, history, payloads & cheat sheets…
                </p>
              )}
            </div>
          )}

          {/* Search results */}
          {!showEmpty && displayItems.length === 0 && (
            <p className="text-xs font-mono text-muted-foreground/40 italic px-4 py-6 text-center">
              No results for "{query}"
            </p>
          )}

          {!showEmpty && Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="p-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-3 py-1.5">{group}</p>
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
                      <span className="block truncate">{item.label}</span>
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
          <span className="flex items-center gap-1"><kbd className="bg-muted px-1 rounded">Ctrl</kbd>+<kbd className="bg-muted px-1 rounded">Space</kbd></span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
