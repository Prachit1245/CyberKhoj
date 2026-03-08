import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ZoomIn, ZoomOut, Maximize, Download, Network, TreePine, Zap } from "lucide-react";
import { callGemini } from "@/lib/gemini";
import { toast } from "sonner";

const CATEGORY_COLORS: Record<string, string> = {
  target: "#00ff88",
  auth: "#f97316",
  injection: "#ef4444",
  xss: "#eab308",
  api: "#06b6d4",
  infra: "#8b5cf6",
  logic: "#ec4899",
  access: "#f59e0b",
  client: "#14b8a6",
  other: "#6b7280",
};

const LEGEND = [
  { label: "Target", color: CATEGORY_COLORS.target },
  { label: "Auth", color: CATEGORY_COLORS.auth },
  { label: "Injection", color: CATEGORY_COLORS.injection },
  { label: "XSS", color: CATEGORY_COLORS.xss },
  { label: "API", color: CATEGORY_COLORS.api },
  { label: "Infrastructure", color: CATEGORY_COLORS.infra },
  { label: "Business Logic", color: CATEGORY_COLORS.logic },
  { label: "Access Control", color: CATEGORY_COLORS.access },
  { label: "Client-side", color: CATEGORY_COLORS.client },
];

const PROMPT = (domain: string) => `You are a security expert. Generate an attack surface mind map for "${domain}".

Return ONLY a JSON object with:
{
  "nodes": [
    { "id": "root", "label": "${domain}", "category": "target", "children": ["cat1","cat2",...] },
    { "id": "cat1", "label": "Category Name", "category": "auth|injection|xss|api|infra|logic|access|client|other", "children": ["leaf1","leaf2",...] },
    { "id": "leaf1", "label": "Specific attack vector", "category": "...", "children": [] }
  ]
}

Generate 8-12 category nodes and 3-5 leaf nodes per category. No markdown, just JSON.`;

interface MapNode {
  id: string;
  label: string;
  category: string;
  children: string[];
}

