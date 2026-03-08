const PREFS_KEY = "hackmind_prefs";

export const isBeginnerMode = (): boolean => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return false;
    return JSON.parse(raw).beginnerMode === true;
  } catch {
    return false;
  }
};

export const setBeginnerMode = (enabled: boolean): void => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    prefs.beginnerMode = enabled;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
};
