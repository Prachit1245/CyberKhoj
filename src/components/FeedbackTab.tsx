import { useState } from "react";
import { MessageSquare, Star, X, Copy, ExternalLink, Bug, Lightbulb, MessageCircle } from "lucide-react";
import { toast } from "@/components/Toast";

type FeedbackType = "bug" | "feature" | "general";

const TYPES: { key: FeedbackType; label: string; icon: typeof Bug }[] = [
  { key: "bug", label: "Bug", icon: Bug },
  { key: "feature", label: "Feature", icon: Lightbulb },
  { key: "general", label: "General", icon: MessageCircle },
];

const GITHUB_ISSUES_URL = "https://github.com/Prachit1245/CyberKhoj/issues";

export default function FeedbackTab() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [type, setType] = useState<FeedbackType>("general");
  const [text, setText] = useState("");

  const handleCopy = () => {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const formatted = [
      "── CyberKhoj Feedback ──",
      `Rating: ${stars} (${rating}/5)`,
      `Type: ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      `Date: ${new Date().toISOString()}`,
      "",
      text || "(No details provided)",
      "",
      "─────────────────────",
    ].join("\n");

    navigator.clipboard.writeText(formatted).then(() => {
      toast.success("Feedback copied to clipboard!");
    });
  };

  const handleReset = () => {
    setRating(0);
    setText("");
    setType("general");
  };

  return (
    <>
      {/* Edge tab button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-[45] flex items-center gap-1.5 rounded-l-lg border border-r-0 border-primary/30 bg-card px-2 py-3 text-[10px] font-mono text-primary hover:bg-primary/10 transition-all cursor-pointer shadow-lg"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <MessageSquare size={12} />
          Feedback
        </button>
      )}

      {/* Slide-in panel */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-[55] w-80 max-w-[90vw] border-l border-border bg-card shadow-2xl animate-slide-in-right flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
              <MessageSquare size={15} className="text-primary" /> Feedback
            </h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Star rating */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      size={24}
                      className={`transition-colors ${
                        n <= (hoverRating || rating) ? "text-primary fill-primary" : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback type */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Type</p>
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                      type === t.key
                        ? "bg-primary/10 text-primary border-primary/40"
                        : "text-muted-foreground border-border hover:text-foreground hover:border-border/60"
                    }`}
                  >
                    <t.icon size={12} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text field */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Details</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tell us what you think..."
                rows={5}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none resize-none"
              />
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={!rating && !text.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-heading font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Copy size={13} /> Copy Feedback
            </button>

            <p className="text-[10px] font-mono text-muted-foreground text-center">
              Copy and share via email or community channels
            </p>

            {/* Divider */}
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Community</p>

              <a
                href={GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full rounded-lg border border-border px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                <Bug size={13} className="text-destructive" />
                Report Bug on GitHub
                <ExternalLink size={10} className="ml-auto" />
              </a>

              <a
                href="https://discord.gg/lovable-dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full rounded-lg border border-border px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[hsl(235,86%,65%)]">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Join Discord
                <ExternalLink size={10} className="ml-auto" />
              </a>
            </div>

            {/* Reset */}
            {(rating > 0 || text.trim()) && (
              <button
                onClick={handleReset}
                className="w-full text-center text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
              >
                Clear form
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
