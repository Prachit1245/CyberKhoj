import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MindMapNodeData } from "./types";

const MindMapNode = memo(({ data, id }: NodeProps) => {
  const d = data as MindMapNodeData;
  const [hovered, setHovered] = useState(false);

  const isTested = d.tested;
  const isHighlighted = d.searchMatch;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: isTested ? 0.55 : 1,
        outline: isHighlighted ? "2px solid hsl(45 93% 47%)" : "none",
        outlineOffset: 2,
        borderRadius: 6,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div className="flex items-center gap-1.5">
        {isTested && (
          <span className="text-primary shrink-0" style={{ fontSize: 12, lineHeight: 1 }}>✓</span>
        )}
        <span>{d.label}</span>
        {d.note && (
          <span className="shrink-0" style={{ fontSize: 10, lineHeight: 1 }}>📝</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />

      {/* Tooltip */}
      {hovered && d.description && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 rounded-lg border border-border/30 bg-card/95 backdrop-blur-md p-3 shadow-xl pointer-events-none">
          <p className="text-[11px] font-mono text-foreground mb-1.5 font-semibold">{d.label}</p>
          {d.description && (
            <p className="text-[10px] font-mono text-muted-foreground mb-2">{d.description}</p>
          )}
          {d.note && (
            <p className="text-[10px] font-mono text-primary/70 mb-2 italic">📝 {d.note}</p>
          )}
          {d.attackIdeas && d.attackIdeas.length > 0 && (
            <>
              <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Top Attack Ideas</p>
              <ul className="space-y-0.5">
                {d.attackIdeas.slice(0, 3).map((idea, i) => (
                  <li key={i} className="text-[10px] font-mono text-primary/80 flex items-start gap-1">
                    <span className="text-primary shrink-0">›</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
});

MindMapNode.displayName = "MindMapNode";
export default MindMapNode;
