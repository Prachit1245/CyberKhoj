/* ── Safe localStorage wrapper for cross-browser compatibility ──
   Handles: Safari private browsing, disabled cookies, storage quota exceeded */

const PRIVATE_BROWSING_KEY = "__hackmind_storage_test__";

let _storageAvailable: boolean | null = null;
let _warned = false;

/** Test if localStorage is usable */
export function isStorageAvailable(): boolean {
  if (_storageAvailable !== null) return _storageAvailable;

  try {
    const storage = window.localStorage;
    storage.setItem(PRIVATE_BROWSING_KEY, "1");
    storage.removeItem(PRIVATE_BROWSING_KEY);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
  }

  return _storageAvailable;
}

/** Show a one-time warning banner if storage is unavailable */
export function warnIfNoStorage(): void {
  if (_warned || isStorageAvailable()) return;
  _warned = true;

  // Dispatch event for UI to show banner
  window.dispatchEvent(
    new CustomEvent("hackmind:storage-unavailable")
  );
}

/** Safe getItem — returns null if storage unavailable */
export function safeGetItem(key: string): string | null {
  try {
    if (!isStorageAvailable()) return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Safe setItem — silently fails if storage unavailable */
export function safeSetItem(key: string, value: string): boolean {
  try {
    if (!isStorageAvailable()) return false;
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // Quota exceeded — try to clear old data
    if (e instanceof DOMException && (e.code === 22 || e.name === "QuotaExceededError")) {
      try {
        // Remove oldest history entries to free space
        const history = localStorage.getItem("hackmind_history");
        if (history) {
          const parsed = JSON.parse(history);
          if (Array.isArray(parsed) && parsed.length > 10) {
            localStorage.setItem("hackmind_history", JSON.stringify(parsed.slice(0, 50)));
            // Retry
            localStorage.setItem(key, value);
            return true;
          }
        }
      } catch { /* give up */ }
    }
    return false;
  }
}

/** Safe removeItem */
export function safeRemoveItem(key: string): void {
  try {
    if (isStorageAvailable()) localStorage.removeItem(key);
  } catch { /* ignore */ }
}
