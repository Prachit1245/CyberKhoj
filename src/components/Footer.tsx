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
          <span className="font-mono text-lg font-extrabold text-primary text-glow-primary logo-cursor">
            CyberKhoj
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
        <div className="flex justify-center gap-4 text-xs font-mono">
          <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms</Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link>
          <Link to="/ethics" className="text-muted-foreground hover:text-primary transition-colors">Ethics</Link>
        </div>
        <p className="text-xs font-mono text-muted-foreground">
          CyberKhoj is free forever. No tracking. No ads. No BS.
        </p>
        <p className="text-[10px] font-mono text-muted-foreground/60">
          © {new Date().getFullYear()} CyberKhoj. For authorized security testing only.
        </p>
        <p className="text-[10px] font-mono text-muted-foreground/50 flex items-center justify-center gap-1.5 flex-wrap">
          Built with love using{" "}
          <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors underline underline-offset-2">
            Lovable
          </a>
          — the AI app builder
          <span className="mx-1">|</span>
          <a
            href="https://github.com/Prachit1245/cyberkhoj"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground/50 hover:text-primary/70 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Open Source on GitHub
          </a>
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
