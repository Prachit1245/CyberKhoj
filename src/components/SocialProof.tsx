import { Users, Globe, BarChart3 } from "lucide-react";

const STATS = [
  { icon: BarChart3, value: "10,000+", label: "Analyses Run" },
  { icon: Users, value: "500+", label: "Bug Bounty Hunters" },
  { icon: Globe, value: "50+", label: "Countries" },
];

const TESTIMONIALS = [
  {
    name: "Marcus Chen",
    handle: "@h4x0r_supreme",
    avatar: "https://source.boringavatars.com/beam/40/marcus_chen?colors=39ff14,0af0ff,0a0a0a,1a1a1a,2a2a2a",
    quote: "CyberKhoj found an IDOR chain on a target I'd been staring at for weeks. Cashed a $3,200 bounty the same day.",
  },
  {
    name: "Priya Sharma",
    handle: "@bug_priya",
    avatar: "https://source.boringavatars.com/beam/40/priya_sharma?colors=39ff14,0af0ff,0a0a0a,1a1a1a,2a2a2a",
    quote: "The attack path cards are insane. I use the payload examples as starting points for every recon session now.",
  },
  {
    name: "Jake Morrison",
    handle: "@jm_security",
    avatar: "https://source.boringavatars.com/beam/40/jake_morrison?colors=39ff14,0af0ff,0a0a0a,1a1a1a,2a2a2a",
    quote: "Went from 2 valid reports a month to 8. The depth of analysis on GraphQL endpoints is unmatched.",
  },
  {
    name: "Amira Osei",
    handle: "@amira_pwns",
    avatar: "https://source.boringavatars.com/beam/40/amira_osei?colors=39ff14,0af0ff,0a0a0a,1a1a1a,2a2a2a",
    quote: "Finally a tool that thinks like a hacker. The OWASP mapping helped me write better reports that get triaged faster.",
  },
];

const PLATFORMS = ["HackerOne", "Bugcrowd", "OWASP", "Synack", "Intigriti"];

const SocialProof = () => (
  <section className="relative py-20 md:py-28 px-4 bg-background">
    <div className="max-w-4xl mx-auto space-y-14">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">
          Built For The Bug Bounty Community
        </h2>
        <p className="text-sm md:text-base text-muted-foreground font-mono max-w-lg mx-auto">
          Trusted by hunters on every major platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 md:gap-8">
        {STATS.map((s) => (
          <div key={s.label} className="text-center space-y-2">
            <s.icon size={24} className="mx-auto text-primary" />
            <p className="text-2xl md:text-4xl font-heading font-extrabold text-foreground">{s.value}</p>
            <p className="text-xs md:text-sm font-mono text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Testimonials 2×2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.handle}
            className="rounded-xl border border-border bg-card p-5 space-y-3 transition-shadow duration-300 hover:shadow-[0_0_20px_hsl(110_100%_55%/0.08)]"
          >
            {/* Green quote mark */}
            <span className="text-3xl font-heading font-extrabold text-primary leading-none select-none">"</span>
            <p className="text-sm font-mono text-foreground leading-relaxed -mt-1">
              {t.quote}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <img
                src={t.avatar}
                alt={t.name}
                width={36}
                height={36}
                className="rounded-full bg-muted"
              />
              <div>
                <p className="text-sm font-heading font-bold text-foreground">{t.name}</p>
                <p className="text-xs font-mono text-primary">{t.handle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform badges */}
      <div className="flex flex-wrap justify-center gap-3">
        {PLATFORMS.map((p) => (
          <span
            key={p}
            className="rounded-full border border-border bg-muted/30 px-4 py-1.5 text-xs font-mono text-muted-foreground"
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  </section>
);

export default SocialProof;
