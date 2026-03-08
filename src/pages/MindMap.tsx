import { useState, useCallback, useRef, useEffect } from "react";
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
import { ZoomIn, ZoomOut, Maximize, Image, FileJson, ClipboardList, Save, Network, TreePine, Zap, StickyNote, CheckCircle, Copy, Search, WifiOff } from "lucide-react";
import html2canvas from "html2canvas";
import { callGemini, GeminiError } from "@/lib/gemini";
import { buildMindMapPrompt, parseMindMapNodes, type MindMapNode } from "@/lib/prompts";
import { toast } from "@/components/Toast";
import { useNavigate } from "react-router-dom";
import useOnline from "@/hooks/useOnline";
import { addToHistory } from "@/lib/store";
import MindMapNodeComponent from "@/components/mindmap/MindMapNode";
import MindMapSidePanel from "@/components/mindmap/MindMapSidePanel";
import type { MindMapNodeData } from "@/components/mindmap/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

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

const nodeTypes = { mindMapNode: MindMapNodeComponent };

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
function buildFlowElements(
  mapNodes: MindMapNode[],
  collapsedIds: Set<string>,
  nodeMetadata: Record<string, { tested?: boolean; note?: string }>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Determine which nodes are hidden due to collapsed ancestors
  const hiddenIds = new Set<string>();
  const markHidden = (parentId: string) => {
    for (const mn of mapNodes) {
      if (mn.parentId === parentId) {
        hiddenIds.add(mn.id);
        markHidden(mn.id);
      }
    }
  };
  for (const id of collapsedIds) {
    markHidden(id);
  }

  for (const mn of mapNodes) {
    if (hiddenIds.has(mn.id)) continue;

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

    const meta = nodeMetadata[mn.id] || {};

    nodes.push({
      id: mn.id,
      type: "mindMapNode",
      position: { x: 0, y: 0 },
      data: {
        label: mn.label + (collapsedIds.has(mn.id) ? " ▸" : ""),
        description: mn.description,
        attackIdeas: mn.attackIdeas,
        severity: mn.severity,
        nodeType: mn.type,
        parentId: mn.parentId,
        tested: meta.tested,
        note: meta.note,
      } as MindMapNodeData,
      style,
    });

    if (mn.parentId && !hiddenIds.has(mn.parentId)) {
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
  const navigate = useNavigate();
  const online = useOnline();
  const [domain, setDomain] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<"LR" | "TB">("LR");
  const [hasData, setHasData] = useState(false);
  const rawNodesRef = useRef<MindMapNode[]>([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Interaction state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [checkedIdeas, setCheckedIdeas] = useState<Record<string, boolean>>({});
  const [nodeMetadata, setNodeMetadata] = useState<Record<string, { tested?: boolean; note?: string }>>({});
  const [contextNodeId, setContextNodeId] = useState<string | null>(null);

  // Keyboard shortcuts: F = fit, +/= = zoom in, - = zoom out
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        fitView({ padding: 0.15, duration: 600 });
      }
      if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        zoomIn();
      }
      if (e.key === "-" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fitView, zoomIn, zoomOut]);

  const applyLayout = useCallback(
    (data: MindMapNode[], dir: "LR" | "TB", collapsed?: Set<string>, meta?: Record<string, { tested?: boolean; note?: string }>) => {
      const { nodes: n, edges: e } = buildFlowElements(data, collapsed ?? collapsedIds, meta ?? nodeMetadata);
      const laid = layoutWithDagre(n, e, dir);
      setNodes(laid.nodes);
      setEdges(laid.edges);
      setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 150);
    },
    [setNodes, setEdges, fitView, collapsedIds, nodeMetadata]
  );

  const generate = async () => {
    if (!domain.trim()) {
      toast.error("Enter a target domain");
      return;
    }
    setLoading(true);
    setSelectedNodeId(null);
    setCollapsedIds(new Set());
    setCheckedIdeas({});
    setNodeMetadata({});
    try {
      const raw = await callGemini(buildMindMapPrompt(domain));
      const parsed = parseMindMapNodes(raw);
      rawNodesRef.current = parsed;
      setHasData(true);
      applyLayout(parsed, direction, new Set(), {});
      toast.success(`Mind map generated — ${parsed.length} nodes ✓`);
    } catch (err: any) {
      if (err instanceof GeminiError) {
        toast.error(`${err.code}: ${err.message}`);
      } else {
        toast.error(err.message || "Failed to generate mind map");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDirection = () => {
    const next = direction === "LR" ? "TB" : "LR";
    setDirection(next);
    if (rawNodesRef.current.length) applyLayout(rawNodesRef.current, next);
  };

  const canvasRef = useRef<HTMLDivElement>(null);

  const exportPng = async () => {
    const el = canvasRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!el) { toast.error("No canvas to capture"); return; }
    try {
      toast.info("Capturing...");
      const canvas = await html2canvas(el, { backgroundColor: "#0a0a0a", scale: 2, useCORS: true });
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.download = `hackmind-mindmap-${domain || "target"}-${date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("PNG downloaded");
    } catch { toast.error("Failed to capture PNG"); }
  };

  const exportJson = () => {
    if (!rawNodesRef.current.length) { toast.error("No data to export"); return; }
    const blob = new Blob([JSON.stringify({ nodes: rawNodesRef.current }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.download = `hackmind-mindmap-${domain || "target"}-${date}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("JSON downloaded");
  };

  const copyAsText = () => {
    if (!rawNodesRef.current.length) { toast.error("No data to copy"); return; }
    const map = new Map(rawNodesRef.current.map((n) => [n.id, n]));
    const lines: string[] = [];
    const render = (id: string, depth: number) => {
      const node = map.get(id);
      if (!node) return;
      const prefix = "  ".repeat(depth);
      const sev = node.severity ? ` [${node.severity.toUpperCase()}]` : "";
      lines.push(`${prefix}${node.label}${sev}`);
      if (node.description) lines.push(`${prefix}  ↳ ${node.description}`);
      node.attackIdeas.forEach((a) => lines.push(`${prefix}    • ${a}`));
      rawNodesRef.current.filter((c) => c.parentId === id).forEach((c) => render(c.id, depth + 1));
    };
    const root = rawNodesRef.current.find((n) => n.type === "root");
    if (root) render(root.id, 0);
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Mind map copied as text outline");
  };

  const saveToHistory = () => {
    if (!rawNodesRef.current.length) { toast.error("No data to save"); return; }
    addToHistory({
      id: `mindmap-${Date.now()}`,
      target: domain || "unknown",
      type: "domain",
      pathsFound: rawNodesRef.current.filter((n) => n.type === "attack").length,
      date: new Date().toISOString(),
      result: JSON.stringify({ nodes: rawNodesRef.current }),
    });
    toast.success("Mind map saved to history");
  };

  // Node click → open side panel
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Double click → toggle collapse
  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    const d = node.data as MindMapNodeData;
    if (d.nodeType === "attack") return; // leaves don't collapse

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      // Re-layout
      setTimeout(() => applyLayout(rawNodesRef.current, direction, next), 0);
      return next;
    });
  }, [applyLayout, direction]);

  // Context menu actions
  const handleContextAction = (action: string) => {
    if (!contextNodeId) return;
    const mn = rawNodesRef.current.find((n) => n.id === contextNodeId);
    if (!mn) return;

    switch (action) {
      case "note": {
        const note = prompt("Add a note for: " + mn.label);
        if (note !== null) {
          setNodeMetadata((prev) => {
            const next = { ...prev, [contextNodeId]: { ...prev[contextNodeId], note } };
            setTimeout(() => applyLayout(rawNodesRef.current, direction, collapsedIds, next), 0);
            return next;
          });
          toast.success("Note added");
        }
        break;
      }
      case "tested": {
        setNodeMetadata((prev) => {
          const next = { ...prev, [contextNodeId]: { ...prev[contextNodeId], tested: !prev[contextNodeId]?.tested } };
          setTimeout(() => applyLayout(rawNodesRef.current, direction, collapsedIds, next), 0);
          return next;
        });
        toast.success("Toggled tested status");
        break;
      }
      case "copy": {
        navigator.clipboard.writeText(mn.attackIdeas.join("\n"));
        toast.success("Attack ideas copied");
        break;
      }
      case "analyze": {
        navigate(`/analyzer?target=${encodeURIComponent(mn.label)}`);
        break;
      }
    }
    setContextNodeId(null);
  };

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

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
          disabled={loading || !online}
          title={!online ? "Requires internet for AI analysis" : undefined}
          className="h-9 px-4 rounded-lg font-mono font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          {!online ? <WifiOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
          {!online ? "Offline" : loading ? "Generating..." : "Generate Mind Map"}
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
        <button onClick={exportPng} className={btn} disabled={!hasData}>
          <Image className="h-3.5 w-3.5" /> PNG
        </button>
        <button onClick={exportJson} className={btn} disabled={!hasData}>
          <FileJson className="h-3.5 w-3.5" /> JSON
        </button>
        <button onClick={copyAsText} className={btn} disabled={!hasData}>
          <ClipboardList className="h-3.5 w-3.5" /> Text
        </button>
        <button onClick={saveToHistory} className={btn} disabled={!hasData}>
          <Save className="h-3.5 w-3.5" /> Save
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={canvasRef}>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="h-full w-full">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onNodeContextMenu={(e, node) => {
                  e.preventDefault();
                  setContextNodeId(node.id);
                }}
                nodeTypes={nodeTypes}
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
          </ContextMenuTrigger>

          <ContextMenuContent className="w-48 font-mono text-xs">
            <ContextMenuItem onClick={() => handleContextAction("note")} className="cursor-pointer">
              <StickyNote className="h-3.5 w-3.5 mr-2" /> Add Note
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleContextAction("tested")} className="cursor-pointer">
              <CheckCircle className="h-3.5 w-3.5 mr-2" /> Mark Tested
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleContextAction("copy")} className="cursor-pointer">
              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Ideas
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleContextAction("analyze")} className="cursor-pointer">
              <Search className="h-3.5 w-3.5 mr-2" /> Deep Analyze
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Side Panel */}
        {selectedNode && (
          <MindMapSidePanel
            nodeId={selectedNode.id}
            data={selectedNode.data as MindMapNodeData}
            onClose={() => setSelectedNodeId(null)}
            onAnalyze={(label) => navigate(`/analyzer?target=${encodeURIComponent(label)}`)}
            checkedIdeas={checkedIdeas}
            onToggleIdea={(key) => setCheckedIdeas((prev) => ({ ...prev, [key]: !prev[key] }))}
          />
        )}
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
