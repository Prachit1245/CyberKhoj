import LZString from "lz-string";
import type { AttackPath } from "@/types";

export interface SharePayload {
  target: string;
  type: string;
  date: string;
  paths: AttackPath[];
}

const MAX_URL_LENGTH = 2000;
const MAX_PATHS_FOR_SHARE = 10;

export const compressForShare = (
  data: SharePayload
): { url: string; truncated: boolean; tooLarge: boolean } => {
  let paths = data.paths;
  let truncated = false;

  // Strip user-specific state to reduce size
  const clean = (p: AttackPath) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    severity: p.severity,
    description: p.description,
    payloadExample: p.payloadExample,
    steps: p.steps,
    references: p.references,
    isBookmarked: false,
    isTested: false,
    userNotes: "",
  });

  let payload: SharePayload = {
    target: data.target,
    type: data.type,
    date: data.date,
    paths: paths.map(clean),
  };

  let json = JSON.stringify(payload);
  let compressed = LZString.compressToEncodedURIComponent(json);
  let url = `${window.location.origin}/share#${compressed}`;

  // If too long, truncate to top 10 paths by severity
  if (url.length > MAX_URL_LENGTH && paths.length > MAX_PATHS_FOR_SHARE) {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...paths].sort(
      (a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
    );
    paths = sorted.slice(0, MAX_PATHS_FOR_SHARE);
    truncated = true;

    payload = { ...payload, paths: paths.map(clean) };
    json = JSON.stringify(payload);
    compressed = LZString.compressToEncodedURIComponent(json);
    url = `${window.location.origin}/share#${compressed}`;
  }

  return {
    url,
    truncated,
    tooLarge: url.length > MAX_URL_LENGTH,
  };
};

export const decompressFromHash = (hash: string): SharePayload | null => {
  try {
    const compressed = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!compressed) return null;
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data.target || !Array.isArray(data.paths)) return null;
    return data as SharePayload;
  } catch {
    return null;
  }
};
