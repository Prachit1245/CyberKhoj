import { useState, useEffect, type ReactNode } from "react";
import { hasApiKey, saveApiKey } from "@/lib/gemini";

const ApiKeyGate = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(hasApiKey());
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setUnlocked(hasApiKey());
  }, []);

  const handleSubmit = () => {
    const trimmed = key.trim();
    if (!trimmed || trimmed.length < 10) {
      setError("Please enter a valid API key.");
      return;
    }
    saveApiKey(trimmed);
    setUnlocked(true);
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <div className="gate-card w-full max-w-lg rounded-xl border border-primary/30 bg-card p-8 md:p-10">
        {/* Title */}
        <h1 className="font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
          <span className="text-primary text-glow-primary">Welcome to </span>
          <span className="text-secondary text-glow-secondary">HackMind</span>
        </h1>

        <p className="mt-3 text-muted-foreground font-mono text-sm">
          You need a free Gemini API key to use this app.
          <br />
          It takes 30 seconds.
          <span className="blinking-cursor ml-0.5 text-primary">▌</span>
        </p>

        {/* Steps */}
        <div className="mt-8 space-y-6">
          {/* Step 1 */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              <span className="text-primary">01</span> — Get your key
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="gate-btn-primary flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-5 py-3 font-heading font-bold text-primary-foreground transition-all hover:brightness-110"
            >
              Get Free API Key →
            </a>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              <span className="text-primary">02</span> — Paste it here
            </p>
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError("");
              }}
              placeholder="AIza..."
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
            />
            {error && (
              <p className="text-xs text-destructive font-mono">{error}</p>
            )}
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              <span className="text-primary">03</span> — Launch
            </p>
            <button
              onClick={handleSubmit}
              className="gate-btn-launch w-full rounded-lg border border-primary/50 bg-primary/10 px-5 py-3 font-heading font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground"
            >
              Start HackMind
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground font-mono">
          Your key is stored locally and never sent to our servers.
        </p>
      </div>

      <style>{`
        .gate-card {
          box-shadow: 0 0 40px hsl(110 100% 55% / 0.08), 0 0 80px hsl(110 100% 55% / 0.04);
        }
        .blinking-cursor {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ApiKeyGate;
