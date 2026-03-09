import { useState, useEffect, useCallback, useRef } from "react";
import { StickyNote, X, Maximize2, Minimize2 } from "lucide-react";
import { getNote, saveNote } from "@/lib/targetNotes";
import { INPUT_LIMITS, enforceLimit } from "@/lib/sanitize";

interface Props {
  domain: string;
}

export default function TargetNotesPanel({ domain }: Props) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(() => getNote(domain));
  const [hasContent, setHasContent] = useState(() => !!getNote(domain).trim());
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Reload when domain changes
  useEffect(() => {
    const note = getNote(domain);
    setContent(note);
    setHasContent(!!note.trim());
  }, [domain]);

  const handleChange = useCallback((value: string) => {
    setContent(value);
    setHasContent(!!value.trim());
    // Auto-save after 500ms of inactivity
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNote(domain, value);
    }, 500);
  }, [domain]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // Save current state
    };
  }, []);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
          open
            ? "bg-primary/15 text-primary border-primary/30"
            : "bg-card/80 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/50"
        }`}
        title="Target Notes"
      >
        <StickyNote className="h-3.5 w-3.5" />
        Notes
        {hasContent && !open && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={`rounded-xl border border-border/30 bg-card/95 backdrop-blur-md overflow-hidden animate-fade-in transition-all ${
            expanded ? "fixed inset-4 z-[60]" : "mt-3"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
            <div className="flex items-center gap-2">
              <StickyNote className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-mono font-bold text-foreground">
                Notes — {domain}
              </span>
              {hasContent && (
                <span className="text-[9px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                  auto-saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={expanded ? "Minimize" : "Expand"}
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Editor */}
          <textarea
            value={content}
            onChange={(e) => handleChange(enforceLimit(e.target.value, INPUT_LIMITS.NOTES))}
            maxLength={INPUT_LIMITS.NOTES}
            placeholder={`Write notes about ${domain}...\n\n• What you've tested\n• What you found\n• Next steps\n• Random observations\n\nSupports markdown formatting.`}
            className={`w-full bg-transparent px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none ${
              expanded ? "h-[calc(100%-3rem)]" : "h-48"
            }`}
          />
        </div>
      )}
    </>
  );
}
