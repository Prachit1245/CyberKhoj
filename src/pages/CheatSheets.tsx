import { useState, useRef, useCallback } from "react";
import { Copy, Check, Printer, ChevronRight, Bookmark, BookmarkCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHEAT_SHEETS, type CheatSheet, type Difficulty } from "@/lib/cheatsheets";
import { toggleBookmark, isBookmarked as isBm } from "@/lib/bookmarks";
import { toast } from "@/components/Toast";

const DIFF_STYLES: Record<Difficulty, string> = {
  Beginner: "bg-primary/15 text-primary border-primary/30",
  Intermediate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Advanced: "bg-destructive/15 text-destructive border-destructive/30",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/60 border border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function SheetContent({ sheet }: { sheet: CheatSheet }) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${sheet.name} — Cheat Sheet</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 2rem; color: #111; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
        h2 { font-size: 1.1rem; margin-top: 1.5rem; border-bottom: 1px solid #ccc; padding-bottom: 0.25rem; }
        h3 { font-size: 0.9rem; margin-top: 0.75rem; color: #555; }
        pre { background: #f5f5f5; padding: 0.75rem; border-radius: 4px; font-size: 0.75rem; overflow-x: auto; white-space: pre-wrap; }
        .tip { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 0.5rem 0.75rem; margin: 0.5rem 0; font-size: 0.75rem; }
        .meta { color: #888; font-size: 0.8rem; margin-bottom: 1.5rem; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>${sheet.name}</h1>
      <p class="meta">${sheet.difficulty} · ${sheet.description}</p>
      ${sheet.sections.map(s => `
        <h2>${s.heading}</h2>
        ${s.description ? `<p style="font-size:0.8rem;color:#666">${s.description}</p>` : ""}
        ${s.blocks.map(b => `
          ${b.title ? `<h3>${b.title}</h3>` : ""}
          <pre>${b.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        `).join("")}
        ${s.tips ? s.tips.map(t => `<div class="tip">💡 ${t}</div>`).join("") : ""}
      `).join("")}
      </body></html>
    `);
    win.document.close();
    win.print();
  }, [sheet]);

  return (
    <div ref={contentRef} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-mono font-bold text-foreground">{sheet.name}</h2>
            <Badge variant="outline" className={`text-[10px] ${DIFF_STYLES[sheet.difficulty]}`}>
              {sheet.difficulty}
            </Badge>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">{sheet.description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs font-mono shrink-0 cursor-pointer">
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
      </div>

      {/* Sections */}
      {sheet.sections.map((section, si) => (
        <div key={si} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-mono font-bold text-foreground flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-primary" />
                {section.heading}
              </h3>
              {section.description && (
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5 ml-5">{section.description}</p>
              )}
            </div>
            <CheatSheetBookmarkBtn sheetName={sheet.name} sectionHeading={section.heading} sectionDescription={section.description} />
          </div>

          {section.blocks.map((block, bi) => (
            <div key={bi} className="ml-5">
              {block.title && (
                <p className="text-[11px] font-mono text-muted-foreground/80 mb-1 font-semibold">{block.title}</p>
              )}
              <div className="relative group">
                <pre
                  className="rounded-lg border border-border/20 bg-card/50 p-3 pr-12 text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap"
                  style={{ fontFamily: "'Share Tech Mono', monospace" }}
                >
                  {block.code}
                </pre>
                <CopyButton text={block.code} />
              </div>
            </div>
          ))}

          {section.tips && section.tips.length > 0 && (
            <div className="ml-5 space-y-1">
              {section.tips.map((tip, ti) => (
                <div key={ti} className="flex items-start gap-2 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2">
                  <span className="text-secondary text-xs shrink-0">💡</span>
                  <p className="text-[11px] font-mono text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CheatSheets() {
  const [activeId, setActiveId] = useState(CHEAT_SHEETS[0].id);
  const activeSheet = CHEAT_SHEETS.find((s) => s.id === activeId) || CHEAT_SHEETS[0];

  return (
    <div className="flex gap-6 h-[calc(100vh-5rem)]">
      {/* Left Sidebar */}
      <div className="w-52 shrink-0 space-y-1 overflow-y-auto pr-2 hidden md:block">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3 px-2">Cheat Sheets</p>
        {CHEAT_SHEETS.map((sheet) => {
          const isActive = activeId === sheet.id;
          return (
            <button
              key={sheet.id}
              onClick={() => setActiveId(sheet.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
              }`}
            >
              <span className="truncate text-left">{sheet.name}</span>
              <Badge variant="outline" className={`text-[8px] shrink-0 ml-1 ${DIFF_STYLES[sheet.difficulty]}`}>
                {sheet.difficulty.slice(0, 3)}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pr-1 pb-8">
        <SheetContent sheet={activeSheet} />
      </div>
    </div>
  );
}
