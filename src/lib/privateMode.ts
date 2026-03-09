/* ── Private Mode ──
   When enabled, nothing is saved to localStorage.
   The toggle itself lives in sessionStorage so it resets on browser close. */

const PM_KEY = "hackmind_private_mode";

export function isPrivateMode(): boolean {
  try {
    return sessionStorage.getItem(PM_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPrivateMode(enabled: boolean): void {
  try {
    if (enabled) {
      sessionStorage.setItem(PM_KEY, "1");
    } else {
      sessionStorage.removeItem(PM_KEY);
    }
    window.dispatchEvent(new Event("hackmind:private-mode-changed"));
  } catch { /* ignore */ }
}
