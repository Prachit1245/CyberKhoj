import { useState, useEffect } from "react";
import { X, Sparkles, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  hasNewVersion,
  getLatestChanges,
  setSeenVersion,
  APP_VERSION,
  type ChangeType,
} from "@/lib/changelog";

const TYPE_STYLES: Record<ChangeType, { label: string; color: string }> = {
  new: { label: "[NEW]", color: "text-[hsl(110,100%,55%)]" },
  improve: { label: "[IMPROVE]", color: "text-[hsl(48,96%,53%)]" },
  fix: { label: "[FIX]", color: "text-[hsl(0,72%,51%)]" },
};

export default function WhatsNewModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check on mount if there's a new version
    if (hasNewVersion()) {
      const timer = setTimeout(() => setOpen(true), 800); // slight delay for UX
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setSeenVersion(APP_VERSION);
    setOpen(false);
  };

  const handleViewFull = () => {
    handleClose();
    navigate("/changelog");
  };

  if (!open) return null;

  const latest = getLatestChanges();
  if (!latest) return null;

  // Show top 8 changes for brevity
  const previewChanges = latest.changes.slice(0, 8);
  const moreCount = latest.changes.length - previewChanges.length;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-primary/30 bg-card p-6 space-y-4 animate-scale-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-primary" />
            <h2 className="font-heading text-lg font-bold text-foreground">What's New</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Version badge */}
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-mono font-bold">
            v{latest.version}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {new Date(latest.date).toLocaleDateString()}
          </span>
        </div>

        {/* Changes list */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {previewChanges.map((change, i) => {
            const style = TYPE_STYLES[change.type];
            return (
              <div key={i} className="flex gap-2 text-xs font-mono">
                <span className={`${style.color} shrink-0`}>{style.label}</span>
                <span className="text-foreground">{change.text}</span>
              </div>
            );
          })}
          {moreCount > 0 && (
            <p className="text-xs font-mono text-muted-foreground italic pl-4">
              ...and {moreCount} more changes
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleViewFull}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all cursor-pointer"
          >
            <ExternalLink size={12} /> View Full Changelog
          </button>
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-xs font-heading font-bold text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
