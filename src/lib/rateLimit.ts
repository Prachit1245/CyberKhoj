/** Client-side rate limiter — tracks requests per minute in memory only */

let requestTimestamps: number[] = [];
let listeners: Set<() => void> = new Set();

const MAX_RPM = 10;
const WINDOW_MS = 60_000;

function pruneOld() {
  const cutoff = Date.now() - WINDOW_MS;
  requestTimestamps = requestTimestamps.filter((t) => t > cutoff);
}

export function getRPM(): number {
  pruneOld();
  return requestTimestamps.length;
}

export function canRequest(): boolean {
  return getRPM() < MAX_RPM;
}

export function recordRequest() {
  requestTimestamps.push(Date.now());
  notifyListeners();
}

export function getMaxRPM() {
  return MAX_RPM;
}

/** Subscribe to RPM changes */
export function onRPMChange(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

// Prune periodically
if (typeof window !== "undefined") {
  setInterval(() => {
    const before = requestTimestamps.length;
    pruneOld();
    if (requestTimestamps.length !== before) notifyListeners();
  }, 5_000);
}
