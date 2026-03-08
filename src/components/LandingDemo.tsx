import { useState, useEffect, useRef } from "react";
import { ArrowRight, Loader2, Shield, AlertTriangle, ChevronRight } from "lucide-react";
import type { Severity } from "@/types";

const DEMO_URL = "https://api.shopexample.com/orders?user_id=847&status=pending";

const SEVERITY_STYLES: Record<Severity, { border: string; badge: string; label: string }> = {
  critical: { border: "border-l-red-500", badge: "bg-red-500/15 text-red-400", label: "CRITICAL" },
  high: { border: "border-l-orange-500", badge: "bg-orange-500/15 text-orange-400", label: "HIGH" },
  medium: { border: "border-l-yellow-500", badge: "bg-yellow-500/15 text-yellow-400", label: "MEDIUM" },
  low: { border: "border-l-blue-500", badge: "bg-blue-500/15 text-blue-400", label: "LOW" },
};

interface DemoPath {
  title: string;
  severity: Severity;
  category: string;
  description: string;
  payload: string;
}

const DEMO_PATHS: DemoPath[] = [
  {
    title: "IDOR via user_id Parameter Manipulation",
    severity: "critical",
    category: "Broken Access Control",
    description: "The user_id=847 parameter is a sequential integer exposed in the URL. An attacker can enumerate other users' orders by incrementing/decrementing the ID value without server-side ownership validation.",
    payload: "GET /orders?user_id=848&status=pending\nGET /orders?user_id=1&status=pending",
  },
  {
    title: "Mass Assignment via Status Parameter",
    severity: "high",
    category: "Business Logic",
    description: "The status parameter is client-controlled. An attacker may inject unauthorized status values such as 'cancelled', 'refunded', or 'shipped' to manipulate order state without proper authorization checks.",
    payload: "GET /orders?user_id=847&status=refunded\nGET /orders?user_id=847&status=shipped&admin=true",
  },
  {
    title: "SQL Injection in Order Query Filters",
    severity: "critical",
    category: "Injection",
    description: "Both user_id and status parameters may be directly interpolated into database queries. Testing for SQL injection could reveal the entire order database or allow data exfiltration.",
    payload: "GET /orders?user_id=847' OR '1'='1&status=pending\nGET /orders?user_id=847&status=pending' UNION SELECT null,username,password FROM users--",
  },
  {
    title: "Broken Object Level Authorization (BOLA)",
    severity: "high",
    category: "API Security",
    description: "The API likely relies on the user_id parameter rather than the authenticated session token to determine data access. Replacing user_id with another user's ID while using your own valid session token would confirm BOLA.",
    payload: "curl -H 'Authorization: Bearer YOUR_TOKEN' \\\n  'https://api.shopexample.com/orders?user_id=1'",
  },
  {
    title: "Rate Limiting Bypass on Order Enumeration",
    severity: "medium",
    category: "Resource Exhaustion",
    description: "Without rate limiting, an attacker can rapidly enumerate all user orders by scripting sequential user_id requests, extracting PII, order amounts, and shipping addresses at scale.",
    payload: "for i in $(seq 1 10000); do\n  curl -s \"https://api.shopexample.com/orders?user_id=$i\" &\ndone",
  },
  {
    title: "Information Disclosure via Verbose Error Messages",
    severity: "medium",
    category: "Information Disclosure",
    description: "Sending malformed parameters (negative IDs, special characters, extremely long values) may trigger verbose error messages revealing database schema, table names, or internal stack traces.",
    payload: "GET /orders?user_id=-1&status=pending\nGET /orders?user_id=AAAA&status=../../../../etc/passwd",
  },
  {
    title: "Missing Authentication on API Endpoint",
    severity: "high",
    category: "Authentication",
    description: "The endpoint may be accessible without any authentication token. Test by sending the request without cookies or Authorization headers — if data is returned, the endpoint is completely unprotected.",
    payload: "curl -v 'https://api.shopexample.com/orders?user_id=847' \\\n  --no-cookies -H 'Authorization: '",
  },
  {
    title: "Cross-Site Request Forgery on State-Changing Actions",
    severity: "low",
    category: "CSRF",
    description: "If the API uses cookie-based auth without CSRF tokens and the status parameter triggers state changes, an attacker could craft a malicious page that forces authenticated users to modify their order status.",
    payload: "<img src=\"https://api.shopexample.com/orders?user_id=847&status=cancelled\" />",
  },
];

/* ── Typewriter text for a single card ── */
const TypewriterText = ({ text, speed = 12, onDone }: { text: string; speed?: number; onDone?: () => void }) => {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const iv = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(iv);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed, onDone]);

  return <>{displayed}<span className="animate-pulse">▌</span></>;
};

