import { useState, useEffect, type ReactNode } from "react";
import { hasApiKey, saveApiKey } from "@/lib/gemini";
import { toast } from "@/components/Toast";

const VALIDATE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const ApiKeyGate = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(hasApiKey());
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);

  useEffect(() => {
    setUnlocked(hasApiKey());
  }, []);

  const handleSubmit = async () => {
    const trimmed = key.trim();
    if (!trimmed || trimmed.length < 10) {
      setError("Please enter a valid API key.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${VALIDATE_URL}?key=${trimmed}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("API key validation failed:", res.status, body);

        if (res.status === 429) {
          // Key is valid but quota is exhausted; let user proceed so app can show quota errors contextually.
          saveApiKey(trimmed);
          setSuccessAnim(true);
          toast.warning("API key saved, but your Gemini quota is currently exhausted (429).");
          setTimeout(() => setUnlocked(true), 600);
          return;
        }

        if (res.status === 400) {
          setError("Request failed while validating key. Please try again.");
        } else if (res.status === 403) {
          setError("API key is restricted or Gemini API is not enabled for this project.");
        } else {
          setError(`Validation failed (${res.status}). Please verify your key and try again.`);
        }
        return;
      }

      saveApiKey(trimmed);
      setSuccessAnim(true);
      setTimeout(() => setUnlocked(true), 600);
    } catch (err) {
      console.error("API key validation error:", err);
      // Network errors in preview — accept key if it looks valid (starts with AIza)
      if (trimmed.startsWith("AIza")) {
        saveApiKey(trimmed);
        setSuccessAnim(true);
        setTimeout(() => setUnlocked(true), 600);
      } else {
        setError("Could not validate key. Make sure it starts with 'AIza' and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-background px-4 transition-opacity duration-500 ${successAnim ? "opacity-0 scale-105" : "opacity-100"}`}>
      <div className="gate-card w-full max-w-lg rounded-xl border border-primary/30 bg-card p-8 md:p-10">
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
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-5 py-3 font-heading font-bold text-primary-foreground transition-all hover:brightness-110"
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
              <p className="text-xs text-destructive font-mono mt-1">{error}</p>
            )}
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              <span className="text-primary">03</span> — Launch
            </p>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-lg border border-primary/50 bg-primary/10 px-5 py-3 font-heading font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Validating…
                </>
              ) : (
                "Start HackMind"
              )}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground font-mono">
          Your key is stored only in your browser. We never see it.
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
