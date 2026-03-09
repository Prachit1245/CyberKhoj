import { useState, useEffect, useCallback, useRef } from "react";

const TIMEOUT_KEY = "hackmind_session_timeout";

export type TimeoutOption = 15 | 30 | 60 | 0; // 0 = never

export function getSessionTimeout(): TimeoutOption {
  try {
    const v = localStorage.getItem(TIMEOUT_KEY);
    if (v) {
      const n = Number(v);
      if ([0, 15, 30, 60].includes(n)) return n as TimeoutOption;
    }
  } catch {}
  return 30;
}

export function setSessionTimeout(minutes: TimeoutOption) {
  localStorage.setItem(TIMEOUT_KEY, String(minutes));
}

/** Global lock trigger for manual "Lock Now" */
let manualLockCb: (() => void) | null = null;
export function registerManualLock(cb: () => void) { manualLockCb = cb; }
export function triggerManualLock() { manualLockCb?.(); }

export function useSessionLock() {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const minutes = getSessionTimeout();
    if (minutes === 0) return; // never lock
    timerRef.current = setTimeout(() => {
      setLocked(true);
    }, minutes * 60 * 1000);
  }, []);

  const lock = useCallback(() => setLocked(true), []);
  const unlock = useCallback(() => {
    setLocked(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    registerManualLock(lock);
    return () => { manualLockCb = null; };
  }, [lock]);

  useEffect(() => {
    resetTimer();
    const events = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];
    const handler = () => {
      if (!locked) resetTimer();
    };
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, locked]);

  return { locked, lock, unlock };
}
