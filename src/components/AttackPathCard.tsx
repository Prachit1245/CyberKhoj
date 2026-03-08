import { useState, memo } from "react";
import { Bookmark, BookmarkCheck, CheckSquare, Square, StickyNote, Copy, Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarks";
import { toast } from "@/components/Toast";
import type { AttackPath, Severity } from "@/types";

const SEVERITY_STYLES: Record<Severity, { border: string; badge: string; label: string }> = {
  critical: { border: "border-l-red-500", badge: "bg-red-500/15 text-red-400", label: "CRITICAL" },
  high: { border: "border-l-orange-500", badge: "bg-orange-500/15 text-orange-400", label: "HIGH" },
  medium: { border: "border-l-yellow-500", badge: "bg-yellow-500/15 text-yellow-400", label: "MEDIUM" },
  low: { border: "border-l-blue-500", badge: "bg-blue-500/15 text-blue-400", label: "LOW" },
};

interface Props {
  path: AttackPath;
  onChange?: (updated: AttackPath) => void;
}

const AttackPathCard = ({ path, onChange }: Props) => {
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const sev = SEVERITY_STYLES[path.severity] || SEVERITY_STYLES.medium;

  const update = (partial: Partial<AttackPath>) => {
    onChange?.({ ...path, ...partial });
  };

  const copyPayload = async () => {
    await navigator.clipboard.writeText(path.payloadExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`rounded-xl border border-border bg-card border-l-4 ${sev.border} overflow-hidden transition-all`}>
      <div className="p-5 space-y-3">
        {/* Top row: badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${sev.badge}`}>
            {sev.label}
          </span>
          <span className="inline-block rounded bg-secondary/15 px-2 py-0.5 text-[10px] font-mono text-secondary uppercase tracking-wider">
            {path.category}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-heading text-base font-bold text-foreground leading-snug">
          {path.title}
        </h4>

        {/* Description */}
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          {path.description}
        </p>

        {/* Payload Example */}
        {path.payloadExample && (
          <div>
            <button
              onClick={() => setPayloadOpen(!payloadOpen)}
              className="flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors"
            >
              {payloadOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Payload Example
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                payloadOpen ? "max-h-[400px] opacity-100 mt-2" : "max-h-0 opacity-0"
              }`}
            >
              <div className="relative rounded-lg bg-muted/40 border border-border/50 p-3">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap pr-16 overflow-x-auto">
                  {path.payloadExample}
                </pre>
                <button
                  onClick={copyPayload}
                  className="absolute top-2 right-2 flex items-center gap-1 rounded bg-muted px-2 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <><Check size={12} className="text-primary" /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Steps to Test */}
        {path.steps.length > 0 && (
          <div>
            <button
              onClick={() => setStepsOpen(!stepsOpen)}
              className="flex items-center gap-1.5 text-xs font-mono text-primary hover:text-primary/80 transition-colors"
            >
              {stepsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Steps to Test ({path.steps.length})
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                stepsOpen ? "max-h-[600px] opacity-100 mt-2" : "max-h-0 opacity-0"
              }`}
            >
              <ol className="space-y-1.5 pl-1">
                {path.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs font-mono text-muted-foreground">
                    <span className="text-primary/60 shrink-0 w-5 text-right">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* References */}
        {path.references.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {path.references.map((ref, i) => (
              <a
                key={i}
                href={ref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-secondary transition-colors"
              >
                <ExternalLink size={10} /> {new URL(ref).hostname}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-border/50 px-5 py-2.5 flex items-center gap-4">
        <button
          onClick={() => {
            const { added } = toggleBookmark({
              type: "attack_path",
              title: path.title,
              description: path.description,
              sourceContext: `Attack Path — ${path.category}`,
              severity: path.severity,
            });
            update({ isBookmarked: added });
            toast[added ? "success" : "info"](added ? "Bookmarked ✓" : "Bookmark removed");
          }}
          className={`flex items-center gap-1 text-xs font-mono transition-colors ${
            path.isBookmarked || isBookmarked("attack_path", path.title) ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {path.isBookmarked || isBookmarked("attack_path", path.title) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {path.isBookmarked || isBookmarked("attack_path", path.title) ? "Saved" : "Save"}
        </button>

        <button
          onClick={() => update({ isTested: !path.isTested })}
          className={`flex items-center gap-1 text-xs font-mono transition-colors ${
            path.isTested ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {path.isTested ? <CheckSquare size={14} /> : <Square size={14} />}
          {path.isTested ? "Tested" : "Mark Tested"}
        </button>

        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className={`flex items-center gap-1 text-xs font-mono transition-colors ${
            notesOpen || path.userNotes ? "text-secondary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <StickyNote size={14} />
          Notes
        </button>
      </div>

      {/* Notes textarea */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          notesOpen ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-5 pb-4">
          <textarea
            value={path.userNotes}
            onChange={(e) => update({ userNotes: e.target.value })}
            placeholder="Add your testing notes..."
            rows={3}
            className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default AttackPathCard;
