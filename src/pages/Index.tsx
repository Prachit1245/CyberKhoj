import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import MatrixRain from "@/components/MatrixRain";
import ParticleField from "@/components/ParticleField";
import Typewriter from "@/components/Typewriter";
import EthicalDisclaimer from "@/components/EthicalDisclaimer";

const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const Features = lazy(() => import("@/components/Features"));
const FreeBanner = lazy(() => import("@/components/FreeBanner"));
const LandingDemo = lazy(() => import("@/components/LandingDemo"));
const SocialProof = lazy(() => import("@/components/SocialProof"));
const AnimatedCounter = lazy(() => import("@/components/AnimatedCounter"));
const ComparisonTable = lazy(() => import("@/components/ComparisonTable"));
const FinalCTA = lazy(() => import("@/components/FinalCTA"));
const Footer = lazy(() => import("@/components/Footer"));
const WhatIsCyberKhoj = lazy(() => import("@/components/WhatIsCyberKhoj"));
const LandingFAQ = lazy(() => import("@/components/LandingFAQ"));

const TRUST_BADGES = [
  "100% Free Forever",
  "No Account Needed",
  "1000 Analyses/Day",
  "Your Data Never Leaves Your Browser",
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="scroll-smooth">
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
        <MatrixRain />
        <ParticleField />

        <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
          <div className="min-h-[4rem] md:min-h-[5rem] flex items-center justify-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-tight">
              CyberKhoj — Free AI Bug Bounty Tool
            </h1>
          </div>

          <div className="min-h-[2rem] flex items-center justify-center">
            <Typewriter />
          </div>

          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto font-mono">
            AI-powered vulnerability analysis, attack surface mapping, and recon — all running locally in your browser. Think like a hacker. Find bugs faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/analyzer")}
              className="rounded-lg bg-primary px-8 py-3.5 font-heading text-base font-bold text-primary-foreground transition-all hover:brightness-110 glow-primary"
            >
              Start Hacking Free
            </button>
            <button
              onClick={() => {
                const demoSection = document.getElementById("demo");
                if (demoSection) {
                  demoSection.scrollIntoView({ behavior: "smooth" });
                  // Auto-start the interactive demo after scrolling
                  setTimeout(() => {
                    const startBtn = demoSection.querySelector("button");
                    if (startBtn) startBtn.click();
                  }, 800);
                }
              }}
              className="rounded-lg border border-secondary px-8 py-3.5 font-heading text-base font-bold text-secondary transition-all hover:bg-secondary hover:text-secondary-foreground glow-secondary"
            >
              Watch Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="text-xs font-mono text-muted-foreground">
                <span className="text-primary mr-1" aria-hidden="true">✓</span>
                {badge}
              </span>
            ))}
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 backdrop-blur-sm">
            <span className="text-xs font-mono text-primary leading-relaxed text-center">
              🔒 Your API key never leaves your device. Zero servers. Zero tracking. Zero data collection. Ever.
            </span>
          </div>
        </div>

        <a
          href="https://lovable.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-6 right-6 z-10 opacity-60 hover:opacity-100 transition-opacity"
          title="Built with Lovable"
        >
          <img
            src="https://img.shields.io/badge/Built%20with-Lovable-ff6b6b?style=flat-square&logo=heart"
            alt="Built with Lovable"
            className="h-5"
          />
        </a>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-8">
        <EthicalDisclaimer />
      </section>

      <Suspense fallback={<div className="min-h-screen" />}>
      <WhatIsCyberKhoj />
      <LandingDemo />
      <AnimatedCounter />
      <SocialProof />
      <HowItWorks />
      <Features />
      <ComparisonTable />
      <FreeBanner />
      <LandingFAQ />
      <FinalCTA />
      <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
