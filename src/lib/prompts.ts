import { type TargetContext, contextToPromptBlock } from "./parseTarget";
import type { AttackPath, AnalysisDepth } from "@/types";

export type { AttackPath, AnalysisDepth };

const DEPTH_CONFIG: Record<AnalysisDepth, { count: number; instruction: string }> = {
  quick: {
    count: 10,
    instruction: "Return exactly 10 attack paths focusing on the most critical and likely vulnerabilities.",
  },
  standard: {
    count: 25,
    instruction: "Return exactly 25 attack paths covering all major vulnerability categories including edge cases and chained attacks.",
  },
  deep: {
    count: 50,
    instruction: "Return exactly 50 attack paths. Be exhaustive: cover every possible attack vector, bypass technique, business logic flaw, race condition, and chained exploit. Leave nothing out.",
  },
};

export const buildAnalysisPrompt = (
  target: string,
  context: TargetContext,
  depth: AnalysisDepth
): { system: string; user: string } => {
  const cfg = DEPTH_CONFIG[depth];
  const contextBlock = contextToPromptBlock(context);

  const system = `You are an elite bug bounty hunter and penetration tester with deep expertise in web application security. Analyze the given target and generate specific, actionable attack paths. Return ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON array.`;

  const user = `Analyze this target for security vulnerabilities and generate ${cfg.count} attack paths.

**Target:**
\`\`\`
${target}
\`\`\`

${contextBlock}

${cfg.instruction}

**Categories to consider:** IDOR, XSS (Reflected/Stored/DOM), SQLi, SSRF, CSRF, Open Redirect, Path Traversal, Authentication Bypass, Authorization Flaws, Business Logic, Race Conditions, Information Disclosure, Command Injection, File Upload, JWT Attacks, GraphQL Abuse, API Abuse, CORS Misconfiguration, HTTP Request Smuggling, Cache Poisoning, Prototype Pollution, Deserialization, SSTI.

**Required JSON schema — return a JSON array of objects with this exact shape:**
[
  {
    "id": 1,
    "title": "IDOR via user ID parameter",
    "category": "IDOR",
    "severity": "Critical",
    "description": "The id parameter appears to be a sequential numeric identifier...",
    "payloadExample": "GET /api/user?id=46",
    "steps": [
      "Capture the original request in Burp Suite",
      "Change id=45 to id=46",
      "Compare responses for data leakage"
    ],
    "references": [
      "https://owasp.org/www-project-web-security-testing-guide/"
    ]
  }
]

Return ONLY the JSON array. No additional text.`;

  return { system, user };
};

const VALID_SEVERITIES = ["critical", "high", "medium", "low"] as const;

const normalizeSeverity = (val: unknown): AttackPath["severity"] => {
  if (typeof val !== "string") return "medium";
  const lower = val.toLowerCase();
  if (VALID_SEVERITIES.includes(lower as typeof VALID_SEVERITIES[number])) return lower as AttackPath["severity"];
  return "medium";
};

const sanitizePath = (item: Record<string, unknown>, index: number): AttackPath => ({
  id: typeof item.id === "number" ? item.id : index + 1,
  title: typeof item.title === "string" && item.title ? item.title : `Attack Path ${index + 1}`,
  category: typeof item.category === "string" && item.category ? item.category : "Other",
  severity: normalizeSeverity(item.severity),
  description: typeof item.description === "string" && item.description ? item.description : "No description provided.",
  payloadExample: typeof item.payloadExample === "string" ? item.payloadExample : "",
  steps: Array.isArray(item.steps) ? item.steps.map(String) : [],
  references: Array.isArray(item.references) ? item.references.map(String) : [],
  isBookmarked: false,
  isTested: false,
  userNotes: "",
});

const extractJsonArray = (text: string): unknown[] | null => {
  // 1. Strip markdown code fences
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "");

  // 2. Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    // Handle wrapped objects
    for (const key of ["paths", "attack_paths", "results", "attackPaths", "data"]) {
      if (parsed[key] && Array.isArray(parsed[key])) return parsed[key];
    }
  } catch { /* continue */ }

  // 3. Extract first JSON array from text
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch { /* continue */ }
  }

  return null;
};

export const parseAnalysisResponse = (raw: string): AttackPath[] => {
  if (!raw || !raw.trim()) {
    console.error("[parseAnalysisResponse] Empty response from Gemini");
    return [sanitizePath({ title: "Analysis returned empty response", severity: "Info", description: "The AI returned an empty response. Try again or adjust your target." }, 0)];
  }

  const arr = extractJsonArray(raw);

  if (!arr || arr.length === 0) {
    console.error("[parseAnalysisResponse] Failed to parse JSON from response:", raw.slice(0, 200));
    return [sanitizePath({
      title: "Parse Error — Raw Response Available",
      severity: "Info",
      category: "Error",
      description: `Could not parse structured attack paths. Raw AI response:\n\n${raw.slice(0, 2000)}`,
    }, 0)];
  }

  const results = arr.map((item, i) => {
    if (typeof item !== "object" || item === null) {
      console.warn(`[parseAnalysisResponse] Item ${i} is not an object, skipping`);
      return sanitizePath({ title: `Invalid item ${i + 1}` }, i);
    }
    return sanitizePath(item as Record<string, unknown>, i);
  });

  return results;
};
