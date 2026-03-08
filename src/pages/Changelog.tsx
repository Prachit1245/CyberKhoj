import { useMemo } from "react";
import { Terminal, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CHANGELOG, APP_VERSION, type ChangeType } from "@/lib/changelog";

const TYPE_STYLES: Record<ChangeType, { label: string; color: string }> = {
  new: { label: "[NEW]", color: "text-[hsl(110,100%,55%)]" },
  improve: { label: "[IMPROVE]", color: "text-[hsl(48,96%,53%)]" },
  fix: { label: "[FIX]", color: "text-[hsl(0,72%,51%)]" },
};

export default function Changelog() {
  const navigate = useNavigate();

  const formattedLog = useMemo(() => {
    const lines: { type: "header" | "entry"; content: string; changeType?: ChangeType }[] = [];

    for (const version of CHANGELOG) {
      const d = new Date(version.date);
      const timestamp = d.toISOString().replace("T", " ").slice(0, 19);
      lines.push({ type: "header", content: `[${timestamp}] ── v${version.version} ${"─".repeat(40)}` });

      for (const change of version.changes) {
        lines.push({ type: "entry", content: change.text, changeType: change.type });
      }

      lines.push({ type: "header", content: "" }); // blank line
    }

    return lines;
  }, []);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-mono font-bold text-foreground flex items-center gap-2">
            <Terminal size={18} className="text-primary" /> Changelog
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            Current version: <span className="text-primary">v{APP_VERSION}</span>
          </p>
        </div>
      </div>

      {/* Terminal window */}
      <div className="rounded-xl border border-border bg-[hsl(0,0%,4%)] overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(0,0%,8%)] border-b border-border">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[hsl(0,72%,51%)]" />
            <span className="w-3 h-3 rounded-full bg-[hsl(48,96%,53%)]" />
            <span className="w-3 h-3 rounded-full bg-[hsl(110,100%,55%)]" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground ml-2">cyberkhoj-changelog.log</span>
        </div>

        {/* Log content */}
        <div className="p-4 space-y-0.5 max-h-[70vh] overflow-y-auto font-mono text-sm leading-relaxed">
          {/* Boot sequence */}
          <p className="text-muted-foreground">$ cat /var/log/hackmind/changelog.log</p>
          <p className="text-muted-foreground mb-4">---</p>

          {formattedLog.map((line, i) => {
            if (line.type === "header") {
              return (
                <p key={i} className="text-muted-foreground text-xs mt-4 first:mt-0">
                  {line.content}
                </p>
              );
            }

            const style = TYPE_STYLES[line.changeType!];
            return (
              <p key={i} className="flex gap-2 pl-4">
                <span className={`${style.color} shrink-0`}>{style.label}</span>
                <span className="text-foreground">{line.content}</span>
              </p>
            );
          })}

          {/* Footer */}
          <p className="text-muted-foreground text-xs mt-6">--- EOF ---</p>
          <p className="text-primary animate-pulse">█</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs font-mono">
        {Object.entries(TYPE_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={style.color}>{style.label}</span>
            <span className="text-muted-foreground capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
