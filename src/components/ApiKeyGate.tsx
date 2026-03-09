import { useState, useEffect, type ReactNode } from "react";
import { Play, X, Eye, EyeOff } from "lucide-react";
import { hasApiKey, saveApiKey, validateApiKey } from "@/lib/ai";
import { toast } from "@/components/Toast";
import EthicalDisclaimer from "@/components/EthicalDisclaimer";
import HackMindLogo from "@/components/HackMindLogo";

const ApiKeyGate = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(hasApiKey());
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showKey, setShowKey] = useState(false);

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
      const result = await validateApiKey(trimmed);

      if (!result.ok) {
        setError(result.error || "Validation failed.");
        return;
      }

      saveApiKey(trimmed);
      setSuccessAnim(true);
      setTimeout(() => setUnlocked(true), 600);
    } catch (err) {
      console.error("API key validation error:", err);
      // Network errors — accept key if it looks plausible (gsk_ prefix for Groq)
      if (trimmed.startsWith("gsk_")) {
        saveApiKey(trimmed);
        setSuccessAnim(true);
        setTimeout(() => setUnlocked(true), 600);
      } else {
        setError("Could not validate key. Check your Groq API key and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-background px-4 transition-opacity duration-500 ${successAnim ? "opacity-0 scale-105" : "opacity-100"}`}>
      <div className="gate-card w-full max-w-lg rounded-xl border border-primary/30 bg-card p-8 md:p-10">
        <div className="mb-6">
          <HackMindLogo size="lg" showText={true} showTagline={true} />
        </div>

        <p className="text-muted-foreground font-mono text-sm">
          You need a free Groq API key to use this app.
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
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-5 py-3 font-heading font-bold text-primary-foreground transition-all hover:brightness-110"
            >
              Get Free API Key →
            </a>
            <button
              onClick={() => setShowDemo(true)}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-primary/30 bg-primary/5 px-5 py-2.5 font-mono text-sm text-primary transition-all hover:bg-primary/10"
            >
              <Play size={14} /> Watch Demo
            </button>
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
              placeholder="gsk_..."
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
                "Start CyberKhoj"
              )}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground font-mono">
          Your key is stored only in your browser. We never see it.
        </p>

        <div className="mt-4">
          <EthicalDisclaimer compact />
        </div>
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

      {/* Demo Video Modal */}
      {showDemo && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDemo(false); }}
        >
          <div className="w-full max-w-2xl rounded-xl border border-primary/30 bg-card p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-foreground text-sm">
                <Play size={14} className="inline mr-1.5 text-primary" />
                How to Get Your Free API Key
              </h3>
              <button onClick={() => setShowDemo(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <video
              src="/demo-get-key.mkv"
              controls
              autoPlay
              className="w-full rounded-lg border border-border"
              style={{ maxHeight: "70vh" }}
            >
              Your browser does not support this video format.
            </video>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiKeyGate;
