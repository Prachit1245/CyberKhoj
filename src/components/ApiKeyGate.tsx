import { useState, useEffect, type ReactNode } from "react";
import { Play, X, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { hasApiKey, saveApiKey, validateApiKey, validateKeyFormat, onKeyExpired } from "@/lib/ai";
import { toast } from "@/components/Toast";
import EthicalDisclaimer from "@/components/EthicalDisclaimer";
import HackMindLogo from "@/components/HackMindLogo";

type ValidationState = "idle" | "checking" | "valid" | "format_error" | "api_error";

const ApiKeyGate = ({ children }: { children: ReactNode }) => {
  const [unlocked, setUnlocked] = useState(hasApiKey());
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [successAnim, setSuccessAnim] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setUnlocked(hasApiKey());
  }, []);

  // Listen for 401 key expiry from any API call
  useEffect(() => {
    return onKeyExpired(() => {
      setUnlocked(false);
      setError("Your API key has expired or been revoked. Please add a new key.");
      setValidationState("api_error");
      toast.error("API key expired — please enter a new key");
    });
  }, []);

  const handleKeyChange = (value: string) => {
    setKey(value);
    setError("");
    setValidationState("idle");
  };

  const handleSubmit = async () => {
    const trimmed = key.trim();

    // Step 1: Client-side format validation
    const formatCheck = validateKeyFormat(trimmed);
    if (!formatCheck.valid) {
      setError(formatCheck.error || "Invalid key format.");
      setValidationState("format_error");
      return;
    }

    // Step 2: Server-side validation via /models endpoint
    setValidationState("checking");
    setError("");

    try {
      const result = await validateApiKey(trimmed);

      if (!result.ok) {
        setError(result.error || "Validation failed.");
        setValidationState("api_error");
        return;
      }

      setValidationState("valid");
      saveApiKey(trimmed);
      setSuccessAnim(true);
      setTimeout(() => setUnlocked(true), 600);
    } catch {
      // Network errors — accept key if format is valid
      const formatOk = validateKeyFormat(trimmed);
      if (formatOk.valid) {
        setValidationState("valid");
        saveApiKey(trimmed);
        setSuccessAnim(true);
        setTimeout(() => setUnlocked(true), 600);
      } else {
        setError("Could not validate key. Check your Groq API key and try again.");
        setValidationState("api_error");
      }
    }
  };

  if (unlocked) return <>{children}</>;

  const statusIndicator = () => {
    switch (validationState) {
      case "checking":
        return (
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mt-1">
            <Loader2 size={12} className="animate-spin" /> Checking…
          </div>
        );
      case "valid":
        return (
          <div className="flex items-center gap-2 text-xs font-mono text-green-400 mt-1">
            <CheckCircle size={12} /> Valid Groq key — ready to use
          </div>
        );
      case "format_error":
        return (
          <div className="flex items-center gap-2 text-xs font-mono text-destructive mt-1">
            <XCircle size={12} /> {error}
          </div>
        );
      case "api_error":
        return (
          <div className="flex items-center gap-2 text-xs font-mono text-destructive mt-1">
            <XCircle size={12} /> {error}
          </div>
        );
      default:
        return null;
    }
  };

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
              <Play size={14} /> How to Get Your Key
            </button>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              <span className="text-primary">02</span> — Paste it here
            </p>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => handleKeyChange(e.target.value)}
                onContextMenu={(e) => e.preventDefault()}
                placeholder="gsk_..."
                className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {statusIndicator()}
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              <span className="text-primary">03</span> — Launch
            </p>
            <button
              onClick={handleSubmit}
              disabled={validationState === "checking"}
              className="w-full rounded-lg border border-primary/50 bg-primary/10 px-5 py-3 font-heading font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {validationState === "checking" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Validating…
                </>
              ) : (
                "Start CyberKhoj"
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-center">
          <p className="text-xs text-primary font-mono leading-relaxed">
            🔒 Your API key never leaves your device.<br />
            Zero servers. Zero tracking. Zero data collection. Ever.
          </p>
        </div>

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
