import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const TOUR_KEY = "hackmind_tour_completed";

interface TourStep {
  target: string; // CSS selector or data-tour attribute
  title: string;
  description: string;
  route?: string; // Navigate to this route if needed
  position?: "top" | "bottom" | "left" | "right";
}

const STEPS: TourStep[] = [
  {
    target: "[data-tour='analyzer-input']",
    title: "Paste any URL here",
    description: "Enter a target URL, endpoint, or domain to analyze for potential attack vectors.",
    route: "/analyzer",
    position: "bottom",
  },
  {
    target: "[data-tour='depth-selector']",
    title: "Choose how thorough",
    description: "Quick scans are fast, Deep scans explore every edge case and hidden parameter.",
    route: "/analyzer",
    position: "bottom",
  },
  {
    target: "[data-tour='nav-attack']",
    title: "Generate 100+ attack ideas",
    description: "Attack Mode creates a comprehensive mind dump of potential vulnerabilities for any domain.",
    position: "right",
  },
  {
    target: "[data-tour='nav-payloads']",
    title: "Ready-to-use payloads",
    description: "Copy XSS, SQLi, SSRF, and more payloads instantly. One click to clipboard.",
    position: "right",
  },
  {
    target: "[data-tour='usage-counter']",
    title: "Track your daily usage",
    description: "Monitor your API usage. The counter resets daily at midnight.",
    position: "top",
  },
];

export function isTourCompleted(): boolean {
  return localStorage.getItem(TOUR_KEY) === "true";
}

export function resetTour(): void {
  localStorage.removeItem(TOUR_KEY);
  window.dispatchEvent(new CustomEvent("hackmind:restart-tour"));
}

function completeTour(): void {
  localStorage.setItem(TOUR_KEY, "true");
}

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Start tour if not completed
  useEffect(() => {
    const checkStart = () => {
      if (!isTourCompleted()) {
        setTimeout(() => {
          setActive(true);
          setStep(0);
        }, 500);
      }
    };
    checkStart();

    const handleRestart = () => {
      setActive(true);
      setStep(0);
    };
    window.addEventListener("hackmind:restart-tour", handleRestart);
    return () => window.removeEventListener("hackmind:restart-tour", handleRestart);
  }, []);

  // Navigate to step route if needed
  useEffect(() => {
    if (!active) return;
    const currentStep = STEPS[step];
    if (currentStep?.route && location.pathname !== currentStep.route) {
      navigate(currentStep.route);
    }
  }, [active, step, location.pathname, navigate]);

  // Find and measure target element
  const measureTarget = useCallback(() => {
    if (!active) return;
    const currentStep = STEPS[step];
    if (!currentStep) return;

    // Wait a tick for navigation to complete
    setTimeout(() => {
      const el = document.querySelector(currentStep.target);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    }, 100);
  }, [active, step]);

  useEffect(() => {
    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  // Re-measure after route change
  useEffect(() => {
    measureTarget();
  }, [location.pathname, measureTarget]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
    setActive(false);
  };

  const handleComplete = () => {
    completeTour();
    setActive(false);
  };

  if (!active) return null;

  const currentStep = STEPS[step];
  const pos = currentStep?.position || "bottom";

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (pos) {
      case "bottom":
        return {
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case "top":
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: Math.max(padding, Math.min(targetRect.left + targetRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
        };
      case "right":
        return {
          top: Math.max(padding, targetRect.top + targetRect.height / 2 - tooltipHeight / 2),
          left: targetRect.right + padding,
        };
      case "left":
        return {
          top: Math.max(padding, targetRect.top + targetRect.height / 2 - tooltipHeight / 2),
          left: targetRect.left - tooltipWidth - padding,
        };
      default:
        return {};
    }
  };

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Dark overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.85)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-primary shadow-[0_0_30px_hsl(var(--primary)/0.5)] pointer-events-none transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-80 rounded-xl border border-primary/40 bg-card p-5 shadow-2xl pointer-events-auto animate-scale-in"
        style={getTooltipStyle()}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? "bg-primary scale-125" : i < step ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <h3 className="font-heading text-lg font-bold text-foreground mb-1.5">
          {currentStep.title}
        </h3>
        <p className="text-sm font-mono text-muted-foreground leading-relaxed mb-5">
          {currentStep.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X size={12} />
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:brightness-110 transition-all"
            >
              {step === STEPS.length - 1 ? "Finish" : "Next"}
              {step < STEPS.length - 1 && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
