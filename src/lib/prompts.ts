import { type TargetContext, contextToPromptBlock } from "./parseTarget";
import type { AttackPath, AnalysisDepth } from "@/types";

export type { AttackPath, AnalysisDepth };

/* ─── Shared negative constraints ─── */
const NEGATIVE_CONSTRAINTS = `
STRICT RULES:
- Do NOT repeat attack paths. Every path must be unique.
- Do NOT give generic security advice. Every path must be specific to the provided target's URL, parameters, headers, and technology.
- Do NOT include introductions, conclusions, or explanatory text outside the JSON.
- Do NOT wrap the response in markdown code fences.
- Start your response with [ or {.`;

const JSON_INSTRUCTION = `Return ONLY valid JSON with no markdown formatting, no code blocks, no explanation text. Start your response with [ or {.`;

/* ─── Depth config ─── */
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
    instruction: "Return exactly 50 attack paths. Be exhaustive: cover every possible attack vector, bypass technique, business logic flaw, race condition, and chained exploit.",
  },
};

export const buildAnalysisPrompt = (
  target: string,
  context: TargetContext,
  depth: AnalysisDepth,
  beginnerMode = false
): { system: string; user: string } => {
  const cfg = DEPTH_CONFIG[depth];
  const contextBlock = contextToPromptBlock(context);

  const beginnerSystemNote = beginnerMode
    ? `\nBEGINNER MODE is enabled. Explain each attack path in simple language that a beginner can understand. Include a "beginnerExplanation" field in each object.`
    : "";

  const system = `You are an elite bug bounty hunter and penetration tester with deep expertise in web application security. Analyze the given target and generate specific, actionable attack paths.
${beginnerSystemNote}

${JSON_INSTRUCTION}

${NEGATIVE_CONSTRAINTS}`;

  const beginnerField = beginnerMode
    ? `\n    "beginnerExplanation": "In simple terms: this means an attacker could see other people's private information just by changing a number in the web address. Imagine if changing your apartment number on a mail label let you read someone else's mail."`
    : "";

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
    "description": "The id parameter appears to be a sequential numeric identifier that can be manipulated to access other users' data without authorization checks.",
    "payloadExample": "GET /api/user?id=46\\nGET /api/user?id=1",
    "steps": [
      "Capture the original request in Burp Suite",
      "Change id=45 to id=46",
      "Compare responses for data leakage"
    ],
    "references": [
      "https://owasp.org/www-project-web-security-testing-guide/"
    ]${beginnerField}
  }
]

Severity MUST be one of: "Critical", "High", "Medium", "Low".
${JSON_INSTRUCTION}`;

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

/** Strip all markdown code fences from AI responses */
const stripAllFences = (text: string): string =>
  text.replace(/```(?:json)?\s*/gi, "").trim();

const extractJsonArray = (text: string): unknown[] | null => {
  const cleaned = stripAllFences(text);

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    for (const key of ["paths", "attack_paths", "results", "attackPaths", "data"]) {
      if (parsed[key] && Array.isArray(parsed[key])) return parsed[key];
    }
  } catch { /* continue */ }

  // Extract first JSON array from text
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
    if (import.meta.env.DEV) console.error("[parseAnalysisResponse] Empty response from AI");
    return [sanitizePath({ title: "Analysis returned empty response", severity: "Info", description: "The AI returned an empty response. Try again or adjust your target." }, 0)];
  }

  const arr = extractJsonArray(raw);

  if (!arr || arr.length === 0) {
    if (import.meta.env.DEV) console.error("[parseAnalysisResponse] Failed to parse JSON from response");
    return [sanitizePath({
      title: "Parse Error — Raw Response Available",
      severity: "Info",
      category: "Error",
      description: `Could not parse structured attack paths. Raw AI response:\n\n${raw.slice(0, 2000)}`,
    }, 0)];
  }

  return arr.map((item, i) => {
    if (typeof item !== "object" || item === null) {
      return sanitizePath({ title: `Invalid item ${i + 1}` }, i);
    }
    return sanitizePath(item as Record<string, unknown>, i);
  });
};

/* ── Attack Mode prompt ── */

export interface AttackIdea {
  id: number;
  idea: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  priority: "high" | "medium" | "low";
}

