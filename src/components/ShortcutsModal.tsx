import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutEntry {
  keys: string;
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: "Ctrl + K", description: "Open Quick Scan modal" },
      { keys: "Ctrl + Space", description: "Open Command Palette" },
      { keys: "?", description: "Show keyboard shortcuts" },
      { keys: "Esc", description: "Close any open modal" },
    ],
  },
  {
    title: "Analyzer (/analyzer)",
    shortcuts: [
      { keys: "Ctrl + Enter", description: "Run analysis" },
      { keys: "Ctrl + L", description: "Clear input" },
    ],
  },
  {
    title: "Attack Mode (/attack)",
    shortcuts: [
      { keys: "Ctrl + Enter", description: "Generate attack ideas" },
    ],
  },
  {
    title: "Mind Map (/mindmap)",
    shortcuts: [
      { keys: "F", description: "Fit to screen" },
      { keys: "+", description: "Zoom in" },
      { keys: "−", description: "Zoom out" },
    ],
  },
];

const KeyBadge = ({ children }: { children: string }) => (
  <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted/50 text-[11px] font-mono text-foreground shadow-sm">
    {children}
  </kbd>
);

const renderKeys = (keys: string) => {
  const parts = keys.split(" + ");
  return (
    <span className="flex items-center gap-1">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-muted-foreground text-[10px]">+</span>}
          <KeyBadge>{part}</KeyBadge>
        </span>
      ))}
    </span>
  );
};

const ShortcutsModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-primary/30 bg-card p-6 space-y-5 animate-scale-in max-h-[80vh] overflow-y-auto"
        style={{ boxShadow: "0 0 40px hsl(110 100% 55% / 0.08), 0 0 80px hsl(110 100% 55% / 0.04)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Keyboard size={18} className="text-primary" />
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-primary">
                {group.title}
              </h3>
              <div className="space-y-0">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.keys}
                    className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground font-mono">
                      {sc.description}
                    </span>
                    {renderKeys(sc.keys)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-muted-foreground font-mono pt-2 border-t border-border/30">
          Press <KeyBadge>?</KeyBadge> to toggle this panel
        </p>
      </div>
    </div>
  );
};

export default ShortcutsModal;
