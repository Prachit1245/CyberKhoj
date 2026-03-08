const NOTES_KEY = "hackmind_target_notes";

export interface TargetNote {
  domain: string;
  content: string;
  updatedAt: string;
}

function readAll(): Record<string, TargetNote> {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
  } catch { return {}; }
}

function writeAll(notes: Record<string, TargetNote>) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

/** Extract domain from any target string */
export function extractDomain(target: string): string {
  try {
    // Handle URLs
    if (target.includes("://")) {
      return new URL(target).hostname;
    }
    // Handle "host:port" or plain domains
    return target.split("/")[0].split(":")[0].trim().toLowerCase();
  } catch {
    return target.trim().toLowerCase();
  }
}

export function getNote(domain: string): string {
  const all = readAll();
  return all[domain]?.content || "";
}

export function hasNote(domain: string): boolean {
  const all = readAll();
  return !!(all[domain]?.content?.trim());
}

export function saveNote(domain: string, content: string) {
  const all = readAll();
  if (!content.trim()) {
    delete all[domain];
  } else {
    all[domain] = { domain, content, updatedAt: new Date().toISOString() };
  }
  writeAll(all);
}

export function getAllNotes(): TargetNote[] {
  return Object.values(readAll()).filter((n) => n.content.trim());
}

export function exportNoteMarkdown(domain: string): string {
  const content = getNote(domain);
  if (!content) return "";
  return `## Notes: ${domain}\n\n${content}\n`;
}
