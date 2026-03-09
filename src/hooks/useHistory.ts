import { useState, useCallback } from "react";
import type { AnalysisResult } from "@/types";
import { toast } from "@/components/Toast";
import { incrementStat } from "@/lib/store";
import { awardXp, XP_REWARDS } from "@/lib/xp";
import { isPrivateMode } from "@/lib/privateMode";

const HISTORY_KEY = "hackmind_history";
const MAX_ITEMS = 100;

/** Regex matching sensitive URL query parameter values */
const SENSITIVE_PARAMS_RE = /(token|key|secret|password|passwd|pwd|auth|api_key|apikey|access_token|bearer|client_secret|private_key|session|credential)=([^&\s]+)/gi;

/** Redact sensitive params from a target string before saving */
function redactTarget(target: string): string {
  return target.replace(SENSITIVE_PARAMS_RE, (_m, param) => `${param}=[REDACTED]`);
}

function readHistory(): AnalysisResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: AnalysisResult[]) {
  if (isPrivateMode()) return; // Don't persist in private mode
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useHistory() {
  const [history, setHistory] = useState<AnalysisResult[]>(readHistory);

  const refresh = useCallback(() => setHistory(readHistory()), []);

  const addToHistory = useCallback((result: AnalysisResult) => {
    // Redact sensitive params from input before persisting
    const safeResult = { ...result, input: redactTarget(result.input) };
    const updated = [safeResult, ...readHistory().filter((r) => r.id !== safeResult.id)].slice(0, MAX_ITEMS);
    writeHistory(updated);
    setHistory(updated);
    if (!isPrivateMode()) {
      incrementStat("totalAnalyses");
      incrementStat("attackPaths", result.paths.length);
      const xpAmount = result.depth === "deep" ? XP_REWARDS.deepAnalysis : XP_REWARDS.analysis;
      awardXp(xpAmount);
    }
    toast.success(isPrivateMode() ? "Analysis complete (Private Mode — not saved)" : "Analysis saved locally ✓");
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
