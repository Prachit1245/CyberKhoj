import { useNavigate } from "react-router-dom";
import MatrixRain from "@/components/MatrixRain";
import Typewriter from "@/components/Typewriter";

const TRUST_BADGES = [
  "100% Free Forever",
  "No Account Needed",
  "1000 Analyses/Day",
  "Your Data Never Leaves Your Browser",
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      <MatrixRain />

      <div className="relative z-10 text-center max-w-3xl mx-auto space-y-8">
        {/* Typewriter headline */}
        <div className="min-h-[4rem] md:min-h-[5rem] flex items-center justify-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-tight">
            <Typewriter />
          </h1>
        </div>

        <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto font-mono">
          AI-powered vulnerability analysis, attack surface mapping, and recon — all running locally in your browser.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/analyzer")}
            className="rounded-lg bg-primary px-8 py-3.5 font-heading text-base font-bold text-primary-foreground transition-all hover:brightness-110 glow-primary"
          >
            Start Hacking Free
          </button>
          <button
            onClick={() => navigate("/demo")}
            className="rounded-lg border border-secondary px-8 py-3.5 font-heading text-base font-bold text-secondary transition-all hover:bg-secondary hover:text-secondary-foreground glow-secondary"
          >
            Watch Demo
          </button>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4">
          {TRUST_BADGES.map((badge) => (
            <span
              key={badge}
              className="text-xs font-mono text-muted-foreground"
            >
              <span className="text-primary mr-1">✓</span>
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Index;