export const buildAttackModePrompt = (domain: string, context?: string): string => {
  return `You are a world-class bug bounty hunter with 10+ years of experience. Generate exactly 100 specific, unique, actionable security test ideas for the target: "${domain}"${context ? ` (context: ${context})` : ""}.

Cover ALL of these categories comprehensively:
- Authentication & session management
- SQL injection, NoSQL injection, command injection
- Cross-site scripting (stored, reflected, DOM)
- Business logic flaws
- Access control & IDOR
- API security (REST, GraphQL)
- Client-side attacks (CSRF, clickjacking, open redirects)
- Infrastructure (misconfigs, exposed services, default creds)
- File upload & path traversal
- Server-side request forgery (SSRF)
- Race conditions & concurrency
- Information disclosure
- Advanced techniques (deserialization, prototype pollution, cache poisoning, HTTP smuggling)

${NEGATIVE_CONSTRAINTS}

Each idea must be specific and immediately actionable for "${domain}" — not generic advice that could apply to any website.

Return ONLY a JSON array of exactly 100 objects with this exact schema:
[
  {
    "id": 1,
    "idea": "Test /api/v1/users/{id} endpoint for IDOR by iterating numeric IDs",
    "category": "IDOR",
    "difficulty": "beginner",
    "priority": "high"
  }
]

Difficulty must be one of: "beginner", "intermediate", "advanced".
Priority must be one of: "high", "medium", "low".

${JSON_INSTRUCTION}`;
};

export const parseAttackIdeas = (raw: string): AttackIdea[] => {
  const cleaned = stripAllFences(raw);
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Could not parse attack ideas from AI response");
  let parsed: AttackIdea[];
  try {
    parsed = JSON.parse(match[0]) as AttackIdea[];
  } catch (e) {
    console.error("[parseAttackIdeas] JSON.parse failed:", e, "\nRaw excerpt:", match[0].slice(0, 300));
    throw new Error("AI returned malformed JSON. Please try again.");
  }
  return parsed.map((item, i) => ({
    id: item.id ?? i + 1,
    idea: String(item.idea || ""),
    category: String(item.category || "Other"),
    difficulty: (["beginner", "intermediate", "advanced"].includes(item.difficulty) ? item.difficulty : "intermediate") as AttackIdea["difficulty"],
    priority: (["high", "medium", "low"].includes(item.priority) ? item.priority : "medium") as AttackIdea["priority"],
  }));
};

/* ── Mind Map prompt ── */

export interface MindMapNode {
  id: string;
  label: string;
  type: "root" | "category" | "attack";
  parentId: string | null;
  severity: "critical" | "high" | "medium" | "low" | null;
  description: string;
  attackIdeas: string[];
}

export const buildMindMapPrompt = (domain: string): string => {
  return `You are a senior penetration tester. Generate a security attack surface mind map for "${domain}".

${NEGATIVE_CONSTRAINTS}

Return ONLY a JSON object with this exact schema:
{
  "nodes": [
    {
      "id": "root",
      "label": "${domain}",
      "type": "root",
      "parentId": null,
      "severity": null,
      "description": "Target domain",
      "attackIdeas": []
    },
    {
      "id": "cat-auth",
      "label": "Authentication",
      "type": "category",
      "parentId": "root",
      "severity": null,
      "description": "Authentication & session management attack surface",
      "attackIdeas": []
    },
    {
      "id": "attack-auth-1",
      "label": "Brute Force Login",
      "type": "attack",
      "parentId": "cat-auth",
      "severity": "high",
      "description": "Test for rate limiting on login endpoint",
      "attackIdeas": ["Try credential stuffing with leaked databases", "Test account lockout policy bypass"]
    }
  ]
}

All attack ideas must be specific to "${domain}", not generic.
Categories MUST include: Authentication, API, Admin, FileUpload, UserProfile, Search, Payment, Integrations.
Each category must have 4-6 specific attack child nodes with severity ratings and 2-3 attackIdeas each.
Type must be one of: "root", "category", "attack".
Severity for attack nodes must be one of: "critical", "high", "medium", "low".

${JSON_INSTRUCTION}`;
};

export const parseMindMapNodes = (raw: string): MindMapNode[] => {
  const cleaned = stripAllFences(raw);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse mind map from AI response");
  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    console.error("[parseMindMapNodes] JSON.parse failed:", e, "\nRaw excerpt:", match[0].slice(0, 300));
    throw new Error("AI returned malformed JSON. Please try again.");
  }
  const nodes: MindMapNode[] = parsed.nodes || [];
  return nodes.map((n) => ({
    id: String(n.id || ""),
    label: String(n.label || ""),
    type: (["root", "category", "attack"].includes(n.type) ? n.type : "attack") as MindMapNode["type"],
    parentId: n.parentId ?? null,
    severity: n.severity ?? null,
    description: String(n.description || ""),
    attackIdeas: Array.isArray(n.attackIdeas) ? n.attackIdeas.map(String) : [],
  }));
};
