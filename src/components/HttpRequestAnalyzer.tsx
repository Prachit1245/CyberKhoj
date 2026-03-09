import { useState } from "react";
import { INPUT_LIMITS, enforceLimit } from "@/lib/sanitize";
import { ArrowRight, Loader2, Copy, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { callGemini } from "@/lib/ai";
import { addToHistory, incrementStat } from "@/lib/store";

interface ParsedHeader {
  name: string;
  value: string;
  isInteresting: boolean;
  reason?: string;
}

interface ParsedCookie {
  name: string;
  value: string;
  isInteresting: boolean;
  reason?: string;
}

interface ParsedParam {
  key: string;
  value: string;
  isInteresting: boolean;
  reason?: string;
}

interface ParsedRequest {
  method: string;
  path: string;
  httpVersion: string;
  host: string;
  fullUrl: string;
  headers: ParsedHeader[];
  cookies: ParsedCookie[];
  queryParams: ParsedParam[];
  bodyParams: ParsedParam[];
  body: string;
  authTokens: { type: string; value: string }[];
}

const INTERESTING_HEADERS = [
  "authorization", "cookie", "x-api-key", "x-auth-token", "x-csrf-token",
  "x-forwarded-for", "x-forwarded-host", "x-original-url", "x-rewrite-url",
  "referer", "origin", "x-custom-ip-authorization", "x-real-ip",
  "content-type", "x-requested-with", "x-api-secret", "x-access-token",
];

const SESSION_COOKIE_PATTERNS = [
  "session", "sess", "sid", "token", "auth", "jwt", "csrf", "xsrf",
  "phpsessid", "jsessionid", "asp.net_sessionid", "connect.sid",
];

const parseRawRequest = (raw: string): ParsedRequest | null => {
  const lines = raw.split("\n").map((l) => l.replace(/\r$/, ""));
  if (lines.length === 0) return null;

  // Parse request line
  const requestLine = lines[0];
  const rlMatch = requestLine.match(/^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|TRACE|CONNECT)\s+(\S+)\s*(HTTP\/[\d.]+)?/i);
  if (!rlMatch) return null;

  const method = rlMatch[1].toUpperCase();
  const path = rlMatch[2];
  const httpVersion = rlMatch[3] || "HTTP/1.1";

  // Separate headers and body
  let headerEnd = lines.length;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "") { headerEnd = i; break; }
  }

  const headerLines = lines.slice(1, headerEnd);
  const bodyLines = lines.slice(headerEnd + 1);
  const body = bodyLines.join("\n").trim();

  // Parse headers
  const headers: ParsedHeader[] = [];
  let host = "";
  const authTokens: { type: string; value: string }[] = [];

  for (const line of headerLines) {
    const hMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!hMatch) continue;
    const name = hMatch[1];
    const value = hMatch[2];
    const nameLower = name.toLowerCase();

    const isInteresting = INTERESTING_HEADERS.includes(nameLower);
    let reason: string | undefined;
    if (nameLower === "authorization") reason = "Auth token — test for bypass";
    else if (nameLower === "x-forwarded-for" || nameLower === "x-real-ip") reason = "IP spoofing vector";
    else if (nameLower === "x-original-url" || nameLower === "x-rewrite-url") reason = "Path override — access control bypass";
    else if (nameLower === "x-api-key" || nameLower === "x-api-secret") reason = "API key — test rotation/leakage";
    else if (nameLower === "cookie") reason = "Session tokens — test fixation/hijacking";

    headers.push({ name, value, isInteresting, reason });

    if (nameLower === "host") host = value;

    // Extract auth tokens
    if (nameLower === "authorization") {
      if (value.toLowerCase().startsWith("bearer ")) {
        authTokens.push({ type: "Bearer", value: value.slice(7) });
      } else if (value.toLowerCase().startsWith("basic ")) {
        authTokens.push({ type: "Basic", value: value.slice(6) });
      } else {
        authTokens.push({ type: "Custom", value });
      }
    }
    if (nameLower === "x-api-key" || nameLower === "x-auth-token" || nameLower === "x-access-token") {
      authTokens.push({ type: name, value });
    }
  }

  // Parse cookies
  const cookies: ParsedCookie[] = [];
  const cookieHeader = headers.find((h) => h.name.toLowerCase() === "cookie");
  if (cookieHeader) {
    const pairs = cookieHeader.value.split(";").map((s) => s.trim());
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const cName = pair.slice(0, eqIdx).trim();
      const cValue = pair.slice(eqIdx + 1).trim();
      const isInteresting = SESSION_COOKIE_PATTERNS.some((p) => cName.toLowerCase().includes(p));
      cookies.push({
        name: cName,
        value: cValue,
        isInteresting,
        reason: isInteresting ? "Session/auth cookie — test manipulation" : undefined,
      });
    }
  }

  // Parse query params
  const queryParams: ParsedParam[] = [];
  const qIdx = path.indexOf("?");
  if (qIdx !== -1) {
    const qs = path.slice(qIdx + 1);
    const pairs = qs.split("&");
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const key = decodeURIComponent(pair.slice(0, eqIdx));
      const value = decodeURIComponent(pair.slice(eqIdx + 1));
      const isNumeric = /^\d+$/.test(value);
      const isFilePath = /[\/\\]/.test(value) || /\.\w{1,5}$/.test(value);
      const isInteresting = isNumeric || isFilePath || ["id", "user_id", "uid", "file", "path", "url", "redirect", "next", "callback", "page"].includes(key.toLowerCase());
      let reason: string | undefined;
      if (isNumeric) reason = "Numeric ID — IDOR candidate";
      else if (isFilePath) reason = "File path — LFI/path traversal";
      else if (["redirect", "next", "callback", "url"].includes(key.toLowerCase())) reason = "Redirect param — open redirect";
      queryParams.push({ key, value, isInteresting, reason });
    }
  }

  // Parse body params (form-urlencoded)
  const bodyParams: ParsedParam[] = [];
  const contentType = headers.find((h) => h.name.toLowerCase() === "content-type");
  if (body && contentType?.value.includes("application/x-www-form-urlencoded")) {
    const pairs = body.split("&");
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const key = decodeURIComponent(pair.slice(0, eqIdx));
      const value = decodeURIComponent(pair.slice(eqIdx + 1));
      const isNumeric = /^\d+$/.test(value);
      const isInteresting = isNumeric || ["id", "user_id", "password", "token", "csrf", "email", "role", "admin"].includes(key.toLowerCase());
      bodyParams.push({
        key, value, isInteresting,
        reason: isNumeric ? "Numeric ID — IDOR candidate" : isInteresting ? "Sensitive parameter" : undefined,
      });
    }
  }

  const protocol = "https";
  const cleanPath = qIdx !== -1 ? path.slice(0, qIdx) : path;
  const fullUrl = `${protocol}://${host}${cleanPath}`;

  return { method, path, httpVersion, host, fullUrl, headers, cookies, queryParams, bodyParams, body, authTokens };
};

