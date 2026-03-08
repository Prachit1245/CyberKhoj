import { useEffect, useRef, useState } from "react";
import { Key, Globe, Zap } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Key,
    title: "Get Free Key",
    desc: "Grab a Gemini API key from Google AI Studio. It's free and takes 30 seconds.",
  },
  {
    num: "02",
    icon: Globe,
    title: "Paste Your Target",
    desc: "Paste any URL, domain, or raw HTTP request you want to analyze.",
  },
  {
    num: "03",
    icon: Zap,
    title: "Think Like A Hacker",
    desc: "Get instant AI-powered attack paths, vulnerability insights, and recon data.",
  },
];

const HowItWorks = () => {
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
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative py-24 px-4 bg-background">
      <div className="container max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-center mb-4">
          <span className="text-primary text-glow-primary">How</span>{" "}
          <span className="text-foreground">It Works</span>
        </h2>
        <p className="text-center text-muted-foreground font-mono text-sm mb-16 max-w-md mx-auto">
          Three steps. Zero friction. Full power.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 items-start">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex items-start">
              {/* Card */}
              <div
                className={`hiw-card flex-1 rounded-xl border border-border bg-card p-6 transition-all duration-700 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Green top border accent */}
                <div className="h-0.5 w-12 bg-primary rounded-full mb-5" />

                <span className="font-mono text-3xl font-bold text-primary/20 select-none">
                  {step.num}
                </span>

                <div className="mt-3 mb-3 inline-flex items-center justify-center rounded-lg bg-primary/10 p-2.5">
                  <step.icon size={22} className="text-primary" />
                </div>

                <h3 className="font-heading text-lg font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Arrow connector (desktop only, not after last) */}
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden md:flex items-center justify-center w-10 shrink-0 self-center transition-all duration-700 ${
                    visible ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ transitionDelay: `${i * 150 + 300}ms` }}
                >
                  <svg
                    width="32"
                    height="16"
                    viewBox="0 0 32 16"
                    fill="none"
                    className="text-primary/40"
                  >
                    <path
                      d="M0 8h28m0 0l-6-6m6 6l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
