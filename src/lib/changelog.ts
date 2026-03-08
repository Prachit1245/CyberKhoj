/* ── Changelog Data ── */

export const APP_VERSION = "1.0.0";

export type ChangeType = "new" | "fix" | "improve";

export interface ChangeEntry {
  type: ChangeType;
  text: string;
}

export interface VersionEntry {
  version: string;
  date: string; // ISO date
  changes: ChangeEntry[];
}

export const CHANGELOG: VersionEntry[] = [
  {
    version: "1.0.0",
    date: "2026-03-08",
    changes: [
      { type: "new", text: "AI-powered vulnerability analysis using Groq API" },
      { type: "new", text: "Attack Mode for raw HTTP request analysis" },
      { type: "new", text: "Mind Map visualization for domain reconnaissance" },
      { type: "new", text: "JWT token analyzer and decoder" },
      { type: "new", text: "Batch analysis for multiple targets" },
      { type: "new", text: "Payload Library with 200+ categorized payloads" },
      { type: "new", text: "Custom payloads — add, edit, delete, import/export JSON" },
      { type: "new", text: "Shareable payload links with URL encoding" },
      { type: "new", text: "WAF bypass suggestions for detected firewalls" },
      { type: "new", text: "Target Intelligence panel with tech stack detection" },
      { type: "new", text: "Recon Checklist generator for reconnaissance tasks" },
      { type: "new", text: "Target Notes system — persistent markdown notes per domain" },
      { type: "new", text: "Shareable analysis results via encoded URL hash" },
      { type: "new", text: "Learning Path with XP system and skill checklists" },
      { type: "new", text: "Achievement system with 15 unlockable badges" },
      { type: "new", text: "History page with compare feature for side-by-side analysis" },
      { type: "new", text: "Findings log for tracking discovered vulnerabilities" },
      { type: "new", text: "Bookmarks for saving interesting attack paths" },
      { type: "new", text: "OWASP Top 10 reference guide" },
      { type: "new", text: "Cheat sheets for common vulnerability categories" },
      { type: "new", text: "Export analysis results as Markdown reports" },
      { type: "new", text: "Bug Bounty monthly goals with progress tracking" },
      { type: "new", text: "Dashboard with severity charts and statistics" },
      { type: "new", text: "PWA support — installable on mobile and desktop" },
      { type: "new", text: "Dark theme with matrix-inspired design" },
      { type: "new", text: "Keyboard shortcuts (Ctrl+K command palette)" },
      { type: "new", text: "LZ-string compression for large localStorage data" },
      { type: "improve", text: "Responsive design for mobile devices" },
      { type: "improve", text: "Debounced search for better performance" },
      { type: "improve", text: "Virtual list rendering for large datasets" },
    ],
  },
];

/* ── Version check for "What's New" modal ── */
const SEEN_VERSION_KEY = "hackmind_seen_version";

export function getSeenVersion(): string | null {
  return localStorage.getItem(SEEN_VERSION_KEY);
}

export function setSeenVersion(version: string): void {
  localStorage.setItem(SEEN_VERSION_KEY, version);
}

export function hasNewVersion(): boolean {
  const seen = getSeenVersion();
  return seen !== APP_VERSION;
}

export function getLatestChanges(): VersionEntry | null {
  return CHANGELOG[0] || null;
}
