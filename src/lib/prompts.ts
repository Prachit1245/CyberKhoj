import { type TargetContext, contextToPromptBlock } from "./parseTarget";

export type AnalysisDepth = "quick" | "standard" | "deep";

export interface AttackPath {
  id: number;
  title: string;
  category: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  description: string;
  payloadExample: string;
  steps: string[];
  references: string[];
}

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

export const parseAnalysisResponse = (raw: string): AttackPath[] => {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed as AttackPath[];
    if (parsed.paths && Array.isArray(parsed.paths)) return parsed.paths;
    if (parsed.attack_paths && Array.isArray(parsed.attack_paths)) return parsed.attack_paths;
    return [];
  } catch {
    // Try to extract JSON array from the response
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as AttackPath[];
      } catch {
        return [];
      }
    }
    return [];
  }
};
