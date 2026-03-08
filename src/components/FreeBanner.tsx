const FreeBanner = () => {
  return (
    <section className="relative overflow-hidden border-t border-b border-primary/30" style={{ background: "#0a1a0a" }}>
      {/* Pulsing glow overlay */}
      <div className="absolute inset-0 animate-pulse-glow pointer-events-none" style={{ background: "radial-gradient(ellipse at center, hsl(110 100% 55% / 0.06) 0%, transparent 70%)" }} />

      <div className="relative z-10 container max-w-3xl mx-auto py-20 px-4 text-center space-y-5">
        <h2 className="font-heading text-3xl md:text-5xl font-extrabold text-primary text-glow-primary">
          100% Free. Forever.
        </h2>
        <p className="text-sm md:text-base font-mono text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          No subscription. No credit card. No hidden costs. Your free Groq API key gives you 1000 analyses every single day. We make zero money from you — CyberKhoj is a gift to the bug bounty community.
        </p>
      </div>
    </section>
  );
};

export default FreeBanner;