const buildHttpPrompt = (parsed: ParsedRequest): string => {
  const interestingHeaders = parsed.headers.filter((h) => h.isInteresting);
  const interestingCookies = parsed.cookies.filter((c) => c.isInteresting);
  const interestingParams = [...parsed.queryParams, ...parsed.bodyParams].filter((p) => p.isInteresting);

  return `You are an elite penetration tester analyzing a raw HTTP request intercepted from Burp Suite.

## Request Details
- **Method**: ${parsed.method}
- **URL**: ${parsed.fullUrl}
- **Path**: ${parsed.path}
- **HTTP Version**: ${parsed.httpVersion}

## Headers (${parsed.headers.length} total)
${parsed.headers.map((h) => `- ${h.name}: ${h.value}${h.isInteresting ? " ⚠️ INTERESTING" : ""}`).join("\n")}

## Cookies (${parsed.cookies.length} total)
${parsed.cookies.map((c) => `- ${c.name}=${c.value}${c.isInteresting ? " ⚠️ SESSION/AUTH" : ""}`).join("\n") || "None"}

## Query Parameters
${parsed.queryParams.map((p) => `- ${p.key}=${p.value}${p.isInteresting ? ` ⚠️ ${p.reason}` : ""}`).join("\n") || "None"}

## Body
${parsed.body || "Empty"}

## Auth Tokens Found
${parsed.authTokens.map((t) => `- ${t.type}: ${t.value.slice(0, 30)}...`).join("\n") || "None"}

## Key Observations
${interestingHeaders.length > 0 ? `- ${interestingHeaders.length} interesting headers found` : ""}
${interestingCookies.length > 0 ? `- ${interestingCookies.length} session/auth cookies detected` : ""}
${interestingParams.length > 0 ? `- ${interestingParams.length} interesting parameters (IDs, paths, redirects)` : ""}

STRICT RULES:
- Do NOT repeat attack paths. Every path must be unique.
- Do NOT give generic security advice. Every path must reference the actual headers, cookies, parameters, or endpoint shown above.
- Every payload must use the actual URL, parameters, and header values from this request.

Provide 10-15 attack paths specific to this HTTP request. Focus on:
1. **Header Injection** — Host header, X-Forwarded-For, Referer manipulation
2. **Cookie Manipulation** — Session fixation, cookie tampering, missing flags
3. **Method Tampering** — Try PUT/DELETE/PATCH if GET/POST, verb tunneling via X-HTTP-Method-Override
4. **Parameter Tampering** — IDOR on numeric IDs, type juggling, mass assignment
5. **Authentication Bypass** — Token manipulation, missing auth checks, privilege escalation
6. **Injection Attacks** — SQLi, XSS, command injection in parameters
7. **Access Control** — Path traversal, forced browsing, role manipulation
8. **Business Logic** — Race conditions, price manipulation, workflow bypass

For each attack path provide:
1. **Attack Vector Name**
2. **Severity** (Critical / High / Medium / Low)
3. **Description** — specific to this request
4. **Steps to Test** with exact curl/Burp steps using the actual URL
5. **Example Payload** — using the actual parameters from this request
6. **Potential Impact**

Format with markdown headers and bullet points.`;
};

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const RESULT_TABS = ["Attack Paths", "Raw JSON"] as const;

