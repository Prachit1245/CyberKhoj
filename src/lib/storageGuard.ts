/* ── Storage Guard ──
   Wraps localStorage writes to respect Private Mode.
   Also provides storage size utilities. */

import { isPrivateMode } from "./privateMode";

/** Guard localStorage.setItem — no-op in private mode */
export function guardedSetItem(key: string, value: string): boolean {
  if (isPrivateMode()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Guard localStorage.removeItem — still allowed in private mode */
export function guardedRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

/** Calculate total localStorage size in bytes (UTF-16: 2 bytes/char) */
export function getStorageSizeBytes(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
      }
    }
  } catch { /* ignore */ }
  return total;
}

/** Format bytes to human-readable */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** All localStorage keys used by the app with descriptions */
export const STORAGE_KEYS_INFO: { key: string; label: string; description: string }[] = [
  { key: "cyberkhoj_groq_key", label: "API Key", description: "AES-encrypted Groq API key" },
  { key: "hackmind_history", label: "Analysis History", description: "Past analysis results (LZ-compressed)" },
  { key: "hackmind_findings", label: "Findings", description: "Logged vulnerability findings" },
  { key: "hackmind_stats", label: "Stats", description: "Total analyses, attack paths, domains tested" },
  { key: "hackmind_usage", label: "Usage Counter", description: "Today's API usage count" },
  { key: "hackmind_prefs", label: "Preferences", description: "App settings and toggles" },
  { key: "hackmind_bookmarks", label: "Bookmarks", description: "Saved attack paths and payloads" },
  { key: "hackmind_owasp_coverage", label: "OWASP Coverage", description: "OWASP Top 10 checklist progress" },
  { key: "hackmind_achievements", label: "Achievements", description: "Unlocked achievements list" },
  { key: "hackmind_xp", label: "XP", description: "Experience points for level system" },
  { key: "hackmind_monthly_goal", label: "Monthly Goal", description: "Dashboard monthly target" },
  { key: "hackmind_payload_favorites", label: "Payload Favorites", description: "Favorited payload indices" },
  { key: "hackmind_target_notes", label: "Target Notes", description: "Per-domain recon notes" },
  { key: "hackmind_tour_completed", label: "Onboarding Tour", description: "Whether tour has been completed" },
  { key: "hackmind_seen_version", label: "Seen Version", description: "Last seen changelog version" },
  { key: "hackmind_session_timeout", label: "Session Timeout", description: "Auto-lock timeout preference" },
  { key: "hackmind_cmd_recent", label: "Recent Commands", description: "Command palette recent searches" },
  { key: "hackmind_learning_xp", label: "Learning XP", description: "Learning path experience points" },
  { key: "hackmind_learning_skills", label: "Learning Skills", description: "Completed learning path skills" },
  { key: "hackmind_lz", label: "LZ Flag", description: "Indicates history is LZ-compressed" },
];

/** Get size of a specific key in bytes */
export function getKeySizeBytes(key: string): number {
  try {
    const val = localStorage.getItem(key);
    if (!val) return 0;
    return (key.length + val.length) * 2;
  } catch {
    return 0;
  }
}
