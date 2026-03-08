import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Share2, ExternalLink, AlertTriangle } from "lucide-react";
import { decompressFromHash, type SharePayload } from "@/lib/shareResults";
import SeveritySummaryBar from "@/components/SeveritySummaryBar";
import AttackPathCard from "@/components/AttackPathCard";
import ResultsFilterBar from "@/components/ResultsFilterBar";
import type { AttackPath } from "@/types";

const normalizePaths = (raw: any[]): AttackPath[] =>
  raw.map((p, i) => ({
    id: p.id ?? i + 1,
    title: p.title || "Untitled",
    category: p.category || "Other",
    severity: (["critical", "high", "medium", "low"].includes(p.severity?.toLowerCase?.())
      ? p.severity.toLowerCase()
      : "medium") as AttackPath["severity"],
    description: p.description || "",
    payloadExample: p.payloadExample || "",
    steps: Array.isArray(p.steps) ? p.steps : [],
    references: Array.isArray(p.references) ? p.references : [],
    isBookmarked: false,
    isTested: false,
    userNotes: "",
  }));

export default function SharedView() {
  const location = useLocation();
  const navigate = useNavigate();

  const data = useMemo<SharePayload | null>(
    () => decompressFromHash(location.hash),
    [location.hash]
  );

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
        <AlertTriangle size={32} className="text-destructive mx-auto" />
        <h1 className="font-heading text-lg font-bold text-foreground">Invalid or Expired Share Link</h1>
        <p className="text-sm font-mono text-muted-foreground">
          This link doesn't contain valid analysis data. It may have been truncated or corrupted.
        </p>
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-heading font-bold text-primary-foreground hover:brightness-110 transition-all"
        >
          Go to CyberKhoj
        </button>
      </div>
    );
  }

  const paths = normalizePaths(data.paths);

  return (
    <div className="max-w-4xl mx-auto space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
        <button onClick={() => navigate("/")} className="hover:text-foreground cursor-pointer flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> CyberKhoj
        </button>
      </div>

      {/* Shared badge + metadata */}
      <div className="rounded-lg border border-primary/20 bg-card/50 p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-[11px] font-mono text-primary">
            <Share2 size={12} /> Shared Analysis
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Read-only</span>
        </div>

        <h1 className="text-lg font-mono font-bold text-foreground break-all">{data.target}</h1>

        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-muted-foreground">
          {data.date && (
            <span>Analyzed: {new Date(data.date).toLocaleDateString()}</span>
          )}
          <span>{paths.length} attack paths</span>
          {data.type && <span>Type: {data.type}</span>}
        </div>

        <p className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1">
          <ExternalLink size={10} />
          This is a shared read-only view. No data is stored on any server.
        </p>
      </div>

      {/* Results */}
      {paths.length > 0 ? (
        <div className="space-y-4">
          <SeveritySummaryBar paths={paths} />
          <ResultsFilterBar paths={paths}>
            {(filtered) =>
              filtered.map((path) => (
                <AttackPathCard key={path.id} path={path} />
              ))
            }
          </ResultsFilterBar>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-sm font-mono text-muted-foreground/50">No attack paths in this shared analysis.</p>
        </div>
      )}
    </div>
  );
}
