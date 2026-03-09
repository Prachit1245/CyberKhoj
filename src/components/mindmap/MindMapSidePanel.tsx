import { useEffect } from "react";
import { X, Copy, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/Toast";
import type { MindMapNodeData } from "./types";

const SEV_COLORS: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-orange-600 text-white",
  medium: "bg-yellow-600 text-black",
  low: "bg-blue-600 text-white",
};

interface Props {
  nodeId: string;
  data: MindMapNodeData;
  onClose: () => void;
  onAnalyze: (label: string) => void;
  checkedIdeas: Record<string, boolean>;
  onToggleIdea: (key: string) => void;
}

export default function MindMapSidePanel({ nodeId, data, onClose, onAnalyze, checkedIdeas, onToggleIdea }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const copyIdeas = () => {
    const text = data.attackIdeas.join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Attack ideas copied");
  };

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-[360px] border-l border-border/20 bg-card/95 backdrop-blur-md z-50 flex flex-col font-mono overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{data.label}</h3>
          {data.severity && (
            <Badge className={`text-[10px] shrink-0 ${SEV_COLORS[data.severity] || ""}`}>
              {data.severity.toUpperCase()}
            </Badge>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Description */}
        {data.description && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Description</p>
            <p className="text-xs text-foreground/80">{data.description}</p>
          </div>
        )}

        {/* Node info */}
        <div className="flex gap-4 text-[10px] text-muted-foreground">
          <span>Type: <span className="text-foreground">{data.nodeType}</span></span>
          {data.tested && <span className="text-primary">✓ Tested</span>}
        </div>

        {data.note && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Note</p>
            <p className="text-xs text-foreground/70 bg-muted/30 p-2 rounded">{data.note}</p>
          </div>
        )}

        {/* Attack Ideas Checklist */}
        {data.attackIdeas.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Attack Ideas ({data.attackIdeas.length})
            </p>
            <ul className="space-y-2">
              {data.attackIdeas.map((idea, i) => {
                const key = `${nodeId}-${i}`;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <Checkbox
                      checked={!!checkedIdeas[key]}
                      onCheckedChange={() => onToggleIdea(key)}
                      className="mt-0.5 shrink-0"
                    />
                    <span className={`text-xs ${checkedIdeas[key] ? "line-through text-muted-foreground" : "text-foreground/80"}`}>
                      {idea}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/20 flex gap-2">
        <Button variant="outline" size="sm" onClick={copyIdeas} className="flex-1 text-xs font-mono cursor-pointer">
          <Copy className="h-3 w-3 mr-1" /> Copy Ideas
        </Button>
        <Button size="sm" onClick={() => onAnalyze(data.label)} className="flex-1 text-xs font-mono cursor-pointer">
          <Zap className="h-3 w-3 mr-1" /> Analyze This
        </Button>
      </div>
    </div>
  );
}
