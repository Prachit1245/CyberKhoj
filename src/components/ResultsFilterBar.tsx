import { useState, useMemo } from "react";
import type { AttackPath, Severity } from "@/types";
import { Search } from "lucide-react";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

const CATEGORY_CHIPS = [
  "IDOR", "SQLi", "XSS", "AuthBypass", "SSRF", "LFI", "JWT", "BusinessLogic", "Other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  AuthBypass: "Auth",
  BusinessLogic: "Logic",
};

type SortMode = "severity" | "category" | "alpha";
type TestedFilter = "all" | "tested" | "untested";

interface Props {
  paths: AttackPath[];
  children: (filtered: AttackPath[]) => React.ReactNode;
}

const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ResultsFilterBar({ paths, children }: Props) {
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("severity");
  const [search, setSearch] = useState("");
  const [testedFilter, setTestedFilter] = useState<TestedFilter>("all");

  // Counts
  const sevCounts = useMemo(() => {
    const c: Record<string, number> = { all: paths.length };
    for (const s of SEVERITY_ORDER) c[s] = 0;
    paths.forEach((p) => { c[p.severity] = (c[p.severity] || 0) + 1; });
    return c;
  }, [paths]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    CATEGORY_CHIPS.forEach((cat) => { c[cat] = 0; });
    paths.forEach((p) => {
      const key = CATEGORY_CHIPS.includes(p.category as any) ? p.category : "Other";
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [paths]);

  const filtered = useMemo(() => {
    let result = [...paths];

    if (severityFilter !== "all") result = result.filter((p) => p.severity === severityFilter);
    if (categoryFilter) {
      result = categoryFilter === "Other"
        ? result.filter((p) => !CATEGORY_CHIPS.includes(p.category as any) || p.category === "Other")
        : result.filter((p) => p.category === categoryFilter);
    }
    if (testedFilter === "tested") result = result.filter((p) => p.isTested);
    if (testedFilter === "untested") result = result.filter((p) => !p.isTested);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === "severity") result.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
    else if (sort === "category") result.sort((a, b) => a.category.localeCompare(b.category));
    else result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [paths, severityFilter, categoryFilter, sort, search, testedFilter]);

  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-mono cursor-pointer transition-all duration-200 border ${
      active
        ? "bg-primary/20 border-primary text-primary"
        : "bg-card/50 border-border/30 text-muted-foreground hover:border-primary/40"
    }`;

  return (
    <div className="space-y-3">
      {/* Row 1: Severity pills + search + sort */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Severity pills */}
        {(["all", ...SEVERITY_ORDER] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            className={pillClass(severityFilter === sev)}
          >
            {sev === "all" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
            <span className="ml-1.5 opacity-60">{sevCounts[sev] ?? 0}</span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search results..."
            className="h-8 w-44 rounded-lg bg-card/50 border border-border/30 pl-8 pr-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="h-8 rounded-lg bg-card/50 border border-border/30 px-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
        >
          <option value="severity">By Severity</option>
          <option value="category">By Category</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>

      {/* Row 2: Category chips + tested toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_CHIPS.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
            className={pillClass(categoryFilter === cat)}
          >
            {CATEGORY_LABELS[cat] || cat}
            <span className="ml-1.5 opacity-60">{catCounts[cat] ?? 0}</span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Tested toggle */}
        <div className="flex rounded-lg border border-border/30 overflow-hidden">
          {(["all", "tested", "untested"] as TestedFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTestedFilter(t)}
              className={`px-3 py-1 text-xs font-mono transition-colors ${
                testedFilter === t
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs font-mono text-muted-foreground">
        {filtered.length} of {paths.length} paths
      </p>

      {/* Render filtered results */}
      <div className="space-y-3">
        {children(filtered)}
      </div>
    </div>
  );
}
