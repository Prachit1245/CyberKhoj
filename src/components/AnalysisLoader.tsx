import { useState, useEffect, useRef } from "react";
import type { AnalysisDepth } from "@/types";

const SCAN_MESSAGES = [
  "Parsing target structure...",
  "Identifying injection points...",
  "Checking authentication patterns...",
  "Mapping attack surface...",
  "Cross-referencing vulnerability database...",
  "Generating attack paths...",
  "Calculating severity scores...",
  "Finalizing report...",
];

const DEPTH_ESTIMATES: Record<AnalysisDepth, string> = {
  quick: "~10s",
  standard: "~20s",
  deep: "~45s",
};

const AnalysisLoader = ({ depth }: { depth: AnalysisDepth }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [currentChar, setCurrentChar] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageIdx >= SCAN_MESSAGES.length) {
      // Loop back
      const timeout = setTimeout(() => {
        setLines([]);
        setMessageIdx(0);
        setCurrentChar(0);
      }, 2000);
      return () => clearTimeout(timeout);
    }

    const msg = SCAN_MESSAGES[messageIdx];

    if (currentChar < msg.length) {
      const speed = 25 + Math.random() * 30;
      const timeout = setTimeout(() => setCurrentChar((c) => c + 1), speed);
      return () => clearTimeout(timeout);
    }

    // Line complete — pause then move to next
    const pause = 400 + Math.random() * 600;
    const timeout = setTimeout(() => {
      setLines((prev) => [...prev, msg]);
      setMessageIdx((i) => i + 1);
      setCurrentChar(0);
    }, pause);
    return () => clearTimeout(timeout);
  }, [messageIdx, currentChar]);

  // Auto-scroll
  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, currentChar]);

  const typingLine = messageIdx < SCAN_MESSAGES.length ? SCAN_MESSAGES[messageIdx].slice(0, currentChar) : "";

  return (
    <div className="rounded-xl border border-primary/20 overflow-hidden" style={{ background: "#000" }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-primary/10" style={{ background: "#0a0a0a" }}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-mono text-primary/70">SCANNING</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          EST {DEPTH_ESTIMATES[depth]}
        </span>
      </div>

      {/* Terminal body */}
      <div ref={containerRef} className="p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
        {/* Completed lines */}
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2 text-xs font-mono leading-6">
            <span className="text-primary/40 select-none">[✓]</span>
            <span className="text-primary/70">{line}</span>
          </div>
        ))}

        {/* Currently typing line */}
        {messageIdx < SCAN_MESSAGES.length && (
          <div className="flex gap-2 text-xs font-mono leading-6">
            <span className="text-primary/40 select-none">[~]</span>
            <span className="text-primary">
              {typingLine}
              <span className="inline-block w-[6px] h-[14px] bg-primary ml-px animate-pulse align-middle" />
            </span>
          </div>
        )}

        {/* Waiting dots after all messages typed */}
        {messageIdx >= SCAN_MESSAGES.length && (
          <div className="flex gap-2 text-xs font-mono leading-6 mt-1">
            <span className="text-primary/40 select-none">[…]</span>
            <span className="text-primary/50">Waiting for AI response<span className="loading-dots" /></span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full" style={{ background: "#111" }}>
        <div
          className="h-full bg-primary/60 transition-all duration-500"
          style={{ width: `${Math.min(((messageIdx + (currentChar / (SCAN_MESSAGES[messageIdx]?.length || 1))) / SCAN_MESSAGES.length) * 100, 100)}%` }}
        />
      </div>

      <style>{`
        .loading-dots::after {
          content: '';
          animation: dots 1.5s steps(4, end) infinite;
        }
        @keyframes dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
      `}</style>
    </div>
  );
};

export default AnalysisLoader;
