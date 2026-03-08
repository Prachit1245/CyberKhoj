import { useState, useMemo } from "react";
import { isBeginnerMode } from "@/lib/beginnerMode";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, FileJson, FileText, Trash2, ChevronRight, Calendar, Target, Hash, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { compressForShare } from "@/lib/shareResults";
import { extractDomain, getNote, exportNoteMarkdown } from "@/lib/targetNotes";
import TargetNotesPanel from "@/components/TargetNotesPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/Toast";
import { getHistoryById, deleteFromHistory, type AnalysisRecord } from "@/lib/store";
import SeveritySummaryBar from "@/components/SeveritySummaryBar";
import AttackPathCard from "@/components/AttackPathCard";
import ResultsFilterBar from "@/components/ResultsFilterBar";
import type { AttackPath } from "@/types";

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  url: { label: "URL Analysis", className: "bg-secondary/20 text-secondary border-secondary/30" },
  domain: { label: "Mind Map", className: "bg-primary/20 text-primary border-primary/30" },
  request: { label: "Attack Mode", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

function parseResultData(record: AnalysisRecord): { paths: AttackPath[]; isMindMap: boolean; raw: any } {
  try {
    const data = JSON.parse(record.result);
    // Mind map format
    if (data?.nodes) return { paths: [], isMindMap: true, raw: data };
    // Array of attack paths
    const arr = Array.isArray(data) ? data : data?.paths || [];
    const paths: AttackPath[] = arr.map((p: any, i: number) => ({
      id: p.id ?? i + 1,
      title: p.title || "Untitled",
      category: p.category || "Other",
      severity: (["critical", "high", "medium", "low"].includes(p.severity?.toLowerCase?.()) ? p.severity.toLowerCase() : "medium") as AttackPath["severity"],
      description: p.description || "",
      payloadExample: p.payloadExample || p.payload || "",
      steps: Array.isArray(p.steps) ? p.steps : [],
      references: Array.isArray(p.references) ? p.references : [],
      isBookmarked: p.isBookmarked ?? false,
      isTested: p.isTested ?? false,
      userNotes: p.userNotes ?? "",
    }));
    return { paths, isMindMap: false, raw: data };
  } catch {
    return { paths: [], isMindMap: false, raw: null };
  }
}

function exportMarkdown(record: AnalysisRecord, paths: AttackPath[]): string {
  const lines: string[] = [
    `# Security Analysis: ${record.target}`,
    ``,
    `**Date:** ${new Date(record.date).toLocaleString()}`,
    `**Type:** ${TYPE_LABELS[record.type]?.label || record.type}`,
    `**Paths Found:** ${record.pathsFound}`,
    ``,
    `---`,
    ``,
  ];
  for (const p of paths) {
    lines.push(`## [${p.severity.toUpperCase()}] ${p.title}`);
    lines.push(`**Category:** ${p.category}`);
    lines.push(``);
    lines.push(p.description);
    lines.push(``);
    if (p.payloadExample) {
      lines.push(`**Payload:**`);
      lines.push("```");
      lines.push(p.payloadExample);
      lines.push("```");
      lines.push(``);
    }
    if (p.steps.length > 0) {
      lines.push(`**Steps:**`);
      p.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
      lines.push(``);
    }
    lines.push(`---`);
    lines.push(``);
  }
  return lines.join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record] = useState<AnalysisRecord | undefined>(() => id ? getHistoryById(id) : undefined);

  const { paths, isMindMap, raw } = useMemo(() => {
    if (!record) return { paths: [] as AttackPath[], isMindMap: false, raw: null };
    return parseResultData(record);
  }, [record]);

  const [attackPaths, setAttackPaths] = useState<AttackPath[]>(paths);

  if (!record) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/history")} className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to History
        </button>
        <div className="text-center py-16">
          <p className="text-sm font-mono text-muted-foreground/50">Analysis not found</p>
        </div>
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[record.type] || TYPE_LABELS.url;
  const truncatedTarget = record.target.length > 50 ? record.target.slice(0, 50) + "…" : record.target;

  const handleDelete = () => {
    deleteFromHistory(record.id);
    toast.success("Analysis deleted");
    navigate("/history");
  };

  const handleReanalyze = () => {
    if (record.type === "domain") {
      navigate(`/mindmap?target=${encodeURIComponent(record.target)}`);
    } else if (record.type === "request") {
      navigate(`/attack?target=${encodeURIComponent(record.target)}`);
    } else {
      navigate(`/analyzer?target=${encodeURIComponent(record.target)}`);
    }
  };

  const handleExportMd = () => {
    const md = exportMarkdown(record, attackPaths);
    const date = new Date(record.date).toISOString().slice(0, 10);
    downloadFile(md, `hackmind-${record.target.replace(/[^a-z0-9]/gi, "-")}-${date}.md`, "text/markdown");
    toast.success("Markdown exported");
  };

  const handleExportJson = () => {
    const date = new Date(record.date).toISOString().slice(0, 10);
    downloadFile(record.result, `hackmind-${record.target.replace(/[^a-z0-9]/gi, "-")}-${date}.json`, "application/json");
    toast.success("JSON exported");
  };

  const updatePath = (updated: AttackPath) => {
    setAttackPaths((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleShare = async () => {
    if (attackPaths.length === 0) {
      toast.error("No attack paths to share");
      return;
    }
    const { url, truncated, tooLarge } = compressForShare({
      target: record.target,
      type: record.type,
      date: record.date,
      paths: attackPaths,
    });
    if (tooLarge) {
      toast.error("Results too large to share via URL even after truncation. Export as JSON instead.");
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success(
      truncated
        ? `Share link copied! (Truncated to top 10 paths by severity)`
        : "Share link copied to clipboard!"
    );
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
        <button onClick={() => navigate("/history")} className="hover:text-foreground cursor-pointer flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> History
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground truncate max-w-[300px]">{truncatedTarget}</span>
      </div>

      {/* Metadata Header */}
      <div className="rounded-lg border border-border/20 bg-card/50 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-mono font-bold text-foreground truncate">{record.target}</h1>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${typeInfo.className}`}>
                {typeInfo.label}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {record.pathsFound} paths found
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {record.type}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleReanalyze} className="text-xs font-mono cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-analyze
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMd} className="text-xs font-mono cursor-pointer">
            <FileText className="h-3.5 w-3.5 mr-1" /> Export Markdown
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportJson} className="text-xs font-mono cursor-pointer">
            <FileJson className="h-3.5 w-3.5 mr-1" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare} className="text-xs font-mono cursor-pointer">
            <Share2 className="h-3.5 w-3.5 mr-1" /> Share
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs font-mono text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-mono">Delete this analysis?</AlertDialogTitle>
                <AlertDialogDescription className="font-mono text-xs">
                  This will permanently remove this analysis from history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-mono text-xs cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground font-mono text-xs cursor-pointer">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Results */}
      {isMindMap ? (
        <div className="space-y-3">
          <p className="text-xs font-mono text-muted-foreground">Mind map data — {raw?.nodes?.length || 0} nodes</p>
          <pre className="text-xs font-mono text-foreground/80 bg-card/50 border border-border/20 rounded-lg p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      ) : attackPaths.length > 0 ? (
        <div className="space-y-4">
          <SeveritySummaryBar paths={attackPaths} />
          <ResultsFilterBar paths={attackPaths}>
            {(filtered) =>
              filtered.map((path) => (
                <AttackPathCard key={path.id} path={path} onChange={updatePath} beginnerMode={isBeginnerMode()} />
              ))
            }
          </ResultsFilterBar>
        </div>
      ) : (
        <pre className="text-xs font-mono text-foreground/80 bg-card/50 border border-border/20 rounded-lg p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap">
          {record.result}
        </pre>
      )}
    </div>
  );
}
