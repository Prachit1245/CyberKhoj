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

/* ── Achievement Sound ── */
export const isAchievementSoundEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return false;
    return JSON.parse(raw).achievementSound === true;
  } catch {
    return false;
  }
};

/** Play a short celebratory blip for achievement unlock */
export const playAchievementSound = () => {
  if (!isAchievementSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Rising two-tone blip
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(600, now);
    osc1.frequency.linearRampToValueAtTime(900, now + 0.1);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(800, now + 0.08);
    osc2.frequency.linearRampToValueAtTime(1200, now + 0.18);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.25);
  } catch {
    // silent fail
  }
};

/** Play a level-up fanfare */
export const playLevelUpSound = () => {
  if (!isAchievementSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    // silent fail
  }
};
