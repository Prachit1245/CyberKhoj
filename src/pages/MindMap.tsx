import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import {
  ZoomIn, ZoomOut, Maximize, Image, FileJson, ClipboardList, Save, Network,
  TreePine, Zap, StickyNote, CheckCircle, Copy, Search, WifiOff, Plus,
  ChevronsDownUp, ChevronsUpDown, List,
} from "lucide-react";
import html2canvas from "html2canvas";
import { callGemini, GeminiError } from "@/lib/gemini";
import { buildMindMapPrompt, parseMindMapNodes, type MindMapNode } from "@/lib/prompts";
import { toast } from "@/components/Toast";
import { useNavigate } from "react-router-dom";
import useOnline from "@/hooks/useOnline";
import { addToHistory } from "@/lib/store";
import { checkMindMap } from "@/lib/achievements";
import MindMapNodeComponent from "@/components/mindmap/MindMapNode";
import MindMapSidePanel from "@/components/mindmap/MindMapSidePanel";
import type { MindMapNodeData } from "@/components/mindmap/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/* ── localStorage keys ── */
const META_KEY_PREFIX = "hackmind_mm_meta_";
const VIEWPORT_KEY_PREFIX = "hackmind_mm_vp_";

function loadMeta(domain: string): Record<string, { tested?: boolean; note?: string }> {
  try {
    const raw = localStorage.getItem(META_KEY_PREFIX + domain);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveMeta(domain: string, meta: Record<string, { tested?: boolean; note?: string }>) {
  localStorage.setItem(META_KEY_PREFIX + domain, JSON.stringify(meta));
}

function loadViewport(domain: string): Viewport | null {
  try {
    const raw = localStorage.getItem(VIEWPORT_KEY_PREFIX + domain);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveViewport(domain: string, vp: Viewport) {
  localStorage.setItem(VIEWPORT_KEY_PREFIX + domain, JSON.stringify(vp));
}

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
  nodeMetadata: Record<string, { tested?: boolean; note?: string }>,
  searchTerm: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const lowerSearch = searchTerm.toLowerCase().trim();

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

    const meta = nodeMetadata[mn.id] || {};
    const searchMatch = lowerSearch
      ? mn.label.toLowerCase().includes(lowerSearch) ||
        (mn.description || "").toLowerCase().includes(lowerSearch) ||
        mn.attackIdeas.some((a) => a.toLowerCase().includes(lowerSearch))
      : false;

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
        searchMatch,
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
  const { fitView, zoomIn, zoomOut, setViewport } = useReactFlow();
  const domainRef = useRef("");

  // Interaction state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [checkedIdeas, setCheckedIdeas] = useState<Record<string, boolean>>({});
  const [nodeMetadata, setNodeMetadata] = useState<Record<string, { tested?: boolean; note?: string }>>({});
  const [contextNodeId, setContextNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Persist viewport on move
  const handleMoveEnd = useCallback((_: any, vp: Viewport) => {
    if (domainRef.current) saveViewport(domainRef.current, vp);
  }, []);

  // Keyboard shortcuts
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
    (data: MindMapNode[], dir: "LR" | "TB", collapsed?: Set<string>, meta?: Record<string, { tested?: boolean; note?: string }>, search?: string) => {
      const { nodes: n, edges: e } = buildFlowElements(data, collapsed ?? collapsedIds, meta ?? nodeMetadata, search ?? searchTerm);
      const laid = layoutWithDagre(n, e, dir);
      setNodes(laid.nodes);
      setEdges(laid.edges);
      setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 150);
    },
    [setNodes, setEdges, fitView, collapsedIds, nodeMetadata, searchTerm]
  );

  const generate = async () => {
    if (!domain.trim()) {
      toast.error("Enter a target domain");
      return;
    }
    setLoading(true);
    setSelectedNodeId(null);
    setSearchTerm("");
    const savedMeta = loadMeta(domain.trim());
    setCollapsedIds(new Set());
    setCheckedIdeas({});
    setNodeMetadata(savedMeta);
    domainRef.current = domain.trim();
    try {
      const raw = await callGemini(buildMindMapPrompt(domain), true);
      const parsed = parseMindMapNodes(raw);
      rawNodesRef.current = parsed;
      setHasData(true);
      applyLayout(parsed, direction, new Set(), savedMeta, "");
      // Restore saved viewport
      const savedVp = loadViewport(domain.trim());
      if (savedVp) {
        setTimeout(() => setViewport(savedVp, { duration: 600 }), 900);
      }
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
    const blob = new Blob([JSON.stringify({ nodes: rawNodesRef.current, metadata: nodeMetadata }, null, 2)], { type: "application/json" });
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
      const tested = nodeMetadata[id]?.tested ? " ✓" : "";
      lines.push(`${prefix}${node.label}${sev}${tested}`);
      if (node.description) lines.push(`${prefix}  ↳ ${node.description}`);
      if (nodeMetadata[id]?.note) lines.push(`${prefix}  📝 ${nodeMetadata[id].note}`);
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
    checkMindMap();
  };

  // Update metadata helper (persists to localStorage)
  const updateMeta = useCallback((id: string, partial: Partial<{ tested: boolean; note: string }>) => {
    setNodeMetadata((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...partial } };
      if (domainRef.current) saveMeta(domainRef.current, next);
      setTimeout(() => applyLayout(rawNodesRef.current, direction, collapsedIds, next), 0);
      return next;
    });
  }, [applyLayout, direction, collapsedIds]);

  // Node click → open side panel
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Double click → toggle collapse
  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    const d = node.data as MindMapNodeData;
    if (d.nodeType === "attack") return;

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      setTimeout(() => applyLayout(rawNodesRef.current, direction, next), 0);
      return next;
    });
  }, [applyLayout, direction]);

  // Collapse / expand all
  const collapseAll = () => {
    const ids = new Set(
      rawNodesRef.current
        .filter((n) => n.type !== "attack" && rawNodesRef.current.some((c) => c.parentId === n.id))
        .map((n) => n.id)
    );
    setCollapsedIds(ids);
    setTimeout(() => applyLayout(rawNodesRef.current, direction, ids), 0);
  };

  const expandAll = () => {
    setCollapsedIds(new Set());
    setTimeout(() => applyLayout(rawNodesRef.current, direction, new Set()), 0);
  };

  // Search handler
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (rawNodesRef.current.length) {
      applyLayout(rawNodesRef.current, direction, collapsedIds, nodeMetadata, term);
    }
  };

  // Context menu actions
  const handleContextAction = (action: string) => {
    if (!contextNodeId) return;
    const mn = rawNodesRef.current.find((n) => n.id === contextNodeId);
    if (!mn) return;

    switch (action) {
      case "note": {
        setNoteText(nodeMetadata[contextNodeId]?.note || "");
        setShowNoteModal(true);
        break;
      }
      case "tested": {
        updateMeta(contextNodeId, { tested: !nodeMetadata[contextNodeId]?.tested });
        toast.success("Toggled tested status");
        setContextNodeId(null);
        break;
      }
      case "copy": {
        navigator.clipboard.writeText(mn.attackIdeas.join("\n"));
        toast.success("Attack ideas copied");
        setContextNodeId(null);
        break;
      }
      case "analyze": {
        navigate(`/analyzer?target=${encodeURIComponent(mn.label)}`);
        setContextNodeId(null);
        break;
      }
      case "add-child": {
        const label = prompt("New child node label:");
        if (label && label.trim()) {
          const newId = `custom-${Date.now()}`;
          rawNodesRef.current.push({
            id: newId,
            label: label.trim(),
            type: "attack",
            parentId: contextNodeId,
            description: "Custom node",
            attackIdeas: [],
            severity: "low",
          });
          applyLayout(rawNodesRef.current, direction);
          toast.success("Custom node added");
        }
        setContextNodeId(null);
        break;
      }
    }
  };

  // Save note from modal
  const handleSaveNote = () => {
    if (contextNodeId) {
      updateMeta(contextNodeId, { note: noteText });
      toast.success("Note saved");
    }
    setShowNoteModal(false);
    setContextNodeId(null);
  };

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  // Tested counter
  const totalNodes = rawNodesRef.current.length;
  const testedCount = Object.values(nodeMetadata).filter((m) => m.tested).length;

  const btn =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border/30 bg-card/80 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors cursor-pointer backdrop-blur-sm";

  const [showTextView, setShowTextView] = useState(false);

  // Build text list for screen reader alternative
  const textListContent = useMemo(() => {
    if (!rawNodesRef.current.length) return [];
    const items: { label: string; severity?: string; type: string; depth: number; description?: string }[] = [];
    const buildList = (parentId: string | undefined, depth: number) => {
      const children = rawNodesRef.current.filter((n) => n.parentId === parentId);
      for (const child of children) {
        items.push({
          label: child.label,
          severity: child.severity,
          type: child.type,
          depth,
          description: child.description,
        });
        buildList(child.id, depth + 1);
      }
    };
    const root = rawNodesRef.current.find((n) => n.type === "root");
    if (root) {
      items.push({ label: root.label, type: "root", depth: 0 });
      buildList(root.id, 1);
    }
    return items;
  }, [nodes]); // re-derive when nodes change

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

        {/* Search */}
        {hasData && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search nodes..."
              className="h-9 w-40 rounded-lg bg-card/50 border border-border/30 pl-8 pr-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
        )}

        {/* Tested counter */}
        {hasData && totalNodes > 0 && (
          <span className="text-[10px] font-mono text-muted-foreground border border-border/30 rounded-lg px-2.5 py-1.5 bg-card/80 backdrop-blur-sm flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-primary" />
            <span className="text-primary font-bold">{testedCount}</span>/{totalNodes} tested
          </span>
        )}

        <div className="flex-1" />

        {/* Collapse/Expand */}
        {hasData && (
          <>
            <button onClick={collapseAll} className={btn} title="Collapse All">
              <ChevronsDownUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={expandAll} className={btn} title="Expand All">
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}

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
        <button onClick={saveToHistory} className={btn} disabled={!hasData} aria-label="Save to history">
          <Save className="h-3.5 w-3.5" /> Save
        </button>
        {hasData && (
          <button
            onClick={() => setShowTextView(!showTextView)}
            className={`${btn} ${showTextView ? "!text-primary !border-primary/40" : ""}`}
            aria-label="Toggle accessible text list view"
          >
            <List className="h-3.5 w-3.5" /> {showTextView ? "Graph" : "Text List"}
          </button>
        )}
      </div>

      {/* Text List View (Screen Reader Friendly) */}
      {showTextView && hasData ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-6" role="region" aria-label="Mind map as text list">
          <h2 className="font-heading text-lg font-bold text-foreground mb-4">Attack Surface — Text View</h2>
          <p className="text-xs font-mono text-muted-foreground mb-4">Accessible alternative to the visual mind map.</p>
          <ul className="space-y-1" role="tree">
            {textListContent.map((item, i) => {
              const sevColors: Record<string, string> = {
                critical: "text-[hsl(0,72%,51%)]",
                high: "text-[hsl(25,95%,53%)]",
                medium: "text-[hsl(48,96%,53%)]",
                low: "text-[hsl(217,91%,60%)]",
              };
              const sevLabel = item.severity ? ` [${item.severity.toUpperCase()}]` : "";
              const typeIcon = item.type === "root" ? "🎯" : item.type === "category" ? "📂" : "⚡";
              return (
                <li
                  key={i}
                  role="treeitem"
                  aria-level={item.depth + 1}
                  className="font-mono text-sm"
                  style={{ paddingLeft: `${item.depth * 1.5}rem` }}
                >
                  <span className="text-muted-foreground mr-1">{typeIcon}</span>
                  <span className="text-foreground">{item.label}</span>
                  {item.severity && (
                    <span className={`ml-1.5 text-xs font-bold ${sevColors[item.severity] || "text-muted-foreground"}`}>
                      {sevLabel}
                    </span>
                  )}
                  {item.description && (
                    <span className="block text-xs text-muted-foreground ml-6">↳ {item.description}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
      <>
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
                onMoveEnd={handleMoveEnd}
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
                    <div className="flex items-center gap-2">
                      <span className="text-primary shrink-0" style={{ fontSize: 10 }}>✓</span>
                      <span className="text-[10px] font-mono text-muted-foreground">Tested</span>
                    </div>
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

          <ContextMenuContent className="w-52 font-mono text-xs">
            <ContextMenuItem onClick={() => handleContextAction("add-child")} className="cursor-pointer">
              <Plus className="h-3.5 w-3.5 mr-2" /> Add Custom Child Node
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleContextAction("tested")} className="cursor-pointer">
              <CheckCircle className="h-3.5 w-3.5 mr-2" /> {contextNodeId && nodeMetadata[contextNodeId]?.tested ? "Unmark Tested" : "Mark as Tested"}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleContextAction("note")} className="cursor-pointer">
              <StickyNote className="h-3.5 w-3.5 mr-2" /> Add Note
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleContextAction("copy")} className="cursor-pointer">
              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Attack Ideas
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleContextAction("analyze")} className="cursor-pointer">
              <Search className="h-3.5 w-3.5 mr-2" /> Deep Analyze
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Note Modal */}
        {showNoteModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowNoteModal(false); setContextNodeId(null); } }}
          >
            <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 space-y-4 animate-scale-in">
              <h3 className="font-heading text-base font-bold text-foreground">
                Add Note
              </h3>
              <textarea
                autoFocus
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Your notes about this node..."
                rows={4}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowNoteModal(false); setContextNodeId(null); }}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        )}

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
      </>
      )}
    </div>
  );
}

const MindMap = () => (
  <ReactFlowProvider>
    <MindMapCanvas />
  </ReactFlowProvider>
);

export default MindMap;
