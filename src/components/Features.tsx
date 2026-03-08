import { useEffect, useRef, useState } from "react";
import { Link2, Swords, Network, Code2, BookOpen, Clock } from "lucide-react";

const FEATURES = [
  {
    icon: Link2,
    title: "URL Analyzer",
    desc: "Paste any URL and get instant attack paths, parameter analysis, and vulnerability insights.",
  },
  {
    icon: Swords,
    title: "Attack Mode",
    desc: "Generate 100+ test ideas for any domain — from XSS to IDOR, business logic to race conditions.",
  },
  {
    icon: Network,
    title: "Visual Mind Map",
    desc: "See your full attack surface as an interactive mind map. Spot what others miss.",
  },
  {
    icon: Code2,
    title: "Payload Library",
    desc: "Ready-to-use payloads for XSS, SQLi, SSRF, and more. Copy, tweak, and fire.",
  },
  {
    icon: BookOpen,
    title: "Cheat Sheets",
    desc: "Quick reference guides for OWASP Top 10, HTTP methods, status codes, and common bypasses.",
  },
  {
    icon: Clock,
    title: "History",
    desc: "All your past analyses saved locally in your browser. Pick up right where you left off.",
  },
];

const Features = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="relative py-24 px-4 bg-background">
      <div ref={ref} className="container max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-center mb-4">
          <span className="text-foreground">Everything A Bug Bounty Hunter </span>
          <span className="text-primary text-glow-primary">Needs</span>
        </h2>
        <p className="text-center text-muted-foreground font-mono text-sm mb-16 max-w-lg mx-auto">
          All features. Completely free. No limits. No catch.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`group rounded-xl border border-border bg-card p-6 transition-all duration-700 hover:border-primary/40 hover:shadow-[0_0_30px_hsl(110_100%_55%/0.08)] ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5 mb-4 transition-colors group-hover:bg-primary/20">
                <f.icon size={22} className="text-primary" />
              </div>
              <h3 className="font-heading text-base font-bold text-foreground mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
