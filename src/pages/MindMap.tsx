import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import { ZoomIn, ZoomOut, Maximize, Download, Network, TreePine, Zap } from "lucide-react";
import { callGemini } from "@/lib/gemini";
import { buildMindMapPrompt, parseMindMapNodes, type MindMapNode } from "@/lib/prompts";
import { toast } from "sonner";

/* ── Severity colors ── */
const SEV_BORDER: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
};

const CYAN = "#00f5ff";
const GREEN = "#00ff88";

/* ── Legend ── */
const LEGEND = [
  { label: "Root (Target)", color: CYAN },
  { label: "Category", color: GREEN },
  { label: "Critical", color: SEV_BORDER.critical },
  { label: "High", color: SEV_BORDER.high },
  { label: "Medium", color: SEV_BORDER.medium },
  { label: "Low", color: SEV_BORDER.low },
];

/* ── Dagre auto-layout ── */
function layoutWithDagre(
  nodes: Node[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR"
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 180, edgesep: 30 });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: n.measured?.width ?? 180, height: n.measured?.height ?? 50 });
  });
  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  Dagre.layout(g);

  const laid = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - (n.measured?.width ?? 180) / 2, y: pos.y - (n.measured?.height ?? 50) / 2 },
    };
  });

  return { nodes: laid, edges };
}

/* ── Convert MindMapNode[] → ReactFlow nodes/edges ── */
function buildFlowElements(mapNodes: MindMapNode[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const mn of mapNodes) {
    let style: React.CSSProperties = {};

    if (mn.type === "root") {
      style = {
        background: CYAN,
        color: "#000",
        border: "none",
        borderRadius: "50%",
        fontWeight: 800,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "14px",
        padding: "20px 24px",
        boxShadow: `0 0 30px ${CYAN}60, 0 0 60px ${CYAN}30`,
      };
    } else if (mn.type === "category") {
      style = {
        background: "#0d0d0d",
        color: "#fff",
        border: `2px solid ${GREEN}`,
        borderRadius: "10px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "12px",
        fontWeight: 600,
        padding: "10px 16px",
      };
    } else {
      const borderColor = SEV_BORDER[mn.severity || "low"] || SEV_BORDER.low;
      style = {
        background: "#0a0a0a",
        color: borderColor,
        border: `1.5px solid ${borderColor}`,
        borderRadius: "6px",
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: "10px",
        padding: "6px 10px",
        maxWidth: "200px",
      };
    }

    nodes.push({
      id: mn.id,
      position: { x: 0, y: 0 }, // dagre will position
      data: { label: mn.label },
      style,
    });

    if (mn.parentId) {
      const parentNode = mapNodes.find((n) => n.id === mn.parentId);
      const edgeColor = mn.type === "category" ? GREEN : SEV_BORDER[mn.severity || "low"] || "#444";

      edges.push({
        id: `e-${mn.parentId}-${mn.id}`,
        source: mn.parentId,
        target: mn.id,
        style: { stroke: edgeColor + "80", strokeDasharray: "6 3" },
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor + "80",
          width: 16,
          height: 12,
        },
      });
    }
  }

  return layoutWithDagre(nodes, edges, "LR");
}

/* ── Canvas component ── */
function MindMapCanvas() {
  const [domain, setDomain] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<"LR" | "TB">("LR");
  const [hasData, setHasData] = useState(false);
  const rawNodesRef = useRef<MindMapNode[]>([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const applyLayout = useCallback(
    (data: MindMapNode[], dir: "LR" | "TB") => {
      const { nodes: n, edges: e } = buildFlowElements(data);
      // Re-layout with direction
      const laid = layoutWithDagre(n, e, dir);
      setNodes(laid.nodes);
      setEdges(laid.edges);
      // Smooth zoom-to-fit
      setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 150);
    },
    [setNodes, setEdges, fitView]
  );

  const generate = async () => {
    if (!domain.trim()) {
      toast.error("Enter a target domain");
      return;
    }
    setLoading(true);
    try {
      const raw = await callGemini(buildMindMapPrompt(domain));
      const parsed = parseMindMapNodes(raw);
      rawNodesRef.current = parsed;
      setHasData(true);
      applyLayout(parsed, direction);
      toast.success(`Mind map generated — ${parsed.length} nodes ✓`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate mind map");
    } finally {
      setLoading(false);
    }
  };

  const toggleDirection = () => {
    const next = direction === "LR" ? "TB" : "LR";
    setDirection(next);
    if (rawNodesRef.current.length) applyLayout(rawNodesRef.current, next);
  };

  const exportImage = () => {
    toast.info("Use your browser's screenshot tool or Ctrl+P to export");
  };

  const btn =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border/30 bg-card/80 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors cursor-pointer backdrop-blur-sm";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Control Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
          placeholder="example.com"
          className="h-9 w-56 rounded-lg bg-card/50 border border-border/30 px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="h-9 px-4 rounded-lg font-mono font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          <Zap className="h-3.5 w-3.5" />
          {loading ? "Generating..." : "Generate Mind Map"}
        </button>

        <div className="flex-1" />

        <button onClick={() => zoomIn()} className={btn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => zoomOut()} className={btn}>
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => fitView({ padding: 0.15, duration: 600 })} className={btn}>
          <Maximize className="h-3.5 w-3.5" />
        </button>
        <button onClick={toggleDirection} className={btn}>
          {direction === "LR" ? <TreePine className="h-3.5 w-3.5" /> : <Network className="h-3.5 w-3.5" />}
          {direction === "LR" ? "Vertical" : "Horizontal"}
        </button>
        <button onClick={exportImage} className={btn}>
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: "#0a0a0a" }}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff08" />

          {/* Legend */}
          <Panel position="top-right">
            <div className="rounded-lg border border-border/20 bg-black/90 backdrop-blur-sm p-3 space-y-1.5">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Legend</p>
              {LEGEND.map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="text-[10px] font-mono text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Empty state */}
          {!hasData && !loading && (
            <Panel position="top-center">
              <div className="mt-[30vh] text-center space-y-4">
                <Network className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                <p className="text-sm font-mono text-muted-foreground/50">
                  Enter a domain above to generate your attack surface map
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

const MindMap = () => (
  <ReactFlowProvider>
    <MindMapCanvas />
  </ReactFlowProvider>
);

export default MindMap;
