import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  WifiOff,
  KeyRound,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  Terminal,
} from "lucide-react";
import type { GeminiErrorCode } from "@/lib/gemini";

interface GeminiErrorDisplayProps {
  code: GeminiErrorCode;
  message: string;
  onRetry?: () => void;
}

/* ─── Rate Limit Terminal Animation ─── */
const RateLimitTerminal = () => {
  const lines = [
    "$ hackmind --analyze",
    "> Connecting to Gemini API...",
    "> ERROR 429: Too Many Requests",
    "> Daily quota exhausted.",
    "> Limit: 1000 analyses / day",
    "> Resets at: 00:00 UTC",
    "> _",
  ];

  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines < lines.length) {
      const timer = setTimeout(
        () => setVisibleLines((v) => v + 1),
        visibleLines === 0 ? 200 : 400
      );
      return () => clearTimeout(timer);
    }
  }, [visibleLines, lines.length]);

  return (
    <div className="rounded-lg bg-black/60 border border-border/50 p-4 font-mono text-xs space-y-1 max-w-sm">
      {lines.slice(0, visibleLines).map((line, i) => (
        <div
          key={i}
          className={`${
            line.includes("ERROR")
              ? "text-red-400"
              : line.includes(">")
                ? "text-muted-foreground"
                : "text-primary"
          } ${i === visibleLines - 1 ? "animate-pulse" : ""}`}
        >
          {line}
        </div>
      ))}
    </div>
  );
};

/* ─── Config per error type ─── */
const ERROR_CONFIG: Record<
  GeminiErrorCode,
  {
    icon: typeof WifiOff;
    iconColor: string;
    title: string;
    showRetry: boolean;
    showSettings: boolean;
    showTerminal: boolean;
  }
> = {
  NO_KEY: {
    icon: KeyRound,
    iconColor: "text-yellow-400",
    title: "No API Key",
    showRetry: false,
    showSettings: true,
    showTerminal: false,
  },
  NETWORK_ERROR: {
    icon: WifiOff,
    iconColor: "text-red-400",
    title: "Connection Failed",
    showRetry: true,
    showSettings: false,
    showTerminal: false,
  },
  INVALID_KEY: {
    icon: KeyRound,
    iconColor: "text-red-400",
    title: "Invalid API Key",
    showRetry: false,
    showSettings: true,
    showTerminal: false,
  },
  RATE_LIMIT: {
    icon: Clock,
    iconColor: "text-yellow-400",
    title: "Rate Limit Hit",
    showRetry: true,
    showSettings: false,
    showTerminal: true,
  },
  DAILY_LIMIT: {
    icon: Clock,
    iconColor: "text-orange-400",
    title: "Daily Limit Reached",
    showRetry: false,
    showSettings: false,
    showTerminal: true,
  },
  FORBIDDEN: {
    icon: AlertCircle,
    iconColor: "text-red-400",
    title: "Access Denied",
    showRetry: false,
    showSettings: true,
    showTerminal: false,
  },
  PARSE_ERROR: {
    icon: Terminal,
    iconColor: "text-cyan-400",
    title: "Unexpected Response",
    showRetry: true,
    showSettings: false,
    showTerminal: false,
  },
  API_ERROR: {
    icon: AlertCircle,
    iconColor: "text-red-400",
    title: "API Error",
    showRetry: true,
    showSettings: false,
    showTerminal: false,
  },
};

const GeminiErrorDisplay = ({ code, message, onRetry }: GeminiErrorDisplayProps) => {
  const navigate = useNavigate();
  const config = ERROR_CONFIG[code] || ERROR_CONFIG.API_ERROR;
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-4 max-w-lg animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
          <Icon size={20} />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading font-bold text-foreground text-sm">
            {config.title}
          </h3>
          <p className="text-sm text-muted-foreground font-mono leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      {/* Terminal animation for rate limits */}
      {config.showTerminal && <RateLimitTerminal />}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {config.showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-2 text-xs font-mono text-primary hover:bg-primary/10 transition-all"
          >
            <RefreshCw size={13} />
            Try Again
          </button>
        )}
        {config.showSettings && (
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Settings size={13} />
            Open Settings
          </button>
        )}
      </div>
    </div>
  );
};

export default GeminiErrorDisplay;
