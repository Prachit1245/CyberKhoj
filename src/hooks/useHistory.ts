import { useState, useCallback } from "react";
import type { AnalysisResult } from "@/types";
import { toast } from "@/components/Toast";
import { incrementStat } from "@/lib/store";
import { awardXp, XP_REWARDS } from "@/lib/xp";

const HISTORY_KEY = "hackmind_history";
const MAX_ITEMS = 100;

function readHistory(): AnalysisResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: AnalysisResult[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useHistory() {
  const [history, setHistory] = useState<AnalysisResult[]>(readHistory);

  const refresh = useCallback(() => setHistory(readHistory()), []);

  const addToHistory = useCallback((result: AnalysisResult) => {
    const updated = [result, ...readHistory().filter((r) => r.id !== result.id)].slice(0, MAX_ITEMS);
    writeHistory(updated);
    setHistory(updated);
    incrementStat("totalAnalyses");
    incrementStat("attackPaths", result.paths.length);
    toast.success("Analysis saved locally ✓");
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    const updated = readHistory().filter((r) => r.id !== id);
    writeHistory(updated);
    setHistory(updated);
  }, []);

  const clearHistory = useCallback(() => {
    writeHistory([]);
    setHistory([]);
  }, []);

  const getById = useCallback((id: string) => {
    return readHistory().find((r) => r.id === id) ?? null;
  }, []);

  return { history, addToHistory, deleteFromHistory, clearHistory, getById, refresh };
}
