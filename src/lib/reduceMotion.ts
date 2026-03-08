/* ── Reduce Motion preference ── */
const PREFS_KEY = "hackmind_prefs";

export function isReduceMotion(): boolean {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return false;
    return JSON.parse(raw).reduceMotion === true;
  } catch {
    return false;
  }
}

export function setReduceMotion(enabled: boolean): void {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    prefs.reduceMotion = enabled;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

/** Apply or remove the reduce-motion class on <html> */
export function applyReduceMotion(): void {
  const enabled = isReduceMotion();
  if (enabled) {
    document.documentElement.classList.add("reduce-motion");
  } else {
    document.documentElement.classList.remove("reduce-motion");
  }
}
