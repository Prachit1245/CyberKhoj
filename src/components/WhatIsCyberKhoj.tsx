import { useScrollReveal } from "@/hooks/useScrollReveal";

const WhatIsCyberKhoj = () => {
  const { ref, visible } = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <section ref={ref} className="relative py-20 md:py-28 px-4 bg-background">
      <div
        className={`max-w-3xl mx-auto space-y-6 transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h2 className="text-2xl md:text-4xl font-heading font-extrabold text-foreground text-center">
          What Is <span className="text-primary text-glow-primary">CyberKhoj</span>?
        </h2>

        <div className="space-y-5 text-sm md:text-base font-mono text-muted-foreground leading-relaxed">
          <p>
            CyberKhoj is a free AI powered bug bounty tool designed for security researchers and ethical hackers. Paste any URL or domain and instantly receive AI generated vulnerability attack paths covering IDOR, SQL Injection, XSS, SSRF, Authentication Bypass, Business Logic flaws, and dozens of other vulnerability classes.
          </p>
          <p>
            Built specifically for bug bounty hunters on platforms like HackerOne and Bugcrowd, CyberKhoj helps beginners think like experienced security researchers. Generate 100 hacker test ideas for any domain, visualize your attack surface with interactive mind maps, and access a library of 200+ ready to use payloads.
          </p>
          <p>
            CyberKhoj is 100% free forever. No account needed. No subscription. Your data never leaves your browser.
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhatIsCyberKhoj;
