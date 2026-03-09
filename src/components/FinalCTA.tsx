import { useState } from "react";
import { ArrowRight, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveApiKey } from "@/lib/ai";
import { useNavigate } from "react-router-dom";

const FinalCTA = () => {
  const [apiKey, setApiKey] = useState("");
  const navigate = useNavigate();

  const handleGo = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
    }
    navigate("/analyzer");
  };

  return (
    <section className="relative overflow-hidden py-28 md:py-36 px-4">
      {/* Radial glow bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(110 100% 55% / 0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-heading font-extrabold text-foreground leading-tight">
          Start Finding Bugs Right Now —{" "}
          <span className="text-primary text-glow-primary">Free Forever</span>
        </h2>

        <p className="text-sm md:text-base font-mono text-muted-foreground max-w-lg mx-auto">
          Paste your free Groq API key below, or skip to explore first.
          Zero signup. Zero cost. Full power.
        </p>

        {/* Inline API key input */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
          <div className="relative flex-1">
            <Key
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste Groq API key (optional)"
              aria-label="Groq API key"
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-3.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && handleGo()}
            />
          </div>
          <button
            onClick={handleGo}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-heading text-base font-bold text-primary-foreground transition-all hover:brightness-110 glow-primary whitespace-nowrap"
          >
            Launch Analyzer <ArrowRight size={18} />
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {["No credit card", "No account", "1000 analyses/day", "100% local"].map((t) => (
            <span key={t} className="text-xs font-mono text-muted-foreground">
              <span className="text-primary mr-1">✓</span>{t}
            </span>
          ))}
        </div>

        <a
          href="https://console.groq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs font-mono text-primary/70 hover:text-primary transition-colors underline underline-offset-4"
        >
          Don't have a key? Get one free at console.groq.com →
        </a>
      </div>
    </section>
  );
};

export default FinalCTA;