/* ── Demo Card (simplified, no interactivity) ── */
const DemoCard = ({ path, animate }: { path: DemoPath; animate: boolean }) => {
  const sev = SEVERITY_STYLES[path.severity];
  const [textDone, setTextDone] = useState(!animate);

  return (
    <div
      className={`rounded-xl border border-border bg-card border-l-4 ${sev.border} overflow-hidden transition-all duration-500 ${
        animate ? "animate-fade-in" : ""
      }`}
    >
      <div className="p-4 md:p-5 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${sev.badge}`}>
            {sev.label}
          </span>
          <span className="inline-block rounded bg-secondary/15 px-2 py-0.5 text-[10px] font-mono text-secondary uppercase tracking-wider">
            {path.category}
          </span>
        </div>
        <h4 className="font-heading text-sm md:text-base font-bold text-foreground leading-snug">
          {path.title}
        </h4>
        <p className="text-xs md:text-sm font-mono text-muted-foreground leading-relaxed">
          {animate && !textDone ? (
            <TypewriterText text={path.description} speed={8} onDone={() => setTextDone(true)} />
          ) : (
            path.description
          )}
        </p>
        {/* Payload preview */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-primary/70">
          <ChevronRight size={14} />
          Payload Example
        </div>
      </div>
    </div>
  );
};

/* ── Main Demo Section ── */
const LandingDemo = () => {
  const [phase, setPhase] = useState<"idle" | "loading" | "results">("idle");
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const start = () => {
    setPhase("loading");
    setVisibleCount(0);
    setTimeout(() => {
      setPhase("results");
    }, 2200);
  };

  // Reveal cards one by one
  useEffect(() => {
    if (phase !== "results") return;
    if (visibleCount >= DEMO_PATHS.length) return;
    const delay = visibleCount === 0 ? 200 : 600;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), delay);
    return () => clearTimeout(t);
  }, [phase, visibleCount]);

  // Auto-scroll to latest card
  useEffect(() => {
    if (phase === "results" && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [visibleCount, phase]);

  return (
    <section className="relative py-20 md:py-28 px-4 bg-background" id="demo">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Section header */}
        <div className="text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-mono text-primary">
            <Shield size={14} /> Interactive Demo
          </span>
          <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">
            See It In Action
          </h2>
          <p className="text-sm md:text-base text-muted-foreground font-mono max-w-lg mx-auto">
            No API key needed. Watch CyberKhoj analyze a real-world e-commerce API endpoint and uncover 8 attack vectors.
          </p>
        </div>

        {/* Fake analyzer UI */}
        <div className="rounded-2xl border border-border bg-card/80 overflow-hidden">
          {/* Input area */}
          <div className="p-4 md:p-6 border-b border-border/50 space-y-4">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Target URL
            </label>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 font-mono text-sm text-foreground break-all">
              {DEMO_URL}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <span className="px-3 py-2 text-xs font-mono bg-primary text-primary-foreground">Standard</span>
                <span className="px-3 py-2 text-xs font-mono text-muted-foreground">Deep</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">URL Analysis</span>
            </div>

            {phase === "idle" && (
              <button
                onClick={start}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-6 py-3.5 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary min-h-[2.75rem]"
              >
                See It In Action <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Results area */}
          {phase !== "idle" && (
            <div
              ref={containerRef}
              className="p-4 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto"
            >
              {phase === "loading" && (
                <div className="flex flex-col items-center gap-4 py-12">
                  <Loader2 size={28} className="animate-spin text-primary" />
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-mono text-muted-foreground">
                      Analyzing attack surface…
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      {["Parsing URL parameters", "Checking auth patterns", "Mapping attack vectors"].map((s, i) => (
                        <span
                          key={s}
                          className="text-[10px] font-mono text-primary/60 animate-pulse"
                          style={{ animationDelay: `${i * 0.4}s` }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {phase === "results" && (
                <>
                  {/* Summary bar */}
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <span className="rounded bg-red-500/15 text-red-400 px-2 py-1">2 Critical</span>
                    <span className="rounded bg-orange-500/15 text-orange-400 px-2 py-1">3 High</span>
                    <span className="rounded bg-yellow-500/15 text-yellow-400 px-2 py-1">2 Medium</span>
                    <span className="rounded bg-blue-500/15 text-blue-400 px-2 py-1">1 Low</span>
                  </div>

                  {DEMO_PATHS.slice(0, visibleCount).map((path, i) => (
                    <DemoCard key={path.title} path={path} animate={i === visibleCount - 1} />
                  ))}

                  {visibleCount < DEMO_PATHS.length && (
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-2">
                      <Loader2 size={14} className="animate-spin text-primary" />
                      Discovering more attack vectors…
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        {phase === "results" && visibleCount >= DEMO_PATHS.length && (
          <div className="text-center space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 justify-center text-sm font-mono text-primary">
              <AlertTriangle size={16} />
              8 attack vectors found in seconds
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-4 font-heading text-base font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
            >
              Get your free Groq API key and analyze real targets <ArrowRight size={18} />
            </a>
            <p className="text-xs text-muted-foreground font-mono">
              Free forever · No signup required · 1000 analyses per day
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LandingDemo;
