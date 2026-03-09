import { useNavigate } from "react-router-dom";
import MatrixRain from "@/components/MatrixRain";
import ParticleField from "@/components/ParticleField";
import Typewriter from "@/components/Typewriter";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import FreeBanner from "@/components/FreeBanner";
import LandingDemo from "@/components/LandingDemo";
import SocialProof from "@/components/SocialProof";
import AnimatedCounter from "@/components/AnimatedCounter";
import ComparisonTable from "@/components/ComparisonTable";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import EthicalDisclaimer from "@/components/EthicalDisclaimer";

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
              <Typewriter />
            </h1>
          </div>

          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto font-mono">
            AI-powered vulnerability analysis, attack surface mapping, and recon — all running locally in your browser.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/analyzer")}
              className="rounded-lg bg-primary px-8 py-3.5 font-heading text-base font-bold text-primary-foreground transition-all hover:brightness-110 glow-primary"
            >
              Start Hacking Free
            </button>
            <button
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-lg border border-secondary px-8 py-3.5 font-heading text-base font-bold text-secondary transition-all hover:bg-secondary hover:text-secondary-foreground glow-secondary"
            >
              Watch Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="text-xs font-mono text-muted-foreground">
                <span className="text-primary mr-1">✓</span>
                {badge}
              </span>
            ))}
          </div>

          {/* Security badge */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2.5 backdrop-blur-sm">
            <span className="text-xs font-mono text-primary leading-relaxed text-center">
              🔒 Your API key never leaves your device. Zero servers. Zero tracking. Zero data collection. Ever.
            </span>
          </div>
        </div>

        {/* Built with Lovable badge — bottom right of hero */}
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

      <LandingDemo />
      <AnimatedCounter />
      <SocialProof />
      <HowItWorks />
      <Features />
      <ComparisonTable />
      <FreeBanner />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
