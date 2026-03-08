const STATS_KEY = "hackmind_stats";
const HISTORY_KEY = "hackmind_history";

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

export const getHistory = (): AnalysisRecord[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (record: AnalysisRecord): void => {
  const history = getHistory();
  history.unshift(record);
  // Keep last 100
  if (history.length > 100) history.length = 100;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const getHistoryById = (id: string): AnalysisRecord | undefined => {
  return getHistory().find((r) => r.id === id);
};
