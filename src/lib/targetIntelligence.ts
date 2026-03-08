import type { TargetContext } from "./parseTarget";

/* ── Types ── */
export interface TechHint {
  name: string;
  confidence: "high" | "medium" | "low";
  indicator: string;
}

export interface ParamRisk {
  param: string;
  value: string;
  risk: "HIGH" | "MEDIUM" | "LOW";
  type: string;
  description: string;
}

export interface PatternFlag {
  label: string;
  icon: string;
  severity: "critical" | "high" | "medium" | "info";
}

export interface TargetIntelligence {
  techHints: TechHint[];
  paramRisks: ParamRisk[];
  patternFlags: PatternFlag[];
  focusAreas: string[];
}

/* ── Technology fingerprinting rules ── */
const TECH_RULES: { pattern: RegExp; name: string; indicator: string; confidence: TechHint["confidence"] }[] = [
  { pattern: /\/wp-content\/|\/wp-admin\/|\/wp-json\/|\/wp-includes\//i, name: "WordPress", indicator: "wp-content/wp-admin path", confidence: "high" },
  { pattern: /\/api\/v\d+\//i, name: "REST API (versioned)", indicator: "Versioned API path", confidence: "high" },
  { pattern: /\/graphql/i, name: "GraphQL", indicator: "/graphql endpoint", confidence: "high" },
  { pattern: /\/node_modules\/|\/next\//i, name: "Node.js / Next.js", indicator: "Node.js path pattern", confidence: "medium" },
  { pattern: /\.aspx|\.ashx|\.asmx/i, name: "ASP.NET", indicator: ".aspx file extension", confidence: "high" },
  { pattern: /\.php/i, name: "PHP", indicator: ".php file extension", confidence: "high" },
  { pattern: /\.jsp|\.jspa/i, name: "Java / JSP", indicator: ".jsp file extension", confidence: "high" },
  { pattern: /\/rails\/|\.rb/i, name: "Ruby on Rails", indicator: "Rails path pattern", confidence: "medium" },
  { pattern: /\/django\/|\/admin\/login/i, name: "Django (Python)", indicator: "Django admin path", confidence: "medium" },
  { pattern: /\/laravel|\/storage\/app/i, name: "Laravel (PHP)", indicator: "Laravel path pattern", confidence: "medium" },
  { pattern: /\/actuator\/|\/swagger|\/api-docs/i, name: "Spring Boot (Java)", indicator: "Actuator/Swagger endpoint", confidence: "high" },
  { pattern: /\/strapi\/|\/cms\//i, name: "Headless CMS", indicator: "CMS path pattern", confidence: "low" },
  { pattern: /\/static\/|\/assets\/|\/dist\//i, name: "Static asset pipeline", indicator: "Build output path", confidence: "low" },
  { pattern: /cloudflare|cdn-cgi/i, name: "Cloudflare CDN", indicator: "cdn-cgi path", confidence: "high" },
  { pattern: /\.json$/i, name: "JSON endpoint", indicator: ".json extension", confidence: "medium" },
  { pattern: /\/socket\.io|\/ws\//i, name: "WebSocket", indicator: "WebSocket path", confidence: "high" },
  { pattern: /\/oauth|\/authorize|\/token/i, name: "OAuth / SSO", indicator: "OAuth endpoint", confidence: "medium" },
];

/* ── Parameter risk rules ── */
const assessParamRisk = (key: string, value: string): Pick<ParamRisk, "risk" | "type" | "description"> | null => {
  const k = key.toLowerCase();
  const v = value.toLowerCase();

  // Numeric IDs → IDOR
  if (/^\d+$/.test(value) && /id|user|account|order|item|profile|doc/i.test(key))
    return { risk: "HIGH", type: "IDOR", description: "Sequential numeric ID — likely vulnerable to Insecure Direct Object Reference" };
  if (/^\d+$/.test(value))
    return { risk: "MEDIUM", type: "IDOR", description: "Numeric value that may reference internal objects" };

  // File params → LFI
  if (/file|path|page|template|include|doc|load|read|fetch|src/i.test(key))
    return { risk: "HIGH", type: "LFI / Path Traversal", description: "Parameter name suggests file operations — test for path traversal" };

  // URL params → SSRF / Open Redirect
  if (/url|uri|link|redirect|next|return|continue|goto|dest|callback/i.test(key))
    return { risk: "HIGH", type: "SSRF / Open Redirect", description: "URL parameter — test for SSRF and open redirect" };
  if (/^https?:\/\//i.test(value))
    return { risk: "HIGH", type: "SSRF / Open Redirect", description: "Value is a URL — prime target for SSRF" };

  // Search / query → XSS / SQLi
  if (/query|search|q|keyword|term|filter|sort|order/i.test(key))
    return { risk: "MEDIUM", type: "XSS / SQLi", description: "Search/filter parameter — test for injection" };

  // Command-like params
  if (/cmd|exec|command|run|shell|ping|action/i.test(key))
    return { risk: "HIGH", type: "Command Injection", description: "Parameter name suggests command execution" };

  // Email
  if (/email|mail/i.test(key))
    return { risk: "LOW", type: "Email Injection", description: "Email parameter — test for header injection" };

  // Token / key
  if (/token|key|secret|api_key|apikey|auth|session/i.test(key))
    return { risk: "MEDIUM", type: "Info Disclosure", description: "Sensitive token exposed in URL — information disclosure risk" };

  // Debug / verbose flags
  if (/debug|verbose|test|dev|trace/i.test(key))
    return { risk: "MEDIUM", type: "Info Disclosure", description: "Debug parameter — may expose stack traces or internal data" };

  return null;
};

/* ── Pattern flags ── */
const detectPatterns = (ctx: TargetContext): PatternFlag[] => {
  const flags: PatternFlag[] = [];
  const full = `${ctx.path} ${Object.keys(ctx.queryParams).join(" ")} ${Object.values(ctx.queryParams).join(" ")}`.toLowerCase();

  if (/admin|administrator|manage|dashboard/i.test(ctx.path))
    flags.push({ label: "Admin path detected", icon: "🔐", severity: "critical" });

  if (/token|api_key|secret|password|passwd|pwd/i.test(full))
    flags.push({ label: "Sensitive data in URL", icon: "⚠️", severity: "critical" });

  if (ctx.jwtTokens.length > 0)
    flags.push({ label: `${ctx.jwtTokens.length} JWT token(s) found`, icon: "🔑", severity: "high" });

  if (Object.keys(ctx.queryParams).length > 5)
    flags.push({ label: `${Object.keys(ctx.queryParams).length} parameters — large attack surface`, icon: "🎯", severity: "high" });

  if (/upload|import|attach/i.test(full))
    flags.push({ label: "File upload functionality", icon: "📁", severity: "high" });

  if (/delete|remove|destroy|drop/i.test(full))
    flags.push({ label: "Destructive operation in path", icon: "💥", severity: "high" });

  if (/internal|private|staging|dev\.|localhost/i.test(ctx.domain))
    flags.push({ label: "Non-production environment", icon: "🔬", severity: "medium" });

  if (/callback|webhook|notify/i.test(full))
    flags.push({ label: "Callback/webhook endpoint", icon: "🔗", severity: "medium" });

  if (ctx.port && !["80", "443", ""].includes(ctx.port))
    flags.push({ label: `Non-standard port: ${ctx.port}`, icon: "🌐", severity: "info" });

  if (Object.keys(ctx.authHeaders).length > 0)
    flags.push({ label: `Auth headers: ${Object.keys(ctx.authHeaders).join(", ")}`, icon: "🛡️", severity: "info" });

  if (ctx.httpMethod && !["GET", ""].includes(ctx.httpMethod))
    flags.push({ label: `${ctx.httpMethod} method — state-changing request`, icon: "⚡", severity: "medium" });

  return flags;
};

/* ── Focus area recommendations ── */
const recommendFocus = (intel: Pick<TargetIntelligence, "techHints" | "paramRisks" | "patternFlags">): string[] => {
  const areas: string[] = [];
  const riskTypes = new Set(intel.paramRisks.map((r) => r.type));
  const techs = new Set(intel.techHints.map((t) => t.name));
  const hasCritical = intel.patternFlags.some((f) => f.severity === "critical");

  if (riskTypes.has("IDOR")) areas.push("Test all numeric IDs for IDOR — increment/decrement values and compare responses");
  if (riskTypes.has("LFI / Path Traversal")) areas.push("Attempt path traversal with ../../etc/passwd and Windows equivalents");
  if (riskTypes.has("SSRF / Open Redirect")) areas.push("Replace URL values with internal IPs (127.0.0.1, 169.254.169.254) and Burp Collaborator");
  if (riskTypes.has("Command Injection")) areas.push("Inject OS command separators (; | && `) into suspected command parameters");
  if (riskTypes.has("XSS / SQLi")) areas.push("Fuzz search/filter params with XSS polyglots and SQLi payloads");

  if (techs.has("WordPress")) areas.push("Enumerate plugins with /wp-json/wp/v2/ and test xmlrpc.php for brute force");
  if (techs.has("GraphQL")) areas.push("Run introspection query and test for authorization bypass on mutations");
  if (techs.has("Spring Boot (Java)")) areas.push("Check /actuator/env and /actuator/heapdump for exposed configs");
  if (techs.has("Django (Python)")) areas.push("Test DEBUG mode disclosure and admin panel brute force");

  if (hasCritical) areas.push("Prioritize critical flags — admin paths and sensitive data in URLs are high-value targets");

  if (areas.length === 0) areas.push("Start with parameter fuzzing and error-based information gathering");

  return areas.slice(0, 6);
};

/* ── Public API ── */
export const analyzeTarget = (ctx: TargetContext): TargetIntelligence | null => {
  if (!ctx.domain && !ctx.path && Object.keys(ctx.queryParams).length === 0) return null;

  const techHints: TechHint[] = [];
  const fullInput = `${ctx.raw} ${ctx.path}`;
  for (const rule of TECH_RULES) {
    if (rule.pattern.test(fullInput)) {
      techHints.push({ name: rule.name, confidence: rule.confidence, indicator: rule.indicator });
    }
  }

  const paramRisks: ParamRisk[] = [];
  for (const [key, value] of Object.entries(ctx.queryParams)) {
    const risk = assessParamRisk(key, value);
    if (risk) paramRisks.push({ param: key, value, ...risk });
  }

  const patternFlags = detectPatterns(ctx);
  const focusAreas = recommendFocus({ techHints, paramRisks, patternFlags });

  // Only show if there's meaningful intel
  if (techHints.length === 0 && paramRisks.length === 0 && patternFlags.length === 0) return null;

  return { techHints, paramRisks, patternFlags, focusAreas };
};
