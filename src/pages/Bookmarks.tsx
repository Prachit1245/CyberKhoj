import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bookmark, Trash2, Download, Upload, X, BookOpen, Code2, Swords, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/Toast";
import {
  getBookmarks,
  removeBookmark,
  clearAllBookmarks,
  getBookmarksByType,
  type Bookmark as BookmarkItem,
  type BookmarkType,
} from "@/lib/bookmarks";

const TYPE_CONFIG: Record<BookmarkType, { label: string; icon: typeof Swords; color: string }> = {
  attack_path: { label: "Attack Paths", icon: Swords, color: "text-destructive" },
  payload: { label: "Payloads", icon: Code2, color: "text-primary" },
  cheatsheet: { label: "Cheat Sheets", icon: BookOpen, color: "text-secondary" },
};

const SEV_STYLES: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

function BookmarkCard({ item, onRemove }: { item: BookmarkItem; onRemove: () => void }) {
  return (
    <div className="rounded-lg border border-border/30 bg-card/50 hover:bg-card/80 hover:border-border/50 transition-all p-4 space-y-2 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-mono font-bold text-foreground leading-snug truncate">{item.title}</h3>
            {item.severity && (
              <Badge variant="outline" className={`text-[9px] shrink-0 ${SEV_STYLES[item.severity.toLowerCase()] || ""}`}>
                {item.severity.toUpperCase()}
              </Badge>
            )}
          </div>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
          <p className="text-[10px] font-mono text-muted-foreground/60">
            from <span className="text-muted-foreground">{item.sourceContext}</span>
          </p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Remove bookmark"
        >
          <X size={14} />
        </button>
      </div>
      {item.code && (
        <pre className="rounded-md border border-border/20 bg-muted/30 p-2 text-[11px] font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap max-h-24">
          {item.code}
        </pre>
      )}
    </div>
  );
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const navigate = useNavigate();

  const refresh = useCallback(() => setBookmarks(getBookmarks()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("hackmind:bookmarks-changed", refresh);
    return () => window.removeEventListener("hackmind:bookmarks-changed", refresh);
  }, [refresh]);

  // Ctrl+B shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        navigate("/bookmarks");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const handleRemove = (id: string) => {
    removeBookmark(id);
    refresh();
    toast.info("Bookmark removed");
  };

  const handleClearAll = () => {
    clearAllBookmarks();
    refresh();
    setConfirmClear(false);
    toast.success("All bookmarks cleared");
  };

  const types: BookmarkType[] = ["attack_path", "payload", "cheatsheet"];

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
            <Bookmark size={20} className="text-primary" />
            Bookmarks
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {bookmarks.length} saved item{bookmarks.length !== 1 ? "s" : ""} · <kbd className="text-[10px] bg-muted px-1 py-0.5 rounded">Ctrl+B</kbd>
          </p>
        </div>
        {bookmarks.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-xs font-mono text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 size={13} /> Clear All
          </button>
        )}
      </div>

      {/* Grouped sections */}
      {bookmarks.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Bookmark size={40} className="mx-auto text-muted-foreground/20" />
          <p className="text-sm font-mono text-muted-foreground/50">No bookmarks yet</p>
          <p className="text-xs font-mono text-muted-foreground/40">
            Bookmark attack paths, payloads, and cheat sheet sections to save them here
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link to="/payloads" className="text-xs font-mono text-primary hover:text-primary/80 transition-colors">
              Payload Library →
            </Link>
            <Link to="/cheatsheets" className="text-xs font-mono text-secondary hover:text-secondary/80 transition-colors">
              Cheat Sheets →
            </Link>
          </div>
        </div>
      ) : (
        types.map((type) => {
          const items = getBookmarksByType(type);
          if (items.length === 0) return null;
          const config = TYPE_CONFIG[type];
          const Icon = config.icon;
          return (
            <div key={type} className="space-y-3">
              <h2 className="text-sm font-mono font-bold text-foreground flex items-center gap-2">
                <Icon size={16} className={config.color} />
                {config.label}
                <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {items.map((item) => (
                  <BookmarkCard key={item.id} item={item} onRemove={() => handleRemove(item.id)} />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Confirm clear dialog */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmClear(false); }}
        >
          <div className="w-full max-w-sm rounded-xl border border-destructive/30 bg-card p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              <h3 className="font-heading font-bold text-foreground">Clear All Bookmarks</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently remove all {bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-heading font-bold text-destructive-foreground hover:brightness-110 transition-all"
              >
                Clear All
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-heading font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
