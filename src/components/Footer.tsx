import { Link } from "react-router-dom";

const TOOLS = [
  { label: "URL Analyzer", to: "/analyzer" },
  { label: "Attack Mode", to: "/attack" },
  { label: "Mind Map", to: "/mindmap" },
  { label: "Payload Library", to: "/payloads" },
  { label: "Cheat Sheets", to: "/cheatsheets" },
];

const RESOURCES = [
  { label: "OWASP Top 10", to: "/owasp" },
  { label: "HackerOne", href: "https://hackerone.com" },
  { label: "Bugcrowd", href: "https://bugcrowd.com" },
  { label: "PortSwigger Academy", href: "https://portswigger.net/web-security" },
];

const Footer = () => (
  <footer className="border-t border-primary/20" style={{ background: "#050505" }}>
    <div className="max-w-5xl mx-auto px-4 py-14 md:py-16">
      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
        {/* Brand */}
        <div className="space-y-3">
          <span className="font-heading text-lg font-extrabold text-primary text-glow-primary logo-cursor">
            HackMind
          </span>
          <p className="text-sm font-heading font-bold text-foreground">Think Like A Hacker</p>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            Made for the bug bounty community. AI-powered recon and vulnerability analysis — free, private, and local.
          </p>
        </div>

        {/* Tools */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Tools</h3>
          <nav className="flex flex-col gap-2">
            {TOOLS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="text-sm font-mono text-foreground/70 hover:text-primary transition-colors w-fit"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Resources */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Resources</h3>
          <nav className="flex flex-col gap-2">
            {RESOURCES.map((r) =>
              "to" in r ? (
                <Link
                  key={r.label}
                  to={r.to!}
                  className="text-sm font-mono text-foreground/70 hover:text-primary transition-colors w-fit"
                >
                  {r.label}
                </Link>
              ) : (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono text-foreground/70 hover:text-primary transition-colors w-fit"
                >
                  {r.label} ↗
                </a>
              )
            )}
          </nav>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-12 pt-6 border-t border-border/30 space-y-3 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          HackMind is free forever. No tracking. No ads. No BS.
        </p>
        <p className="text-[10px] font-mono text-muted-foreground/60">
          © {new Date().getFullYear()} HackMind. For authorized security testing only.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
