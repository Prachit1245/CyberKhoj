import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Swords, Globe, Copy, Link2, Network, ExternalLink } from "lucide-react";
import { getStats, getHistory, type AnalysisRecord } from "@/lib/store";

const STAT_CARDS = [
  { key: "totalAnalyses" as const, label: "Total Analyses", icon: Activity },
  { key: "attackPaths" as const, label: "Attack Paths Generated", icon: Swords },
  { key: "domainsTested" as const, label: "Domains Tested", icon: Globe },
  { key: "payloadsCopied" as const, label: "Payloads Copied", icon: Copy },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = getStats();
  const history = getHistory().slice(0, 5);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Welcome */}
      <div>
        <h2 className="font-heading text-2xl md:text-3xl font-extrabold text-foreground">
          Welcome to <span className="text-primary text-glow-primary">HackMind</span>
        </h2>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          Your AI-powered hacking toolkit. All data stays in your browser.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors"
          >
            <div className="inline-flex items-center justify-center rounded-lg bg-primary/10 p-2">
              <card.icon size={18} className="text-primary" />
            </div>
            <p className="font-heading text-2xl font-bold text-foreground">
              {stats[card.key].toLocaleString()}
            </p>
            <p className="text-xs font-mono text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Analyses */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg font-bold text-foreground">Recent Analyses</h3>
        {history.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-mono text-muted-foreground">
              No analyses yet. Start by analyzing a URL or domain.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Target</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Paths</th>
                  <th className="text-left px-4 py-3 font-mono text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className="border-b border-border/30 last:border-0 hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-foreground truncate max-w-[200px]">{record.target}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                        {record.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground">{record.pathsFound}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{record.date}</td>
                    <td className="px-4 py-3">
                      <ExternalLink size={14} className="text-muted-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg font-bold text-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/analyzer")}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all"
          >
            <Link2 size={16} /> Analyze URL
          </button>
          <button
            onClick={() => navigate("/attack")}
            className="flex items-center gap-2 rounded-lg border border-secondary px-5 py-2.5 font-heading text-sm font-bold text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all"
          >
            <Swords size={16} /> Attack Mode
          </button>
          <button
            onClick={() => navigate("/mindmap")}
            className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Network size={16} /> Open Mind Map
          </button>
        </div>
      </div>

      {/* Result Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRecord(null);
          }}
        >
          <div className="w-full max-w-2xl max-h-[80vh] rounded-xl border border-primary/30 bg-card p-6 overflow-y-auto animate-scale-in gate-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-foreground">
                Analysis: <span className="text-primary">{selectedRecord.target}</span>
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-mono"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-3 mb-4 text-xs font-mono">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">{selectedRecord.type}</span>
              <span className="text-muted-foreground">{selectedRecord.date}</span>
              <span className="text-muted-foreground">{selectedRecord.pathsFound} paths</span>
            </div>
            <pre className="whitespace-pre-wrap text-sm font-mono text-foreground bg-muted/30 rounded-lg p-4 border border-border/50">
              {selectedRecord.result || "No result data available."}
            </pre>
          </div>
        </div>
      )}

      <style>{`
        .gate-card {
          box-shadow: 0 0 40px hsl(110 100% 55% / 0.08), 0 0 80px hsl(110 100% 55% / 0.04);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
