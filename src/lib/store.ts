import LZString from "lz-string";

const STATS_KEY = "hackmind_stats";
const HISTORY_KEY = "hackmind_history";

/* ── Flag: does the stored history use LZ compression? ── */
const LZ_FLAG = "hackmind_lz";

export interface AnalysisRecord {
  id: string;
  target: string;
  type: "url" | "domain" | "request";
  pathsFound: number;
  date: string;
  result: string;
}

export interface AppStats {
  totalAnalyses: number;
  attackPaths: number;
  domainsTested: number;
  payloadsCopied: number;
}

const defaultStats: AppStats = {
  totalAnalyses: 0,
  attackPaths: 0,
  domainsTested: 0,
  payloadsCopied: 0,
};

export const getStats = (): AppStats => {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...defaultStats, ...JSON.parse(raw) } : defaultStats;
  } catch {
    return defaultStats;
  }
};

export const updateStats = (partial: Partial<AppStats>): AppStats => {
  const current = getStats();
  const updated = { ...current, ...partial };
  localStorage.setItem(STATS_KEY, JSON.stringify(updated));
  return updated;
};

export const incrementStat = (key: keyof AppStats, amount = 1): void => {
  const stats = getStats();
  stats[key] += amount;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

/* ── Compressed storage helpers ── */
function isCompressed(): boolean {
  return localStorage.getItem(LZ_FLAG) === "1";
}

function readCompressed(key: string): string | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  if (isCompressed()) {
    try {
      return LZString.decompress(raw);
    } catch {
      return raw; // fallback to uncompressed
    }
  }
  return raw;
}

function writeCompressed(key: string, data: string): void {
  // Compress if data > 10KB
  if (data.length > 10_000) {
    const compressed = LZString.compress(data);
    localStorage.setItem(key, compressed);
    localStorage.setItem(LZ_FLAG, "1");
  } else {
    localStorage.setItem(key, data);
  }
}

/* ── History (with LZ compression) ── */
export const getHistory = (): AnalysisRecord[] => {
  try {
    const raw = readCompressed(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (record: AnalysisRecord): void => {
  const history = getHistory();
  history.unshift(record);
  if (history.length > 100) history.length = 100;
  writeCompressed(HISTORY_KEY, JSON.stringify(history));
};

export const getHistoryById = (id: string): AnalysisRecord | undefined => {
  return getHistory().find((r) => r.id === id);
};

export const deleteFromHistory = (id: string): void => {
  const history = getHistory().filter((r) => r.id !== id);
  writeCompressed(HISTORY_KEY, JSON.stringify(history));
};

export const clearHistory = (): void => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  localStorage.removeItem(LZ_FLAG);
};

export const setHistory = (records: AnalysisRecord[]): void => {
  writeCompressed(HISTORY_KEY, JSON.stringify(records));
};

/* ── Migrate existing uncompressed data on first load ── */
(function migrateToLZ() {
  try {
    if (isCompressed()) return; // already compressed
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw && raw.length > 10_000) {
      // Data is large enough to benefit from compression
      const compressed = LZString.compress(raw);
      localStorage.setItem(HISTORY_KEY, compressed);
      localStorage.setItem(LZ_FLAG, "1");
    }
  } catch { /* ignore migration errors */ }
})();
