import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Terminal, Key, Menu, X, Github } from "lucide-react";
import { hasApiKey, getApiKey, saveApiKey, removeApiKey } from "@/lib/gemini";

const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/analyzer", label: "Analyzer" },
  { to: "/attack", label: "Attack Mode" },
  { to: "/mindmap", label: "Mind Map" },
  { to: "/history", label: "History" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [keySet, setKeySet] = useState(hasApiKey());
  const [newKey, setNewKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [validating, setValidating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSaveKey = async () => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed.length < 10) {
      setKeyError("Please enter a valid API key.");
      return;
    }
    setValidating(true);
    setKeyError("");
    try {
      const res = await fetch(`${MODEL_URL}?key=${trimmed}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
      });
      if (!res.ok) {
        setKeyError("Invalid key — check aistudio.google.com");
        setValidating(false);
        return;
      }
      saveApiKey(trimmed);
      setKeySet(true);
      setNewKey("");
      setModalOpen(false);
    } catch {
      setKeyError("Validation failed — try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveKey = () => {
    removeApiKey();
    setKeySet(false);
    setNewKey("");
  };

  const maskedKey = () => {
    const k = getApiKey();
    if (!k) return "";
    return k.slice(0, 6) + "•".repeat(8) + k.slice(-4);
  };

  const linkClass = (isActive: boolean) =>
    `text-sm font-mono transition-colors ${isActive ? "text-primary text-glow-primary" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg shadow-primary/5"
            : "bg-transparent"
        }`}
      >
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <Terminal size={20} className="text-primary" />
            <span className="font-heading text-lg font-bold text-primary text-glow-primary">
              HackMind
            </span>
            <span className="blinking-cursor text-primary text-sm">▌</span>
          </NavLink>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => linkClass(isActive)}
              >
                {link.label}
              </NavLink>
            ))}

            {/* API Key button */}
            <button
              onClick={() => setModalOpen(true)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-mono transition-all ${
                keySet
                  ? "border-primary/40 text-primary hover:bg-primary/10"
                  : "border-destructive/40 text-destructive hover:bg-destructive/10"
              }`}
            >
              <Key size={13} />
              {keySet ? "API Key ✓" : "No Key"}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl animate-fade-in">
            <div className="container py-4 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `block py-2 px-3 rounded-md ${linkClass(isActive)} ${isActive ? "bg-primary/5" : ""}`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setModalOpen(true);
                }}
                className={`flex items-center gap-1.5 py-2 px-3 rounded-md text-xs font-mono ${
                  keySet ? "text-primary" : "text-destructive"
                }`}
              >
                <Key size={13} />
                {keySet ? "API Key ✓" : "Set API Key"}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Key management modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="gate-card w-full max-w-md rounded-xl border border-primary/30 bg-card p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold text-foreground">
                <Key size={16} className="inline mr-2 text-primary" />
                API Key
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {keySet ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground font-mono mb-1">Current key</p>
                  <p className="text-sm font-mono text-foreground">{maskedKey()}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleRemoveKey();
                    }}
                    className="flex-1 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm font-heading font-bold text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                  >
                    Remove Key
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-heading font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => {
                    setNewKey(e.target.value);
                    setKeyError("");
                  }}
                  placeholder="Paste your Gemini API key..."
                  className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
                />
                {keyError && (
                  <p className="text-xs text-destructive font-mono">{keyError}</p>
                )}
                <button
                  onClick={handleSaveKey}
                  disabled={validating}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-heading font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {validating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Validating…
                    </>
                  ) : (
                    "Save Key"
                  )}
                </button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground font-mono">
              Stored only in your browser. We never see it.
            </p>
          </div>
        </div>
      )}

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
    </>
  );
};

export default Navbar;
