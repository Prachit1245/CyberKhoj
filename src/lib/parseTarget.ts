export interface TargetContext {
  raw: string;
  protocol: string;
  domain: string;
  port: string;
  path: string;
  queryParams: Record<string, string>;
  hasNumericIds: boolean;
  interestingPaths: string[];
  authHeaders: Record<string, string>;
  jwtTokens: string[];
  fileExtensions: string[];
  httpMethod: string;
  isHttpRequest: boolean;
  flags: string[];
}

const INTERESTING_SEGMENTS = [
  "/api/", "/v1/", "/v2/", "/v3/", "/admin/", "/user/", "/users/",
  "/file/", "/files/", "/search/", "/login/", "/upload/", "/auth/",
  "/graphql", "/internal/", "/debug/", "/config/", "/backup/",
];

const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g;
const METHOD_RE = /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD|TRACE)\s+/i;
const HEADER_RE = /^([A-Za-z0-9-]+):\s*(.+)$/;
const FILE_EXT_RE = /\.([a-z0-9]{1,10})(?:\?|#|$)/gi;

export const parseTarget = (input: string): TargetContext => {
  const raw = input.trim();
  const ctx: TargetContext = {
    raw,
    protocol: "",
    domain: "",
    port: "",
    path: "",
    queryParams: {},
    hasNumericIds: false,
    interestingPaths: [],
    authHeaders: {},
    jwtTokens: [],
    fileExtensions: [],
    httpMethod: "",
    isHttpRequest: false,
    flags: [],
  };

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let urlStr = raw;

  // Detect HTTP request format
  const firstLine = lines[0] || "";
  const methodMatch = firstLine.match(METHOD_RE);
  if (methodMatch) {
    ctx.httpMethod = methodMatch[1].toUpperCase();
    ctx.isHttpRequest = true;
    // Extract URL portion from first line (e.g. "GET /path HTTP/1.1")
    const parts = firstLine.split(/\s+/);
    const pathPart = parts[1] || "";

    // Parse headers
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === "") break; // end of headers
      const hm = line.match(HEADER_RE);
      if (hm) {
        const name = hm[1].toLowerCase();
        const value = hm[2];
        if (["authorization", "cookie", "x-api-key", "x-auth-token", "x-csrf-token", "x-forwarded-for"].includes(name)) {
          ctx.authHeaders[hm[1]] = value;
        }
        if (name === "host" && !ctx.domain) {
          ctx.domain = value.split(":")[0];
          ctx.port = value.includes(":") ? value.split(":")[1] : "";
        }
      }
    }

    // Build full URL from Host header + path
    if (ctx.domain && pathPart.startsWith("/")) {
      urlStr = `https://${ctx.domain}${ctx.port ? `:${ctx.port}` : ""}${pathPart}`;
    } else {
      urlStr = pathPart;
    }
  }

  // Parse URL
  try {
    const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
    ctx.protocol = url.protocol.replace(":", "");
    ctx.domain = ctx.domain || url.hostname;
    ctx.port = ctx.port || (url.port || "");
    ctx.path = url.pathname;

    url.searchParams.forEach((v, k) => {
      ctx.queryParams[k] = v;
    });
  } catch {
    // Not a valid URL — treat entire input as raw
    // Try to extract domain-like pattern
    const domainMatch = raw.match(/(?:https?:\/\/)?([a-z0-9.-]+\.[a-z]{2,})/i);
    if (domainMatch) ctx.domain = domainMatch[1];
  }

  // Numeric IDs in params or path
  const paramValues = Object.values(ctx.queryParams);
  ctx.hasNumericIds =
    paramValues.some((v) => /^\d+$/.test(v)) ||
    /\/\d{1,10}(?:\/|$|\?)/.test(ctx.path);

  if (ctx.hasNumericIds) ctx.flags.push("NUMERIC_ID_DETECTED");

  // Interesting path segments
  const lowerPath = ctx.path.toLowerCase();
  for (const seg of INTERESTING_SEGMENTS) {
    if (lowerPath.includes(seg)) {
      ctx.interestingPaths.push(seg.replace(/\//g, "").toUpperCase());
    }
  }

  // JWT tokens anywhere in input
  const jwts = raw.match(JWT_RE);
  if (jwts) {
    ctx.jwtTokens = [...new Set(jwts)];
    ctx.flags.push("JWT_DETECTED");
  }

  // File extensions
  let extMatch: RegExpExecArray | null;
  const extSet = new Set<string>();
  while ((extMatch = FILE_EXT_RE.exec(raw)) !== null) {
    extSet.add(extMatch[1].toLowerCase());
  }
  ctx.fileExtensions = [...extSet];
  if (ctx.fileExtensions.length > 0) ctx.flags.push("FILE_EXTENSION_DETECTED");

  // Additional flags
  if (Object.keys(ctx.authHeaders).length > 0) ctx.flags.push("AUTH_HEADERS_PRESENT");
  if (ctx.interestingPaths.length > 0) ctx.flags.push("INTERESTING_PATH");
  if (Object.keys(ctx.queryParams).length > 3) ctx.flags.push("MANY_PARAMS");

  return ctx;
};

export const contextToPromptBlock = (ctx: TargetContext): string => {
  const lines: string[] = [
    "## Target Context (auto-parsed)",
    `- **Domain**: ${ctx.domain || "unknown"}`,
    `- **Protocol**: ${ctx.protocol || "unknown"}`,
    `- **Path**: ${ctx.path || "/"}`,
    `- **HTTP Method**: ${ctx.httpMethod || "unknown"}`,
  ];

  if (ctx.port) lines.push(`- **Port**: ${ctx.port}`);

  const paramKeys = Object.keys(ctx.queryParams);
  if (paramKeys.length > 0) {
    lines.push(`- **Query Parameters**: ${paramKeys.map((k) => `${k}=${ctx.queryParams[k]}`).join(", ")}`);
  }

  if (ctx.hasNumericIds) lines.push("- ⚠️ **Numeric IDs detected** — check for IDOR");
  if (ctx.interestingPaths.length > 0) lines.push(`- 🎯 **Interesting segments**: ${ctx.interestingPaths.join(", ")}`);
  if (ctx.jwtTokens.length > 0) lines.push(`- 🔑 **JWT tokens found** (${ctx.jwtTokens.length})`);
  if (ctx.fileExtensions.length > 0) lines.push(`- 📄 **File extensions**: ${ctx.fileExtensions.join(", ")}`);

  const authKeys = Object.keys(ctx.authHeaders);
  if (authKeys.length > 0) lines.push(`- 🔐 **Auth headers**: ${authKeys.join(", ")}`);

  if (ctx.flags.length > 0) lines.push(`- **Flags**: ${ctx.flags.join(", ")}`);

  return lines.join("\n");
};
