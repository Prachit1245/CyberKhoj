import type { AttackPath, AnalysisResult } from "@/types";
import { Copy, FileJson, FileText, Printer, Download } from "lucide-react";
import { toast } from "@/components/Toast";

function pathsToMarkdown(paths: AttackPath[], input?: string): string {
  const lines: string[] = [];
  lines.push(`# CyberKhoj Analysis Report`);
  if (input) lines.push(`\n**Target:** \`${input}\`\n`);
  lines.push(`**Date:** ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`**Total Paths:** ${paths.length}\n`);
  lines.push("---\n");

  paths.forEach((p, i) => {
    lines.push(`## ${i + 1}. ${p.title}`);
    lines.push(`**Severity:** ${p.severity.toUpperCase()} | **Category:** ${p.category}\n`);
    lines.push(p.description + "\n");
    if (p.payloadExample) {
      lines.push("### Payload Example\n");
      lines.push("```");
      lines.push(p.payloadExample);
      lines.push("```\n");
    }
    if (p.steps.length) {
      lines.push("### Steps to Test\n");
      p.steps.forEach((s, j) => lines.push(`${j + 1}. ${s}`));
      lines.push("");
    }
    if (p.references.length) {
      lines.push("### References\n");
      p.references.forEach((r) => lines.push(`- ${r}`));
      lines.push("");
    }
    if (p.userNotes) lines.push(`> **Notes:** ${p.userNotes}\n`);
    lines.push("---\n");
  });

  return lines.join("\n");
}

function domainFromInput(input: string): string {
  try {
    return new URL(input).hostname.replace(/\./g, "-");
  } catch {
    return input.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30) || "target";
  }
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  paths: AttackPath[];
  input?: string;
}

export default function ExportBar({ paths, input }: Props) {
  if (!paths.length) return null;

  const date = new Date().toISOString().slice(0, 10);
  const domain = domainFromInput(input || "");

  const copyMd = () => {
    navigator.clipboard.writeText(pathsToMarkdown(paths, input));
    toast.success("Markdown copied ✓");
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(paths, null, 2));
    toast.success("JSON copied ✓");
  };

  const dlMd = () => {
    downloadFile(pathsToMarkdown(paths, input), `cyberkhoj-${domain}-${date}.md`, "text/markdown");
    toast.success("Markdown downloaded ✓");
  };

  const dlJson = () => {
    downloadFile(JSON.stringify(paths, null, 2), `hackmind-${domain}-${date}.json`, "application/json");
    toast.success("JSON downloaded ✓");
  };

  const print = () => window.print();

  const btn = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-border/30 bg-card/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors cursor-pointer";

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={copyMd} className={btn}><Copy className="h-3.5 w-3.5" />Copy Markdown</button>
      <button onClick={copyJson} className={btn}><FileJson className="h-3.5 w-3.5" />Copy JSON</button>
      <button onClick={dlMd} className={btn}><Download className="h-3.5 w-3.5" />Download .md</button>
      <button onClick={dlJson} className={btn}><FileText className="h-3.5 w-3.5" />Download .json</button>
      <button onClick={print} className={btn}><Printer className="h-3.5 w-3.5" />Print Report</button>
    </div>
  );
}