const HttpRequestAnalyzer = () => {
  const [rawRequest, setRawRequest] = useState("");
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [activeSection, setActiveSection] = useState<"parsed" | "results">("parsed");
  const [resultTab, setResultTab] = useState<(typeof RESULT_TABS)[number]>("Attack Paths");

  const handleParse = () => {
    const trimmed = rawRequest.trim();
    if (!trimmed) { setError("Paste a raw HTTP request."); return; }
    const p = parseRawRequest(trimmed);
    if (!p) { setError("Could not parse. Expected format: METHOD /path HTTP/1.1\\nHeaders..."); return; }
    setParsed(p);
    setError("");
    setActiveSection("parsed");
  };

  const handleAnalyze = async () => {
    if (!parsed) return;
    setLoading(true);
    setError("");
    setResult("");
    setActiveSection("results");

    try {
      const prompt = buildHttpPrompt(parsed);
      const response = await callGemini(prompt);
      setResult(response);

      const pathCount = (response.match(/#{1,3}\s+\d+[\.\)]/g) || []).length || Math.max(1, Math.floor(response.length / 500));
      incrementStat("totalAnalyses");
      incrementStat("attackPaths", pathCount);
      addToHistory({
        id: crypto.randomUUID(),
        target: `${parsed.method} ${parsed.host}${parsed.path.split("?")[0]}`,
        type: "request",
        pathsFound: pathCount,
        date: new Date().toLocaleDateString(),
        result: response,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const SAMPLE = `GET /api/v2/users/1337/profile?include=billing&format=json HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxMzM3fQ.sig
Cookie: session_id=abc123def456; csrf_token=xyz789; _ga=GA1.2.12345
X-Forwarded-For: 127.0.0.1
X-Api-Key: sk-live-abc123xyz
Content-Type: application/json
Referer: https://app.example.com/dashboard
User-Agent: Mozilla/5.0`;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Paste Raw HTTP Request</label>
          <button
            onClick={() => { setRawRequest(SAMPLE); setError(""); }}
            className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors"
          >
            Load Sample
          </button>
        </div>
        <textarea
          value={rawRequest}
          onChange={(e) => { setRawRequest(e.target.value); setError(""); }}
          placeholder={`GET /api/users/123 HTTP/1.1\nHost: example.com\nAuthorization: Bearer eyJ...\nCookie: session=abc123`}
          rows={8}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors resize-y"
        />
        {error && <p className="text-xs text-destructive font-mono">{error}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleParse}
          className="flex items-center gap-2 rounded-lg bg-secondary/80 px-5 py-3 font-heading text-sm font-bold text-secondary-foreground hover:bg-secondary transition-all"
        >
          Parse Request <ArrowRight size={16} />
        </button>
        {parsed && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed glow-primary"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</> : <>Analyze with AI <ArrowRight size={16} /></>}
          </button>
        )}
      </div>

      {/* Parsed + Results */}
      {parsed && (
        <>
          <div className="flex border-b border-border/50">
            {(["parsed", "results"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-4 py-2.5 text-xs font-mono transition-all border-b-2 -mb-px ${
                  activeSection === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "parsed" ? "Parsed Request" : "Attack Paths"}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            {activeSection === "parsed" && (
              <>
                {/* Request line */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-sm font-bold">{parsed.method}</Badge>
                  <span className="text-sm font-mono text-foreground break-all">{parsed.path}</span>
                  <span className="text-xs font-mono text-muted-foreground">{parsed.httpVersion}</span>
                </div>

                {/* Headers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-heading font-bold text-foreground">Headers ({parsed.headers.length})</h3>
                    <button onClick={() => copyToClipboard(parsed.headers.map((h) => `${h.name}: ${h.value}`).join("\n"))} className="text-muted-foreground hover:text-foreground"><Copy size={14} /></button>
                  </div>
                  <div className="space-y-1">
                    {parsed.headers.map((h, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs font-mono rounded-md px-2 py-1.5 ${h.isInteresting ? "bg-green-500/10 border border-green-500/20" : ""}`}>
                        <span className={`font-bold whitespace-nowrap ${h.isInteresting ? "text-green-400" : "text-muted-foreground"}`}>{h.name}:</span>
                        <span className="text-foreground break-all">{h.value}</span>
                        {h.reason && (
                          <Badge className={`${severityColor("medium")} text-[9px] ml-auto shrink-0`}>{h.reason}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cookies */}
                {parsed.cookies.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-heading font-bold text-foreground">Cookies ({parsed.cookies.length})</h3>
                    <div className="space-y-1">
                      {parsed.cookies.map((c, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs font-mono rounded-md px-2 py-1.5 ${c.isInteresting ? "bg-green-500/10 border border-green-500/20" : ""}`}>
                          <span className={`font-bold whitespace-nowrap ${c.isInteresting ? "text-green-400" : "text-muted-foreground"}`}>{c.name}=</span>
                          <span className="text-foreground break-all">{c.value}</span>
                          {c.reason && <Badge className={`${severityColor("medium")} text-[9px] ml-auto shrink-0`}>{c.reason}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Query Params */}
                {parsed.queryParams.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-heading font-bold text-foreground">Query Parameters ({parsed.queryParams.length})</h3>
                    <div className="space-y-1">
                      {parsed.queryParams.map((p, i) => (
                        <div key={i} className={`flex items-start gap-2 text-xs font-mono rounded-md px-2 py-1.5 ${p.isInteresting ? "bg-green-500/10 border border-green-500/20" : ""}`}>
                          <span className={`font-bold whitespace-nowrap ${p.isInteresting ? "text-green-400" : "text-muted-foreground"}`}>{p.key}=</span>
                          <span className="text-foreground break-all">{p.value}</span>
                          {p.reason && <Badge className={`${severityColor("high")} text-[9px] ml-auto shrink-0`}>{p.reason}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body */}
                {parsed.body && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-heading font-bold text-foreground">Request Body</h3>
                      <button onClick={() => copyToClipboard(parsed.body)} className="text-muted-foreground hover:text-foreground"><Copy size={14} /></button>
                    </div>
                    <pre className="text-xs font-mono bg-muted/30 rounded-lg p-3 border border-border/50 text-foreground whitespace-pre-wrap overflow-x-auto">{parsed.body}</pre>
                    {parsed.bodyParams.length > 0 && (
                      <div className="space-y-1">
                        {parsed.bodyParams.map((p, i) => (
                          <div key={i} className={`flex items-start gap-2 text-xs font-mono rounded-md px-2 py-1.5 ${p.isInteresting ? "bg-green-500/10 border border-green-500/20" : ""}`}>
                            <span className={`font-bold whitespace-nowrap ${p.isInteresting ? "text-green-400" : "text-muted-foreground"}`}>{p.key}=</span>
                            <span className="text-foreground break-all">{p.value}</span>
                            {p.reason && <Badge className={`${severityColor("high")} text-[9px] ml-auto shrink-0`}>{p.reason}</Badge>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Auth Tokens */}
                {parsed.authTokens.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                      <Shield size={14} className="text-primary" /> Auth Tokens ({parsed.authTokens.length})
                    </h3>
                    {parsed.authTokens.map((t, i) => (
                      <div key={i} className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">{t.type}</Badge>
                          <span className="text-xs font-mono text-foreground break-all">{t.value}</span>
                          <button onClick={() => copyToClipboard(t.value)} className="text-muted-foreground hover:text-foreground ml-auto shrink-0"><Copy size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary flags */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                  {parsed.authTokens.length > 0 && <Badge className={`${severityColor("high")} text-[10px]`}><AlertTriangle size={10} className="mr-1" />{parsed.authTokens.length} Auth Token(s)</Badge>}
                  {parsed.cookies.filter((c) => c.isInteresting).length > 0 && <Badge className={`${severityColor("medium")} text-[10px]`}>{parsed.cookies.filter((c) => c.isInteresting).length} Session Cookie(s)</Badge>}
                  {parsed.queryParams.filter((p) => p.isInteresting).length > 0 && <Badge className={`${severityColor("high")} text-[10px]`}>{parsed.queryParams.filter((p) => p.isInteresting).length} Interesting Param(s)</Badge>}
                  {parsed.headers.filter((h) => h.isInteresting).length > 0 && <Badge className={`${severityColor("medium")} text-[10px]`}>{parsed.headers.filter((h) => h.isInteresting).length} Notable Header(s)</Badge>}
                </div>
              </>
            )}

            {activeSection === "results" && (
              <>
                <div className="flex border-b border-border/50 -mt-2">
                  {RESULT_TABS.map((tab) => (
                    <button key={tab} onClick={() => setResultTab(tab)}
                      className={`px-4 py-2 text-xs font-mono transition-all border-b-2 -mb-px ${resultTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                    >{tab}</button>
                  ))}
                </div>

                {loading ? (
                  <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground py-8">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    Analyzing HTTP request for attack vectors…
                  </div>
                ) : result ? (
                  resultTab === "Raw JSON" ? (
                    <pre className="whitespace-pre-wrap text-xs font-mono text-foreground bg-muted/30 rounded-lg p-4 border border-border/50 max-h-[60vh] overflow-y-auto">
                      {JSON.stringify({ method: parsed.method, url: parsed.fullUrl, headers: parsed.headers.length, cookies: parsed.cookies.length, result }, null, 2)}
                    </pre>
                  ) : (
                    <div className="prose-result whitespace-pre-wrap text-sm font-mono text-foreground leading-relaxed">{result}</div>
                  )
                ) : (
                  <p className="text-sm font-mono text-muted-foreground/40 italic py-8">Click "Analyze with AI" to generate attack paths…</p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HttpRequestAnalyzer;