function buildFlowData(
  mapNodes: MapNode[],
  layout: "tree" | "radial"
): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map(mapNodes.map((n) => [n.id, n]));
  const root = mapNodes.find((n) => n.category === "target") || mapNodes[0];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!root) return { nodes, edges };

  if (layout === "tree") {
    // Layered tree
    const categories = root.children.map((id) => nodeMap.get(id)).filter(Boolean) as MapNode[];
    const catSpacing = 220;
    const startY = -(categories.length * catSpacing) / 2;

    nodes.push({
      id: root.id,
      position: { x: 0, y: 0 },
      data: { label: root.label },
      style: {
        background: CATEGORY_COLORS.target,
        color: "#000",
        border: "none",
        borderRadius: "12px",
        fontWeight: 700,
        fontFamily: "monospace",
        fontSize: "14px",
        padding: "12px 20px",
      },
    });

    categories.forEach((cat, ci) => {
      const color = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other;
      const y = startY + ci * catSpacing;
      nodes.push({
        id: cat.id,
        position: { x: 400, y },
        data: { label: cat.label },
        style: {
          background: color + "20",
          color,
          border: `1px solid ${color}60`,
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "8px 14px",
        },
      });
      edges.push({
        id: `e-${root.id}-${cat.id}`,
        source: root.id,
        target: cat.id,
        style: { stroke: color + "40" },
        animated: true,
      });

      const leaves = cat.children.map((id) => nodeMap.get(id)).filter(Boolean) as MapNode[];
      const leafSpacing = 50;
      const leafStartY = y - ((leaves.length - 1) * leafSpacing) / 2;

      leaves.forEach((leaf, li) => {
        const lColor = CATEGORY_COLORS[leaf.category] || color;
        nodes.push({
          id: leaf.id,
          position: { x: 800, y: leafStartY + li * leafSpacing },
          data: { label: leaf.label },
          style: {
            background: lColor + "10",
            color: lColor,
            border: `1px solid ${lColor}30`,
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "10px",
            padding: "6px 10px",
          },
        });
        edges.push({
          id: `e-${cat.id}-${leaf.id}`,
          source: cat.id,
          target: leaf.id,
          style: { stroke: lColor + "30" },
        });
      });
    });
  } else {
    // Radial
    const categories = root.children.map((id) => nodeMap.get(id)).filter(Boolean) as MapNode[];
    const radius1 = 350;
    const radius2 = 650;

    nodes.push({
      id: root.id,
      position: { x: 0, y: 0 },
      data: { label: root.label },
      style: {
        background: CATEGORY_COLORS.target,
        color: "#000",
        border: "none",
        borderRadius: "50%",
        fontWeight: 700,
        fontFamily: "monospace",
        fontSize: "13px",
        padding: "16px",
        width: "auto",
      },
    });

    categories.forEach((cat, ci) => {
      const angle = (2 * Math.PI * ci) / categories.length - Math.PI / 2;
      const color = CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other;
      const x = Math.cos(angle) * radius1;
      const y = Math.sin(angle) * radius1;

      nodes.push({
        id: cat.id,
        position: { x, y },
        data: { label: cat.label },
        style: {
          background: color + "20",
          color,
          border: `1px solid ${color}60`,
          borderRadius: "8px",
          fontFamily: "monospace",
          fontSize: "11px",
          padding: "8px 12px",
        },
      });
      edges.push({
        id: `e-${root.id}-${cat.id}`,
        source: root.id,
        target: cat.id,
        style: { stroke: color + "40" },
        animated: true,
      });

      const leaves = cat.children.map((id) => nodeMap.get(id)).filter(Boolean) as MapNode[];
      leaves.forEach((leaf, li) => {
        const leafAngle = angle + ((li - (leaves.length - 1) / 2) * 0.15);
        const lx = Math.cos(leafAngle) * radius2;
        const ly = Math.sin(leafAngle) * radius2;
        const lColor = CATEGORY_COLORS[leaf.category] || color;

        nodes.push({
          id: leaf.id,
          position: { x: lx, y: ly },
          data: { label: leaf.label },
          style: {
            background: lColor + "10",
            color: lColor,
            border: `1px solid ${lColor}30`,
            borderRadius: "6px",
            fontFamily: "monospace",
            fontSize: "10px",
            padding: "5px 8px",
          },
        });
        edges.push({
          id: `e-${cat.id}-${leaf.id}`,
          source: cat.id,
          target: leaf.id,
          style: { stroke: lColor + "30" },
        });
      });
    });
  }

  return { nodes, edges };
}

function MindMapCanvas() {
  const [domain, setDomain] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [layout, setLayout] = useState<"tree" | "radial">("tree");
  const [hasData, setHasData] = useState(false);
  const mapNodesRef = useRef<MapNode[]>([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const applyLayout = useCallback(
    (data: MapNode[], l: "tree" | "radial") => {
      const { nodes: n, edges: e } = buildFlowData(data, l);
      setNodes(n);
      setEdges(e);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
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
      const raw = await callGemini(PROMPT(domain));
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Invalid response");
      const parsed = JSON.parse(match[0]);
      const mapNodes: MapNode[] = parsed.nodes || [];
      mapNodesRef.current = mapNodes;
      setHasData(true);
      applyLayout(mapNodes, layout);
      toast.success("Mind map generated ✓");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate mind map");
    } finally {
      setLoading(false);
    }
  };

  const toggleLayout = () => {
    const next = layout === "tree" ? "radial" : "tree";
    setLayout(next);
    if (mapNodesRef.current.length) applyLayout(mapNodesRef.current, next);
  };

  const exportImage = () => {
    toast.info("Use your browser's screenshot tool or print to export the map");
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
        <button onClick={() => fitView({ padding: 0.2 })} className={btn}>
          <Maximize className="h-3.5 w-3.5" />
        </button>
        <button onClick={toggleLayout} className={btn}>
          {layout === "tree" ? <Network className="h-3.5 w-3.5" /> : <TreePine className="h-3.5 w-3.5" />}
          {layout === "tree" ? "Radial" : "Tree"}
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
          proOptions={{ hideAttribution: true }}
          style={{ background: "#0a0a0a" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ffffff10" />

          {/* Legend */}
          <Panel position="top-right">
            <div className="rounded-lg border border-border/20 bg-black/80 backdrop-blur-sm p-3 space-y-1.5">
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
