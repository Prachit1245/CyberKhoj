/* ── Typing sound effect (optional, off by default) ── */

const PREFS_KEY = "hackmind_prefs";

export const isTypingSoundEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return false;
    return JSON.parse(raw).typingSound === true;
  } catch {
    return false;
  }
};

let audioCtx: AudioContext | null = null;

const getCtx = () => {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
};

/** Play a short, subtle keystroke-like click */
export const playTypingClick = () => {
  if (!isTypingSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800 + Math.random() * 400;
    osc.type = "square";
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // silent fail
  }
};

let typingInterval: ReturnType<typeof setInterval> | null = null;

/** Start rapid typing clicks while analysis runs */
export const startTypingSound = () => {
  stopTypingSound();
  if (!isTypingSoundEnabled()) return;
  typingInterval = setInterval(() => {
    playTypingClick();
  }, 60 + Math.random() * 40);
};

/** Stop typing sound */
export const stopTypingSound = () => {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
};
