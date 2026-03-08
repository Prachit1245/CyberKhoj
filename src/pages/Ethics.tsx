import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";

const DO_LIST = [
  "Get explicit written authorization before testing any target",
  "Use bug bounty platforms (HackerOne, Bugcrowd, Intigriti) that provide legal safe harbor",
  "Test only within the defined scope of a program",
  "Report vulnerabilities through proper disclosure channels",
  "Give organizations reasonable time to patch before any public disclosure",
  "Document your findings clearly and professionally",
  "Respect rate limits and avoid causing service disruption",
];

const DONT_LIST = [
  "Access, modify, or delete data that isn't yours",
  "Test systems without explicit permission — \"I was just checking\" isn't a defense",
  "Use findings for extortion, blackmail, or personal gain beyond legitimate bounties",
  "Publicly disclose vulnerabilities before the organization has patched them",
  "Chain exploits to cause maximum damage instead of reporting at first discovery",
  "Attack critical infrastructure, healthcare systems, or emergency services",
  "Share exploits or access with unauthorized third parties",
];

const PLATFORMS = [
  { name: "HackerOne", href: "https://hackerone.com" },
  { name: "Bugcrowd", href: "https://bugcrowd.com" },
  { name: "Intigriti", href: "https://intigriti.com" },
  { name: "OWASP", href: "https://owasp.org" },
];

const Ethics = () => (
  <div className="max-w-2xl mx-auto space-y-8">
    <div className="space-y-2">
      <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground">Ethical Use Guide</h1>
      <p className="text-xs font-mono text-muted-foreground">Security research done right</p>
    </div>

    <p className="text-sm font-mono text-muted-foreground leading-relaxed">
      CyberKhoj is a powerful tool. With that comes responsibility. The difference between a security researcher and an attacker is <span className="text-primary font-bold">permission</span>.
    </p>

    {/* Do */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-primary" />
        <h2 className="text-base font-heading font-bold text-foreground">Do</h2>
      </div>
      <ul className="space-y-2">
        {DO_LIST.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-mono text-muted-foreground">
            <span className="text-primary shrink-0">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>

    {/* Don't */}
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} className="text-destructive" />
        <h2 className="text-base font-heading font-bold text-foreground">Don't</h2>
      </div>
      <ul className="space-y-2">
        {DONT_LIST.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-mono text-muted-foreground">
            <span className="text-destructive shrink-0">✗</span>
            {item}
          </li>
        ))}
      </ul>
    </div>

    {/* Responsible Disclosure */}
    <div className="space-y-2">
      <h2 className="text-base font-heading font-bold text-foreground">Responsible Disclosure</h2>
      <p className="text-sm font-mono text-muted-foreground leading-relaxed">
        When you find a vulnerability, report it directly to the organization or through their bug bounty program. Provide clear reproduction steps, explain the impact, and suggest a fix if possible. Give them at least 90 days to patch before considering any public disclosure.
      </p>
    </div>

    {/* Platforms */}
    <div className="space-y-3">
      <h2 className="text-base font-heading font-bold text-foreground">Trusted Platforms</h2>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-4 py-1.5 text-xs font-mono text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
          >
            {p.name} <ExternalLink size={10} />
          </a>
        ))}
      </div>
    </div>

    <div className="flex gap-4 pt-4 text-xs font-mono">
      <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link>
      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
    </div>
  </div>
);

export default Ethics;
