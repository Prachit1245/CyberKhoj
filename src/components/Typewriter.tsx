import { useState, useEffect, useCallback } from "react";

const PHRASES = [
  "Think Like A Hacker.",
  "Find Vulnerabilities Faster.",
  "Built For Bug Bounty Hunters.",
];

const TYPE_SPEED = 60;
const DELETE_SPEED = 35;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_DELETE = 400;

const Typewriter = () => {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const tick = useCallback(() => {
    const current = PHRASES[phraseIdx];

    if (!deleting) {
      if (charIdx < current.length) {
        return setTimeout(() => setCharIdx((c) => c + 1), TYPE_SPEED);
      }
      return setTimeout(() => setDeleting(true), PAUSE_AFTER_TYPE);
    }

    if (charIdx > 0) {
      return setTimeout(() => setCharIdx((c) => c - 1), DELETE_SPEED);
    }

    setDeleting(false);
    setPhraseIdx((p) => (p + 1) % PHRASES.length);
    return setTimeout(() => {}, PAUSE_AFTER_DELETE);
  }, [charIdx, deleting, phraseIdx]);

  useEffect(() => {
    const timer = tick();
    return () => clearTimeout(timer);
  }, [tick]);

  return (
    <span className="font-mono text-foreground">
      {PHRASES[phraseIdx].slice(0, charIdx)}
      <span className="blinking-cursor text-primary ml-0.5">▌</span>
    </span>
  );
};

export default Typewriter;
