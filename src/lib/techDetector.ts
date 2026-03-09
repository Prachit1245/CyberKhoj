export interface DetectedTech {
  name: string;
  icon: string;
  color: string;
  attacks: string[];
}

interface Pattern {
  regex: RegExp;
  tech: string;
}

const URL_PATTERNS: Pattern[] = [
  { regex: /\/wp-content\/|\/wp-admin\/|\/wp-includes\/|\/wp-json\//i, tech: "WordPress" },
  { regex: /\/sites\/default\//i, tech: "Drupal" },
  { regex: /\/typo3\//i, tech: "TYPO3" },
  { regex: /\.php(\?|$|#)/i, tech: "PHP" },
  { regex: /\.aspx?(\?|$|#)/i, tech: "ASP.NET" },
  { regex: /\.jsp(\?|$|#)/i, tech: "Java/JSP" },
  { regex: /\/api\/v\d+\//i, tech: "REST API" },
  { regex: /\/graphql/i, tech: "GraphQL" },
  { regex: /\/admin\//i, tech: "Admin Panel" },
  { regex: /\/_next\//i, tech: "Next.js" },
  { regex: /\/static\//i, tech: "Static Files" },
  { regex: /\/node_modules\//i, tech: "Node.js" },
  { regex: /\/rails\//i, tech: "Ruby on Rails" },
  { regex: /\/django\//i, tech: "Django" },
  { regex: /\/laravel\//i, tech: "Laravel" },
  { regex: /\/swagger|\/openapi/i, tech: "Swagger/OpenAPI" },
  { regex: /\.cgi(\?|$)/i, tech: "CGI" },
  { regex: /\/joomla\//i, tech: "Joomla" },
  { regex: /\/magento\//i, tech: "Magento" },
  { regex: /\/shopify\//i, tech: "Shopify" },
];

const HEADER_PATTERNS: { header: string; regex: RegExp; tech: string }[] = [
  { header: "x-powered-by", regex: /php/i, tech: "PHP" },
  { header: "x-powered-by", regex: /asp\.net/i, tech: "ASP.NET" },
  { header: "x-powered-by", regex: /express/i, tech: "Express.js" },
  { header: "x-powered-by", regex: /next\.js/i, tech: "Next.js" },
  { header: "server", regex: /nginx/i, tech: "Nginx" },
  { header: "server", regex: /apache/i, tech: "Apache" },
  { header: "server", regex: /iis/i, tech: "IIS" },
  { header: "server", regex: /cloudflare/i, tech: "Cloudflare" },
  { header: "server", regex: /gunicorn/i, tech: "Python/Gunicorn" },
  { header: "set-cookie", regex: /PHPSESSID/i, tech: "PHP" },
  { header: "set-cookie", regex: /ASP\.NET_SessionId/i, tech: "ASP.NET" },
  { header: "set-cookie", regex: /JSESSIONID/i, tech: "Java" },
  { header: "set-cookie", regex: /connect\.sid/i, tech: "Express.js" },
  { header: "set-cookie", regex: /laravel_session/i, tech: "Laravel" },
  { header: "set-cookie", regex: /rack\.session/i, tech: "Ruby on Rails" },
  { header: "set-cookie", regex: /django/i, tech: "Django" },
  { header: "x-drupal-cache", regex: /./, tech: "Drupal" },
  { header: "x-generator", regex: /wordpress/i, tech: "WordPress" },
  { header: "x-generator", regex: /drupal/i, tech: "Drupal" },
  { header: "x-generator", regex: /joomla/i, tech: "Joomla" },
];

const TECH_DB: Record<string, Omit<DetectedTech, "name">> = {
  "WordPress": {
    icon: "🟦",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    attacks: [
      "Enumerate plugins via /wp-json/wp/v2/plugins or wp-content/plugins/",
      "Check xmlrpc.php for brute-force amplification attacks",
      "Test wp-login.php for username enumeration via error messages",
    ],
  },
  "Drupal": {
    icon: "💧",
    color: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    attacks: [
      "Check for Drupalgeddon2 (CVE-2018-7600) on older versions",
      "Enumerate users via /user/1, /user/2, etc.",
      "Test /admin/config for misconfigured permissions",
    ],
  },
  "TYPO3": {
    icon: "🟧",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    attacks: [
      "Check /typo3/install for exposed installer",
      "Test for insecure file upload via file manager",
      "Enumerate backend users via timing differences on login",
    ],
  },
  "PHP": {
    icon: "🟪",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    attacks: [
      "Test for Local File Inclusion via path traversal in parameters",
      "Check phpinfo() exposure at /info.php or /phpinfo.php",
      "Attempt type juggling attacks on authentication comparisons",
    ],
  },
  "ASP.NET": {
    icon: "🔷",
    color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    attacks: [
      "Test for ViewState deserialization vulnerabilities",
      "Check /trace.axd for debug trace exposure",
      "Attempt padding oracle attacks on encrypted parameters",
    ],
  },
  "Java/JSP": {
    icon: "☕",
    color: "bg-amber-600/20 text-amber-400 border-amber-600/30",
    attacks: [
      "Test for Log4Shell (CVE-2021-44228) via JNDI injection in headers",
      "Check /manager/html for exposed Tomcat manager",
      "Attempt OGNL injection if Struts framework detected",
    ],
  },
  "Java": {
    icon: "☕",
    color: "bg-amber-600/20 text-amber-400 border-amber-600/30",
    attacks: [
      "Test for Log4Shell (CVE-2021-44228) via JNDI injection",
      "Check for exposed JMX/RMI ports and deserialization endpoints",
      "Attempt Spring4Shell (CVE-2022-22965) if Spring framework",
    ],
  },
  "REST API": {
    icon: "🔗",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    attacks: [
      "Test IDOR by modifying numeric IDs in path (v1/users/1 → v1/users/2)",
      "Try accessing older API versions (v2→v1) for removed security controls",
      "Fuzz HTTP methods: PUT/DELETE/PATCH on GET-only endpoints",
    ],
  },
  "GraphQL": {
    icon: "◆",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    attacks: [
      "Send introspection query to map entire schema: {__schema{types{name}}}",
      "Test nested query DoS with deeply nested relationships",
      "Attempt field-level authorization bypass on sensitive mutations",
    ],
  },
  "Admin Panel": {
    icon: "🔐",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    attacks: [
      "Test default credentials (admin:admin, admin:password)",
      "Check for forced browsing to sub-paths (/admin/users, /admin/config)",
      "Attempt privilege escalation by modifying role parameters",
    ],
  },
  "Next.js": {
    icon: "⚛️",
    color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    attacks: [
      "Check /_next/data/ for exposed server-side props with sensitive data",
      "Test API routes at /api/* for missing authentication",
      "Look for source maps at /_next/static/ leaking source code",
    ],
  },
  "Static Files": {
    icon: "📁",
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    attacks: [
      "Directory listing check: browse /static/ for exposed files",
      "Look for .env, .git, or config files in static directories",
      "Test for path traversal: /static/../../etc/passwd",
    ],
  },
  "Node.js": {
    icon: "🟢",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    attacks: [
      "Check for prototype pollution in JSON body parsing",
      "Test for SSRF via request libraries (axios, node-fetch)",
      "Look for exposed /debug, /status, or /health endpoints",
    ],
  },
  "Express.js": {
    icon: "🟢",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    attacks: [
      "Test for prototype pollution via body-parser",
      "Check /debug/pprof or __express for debug routes",
      "Attempt HPP (HTTP Parameter Pollution) on query params",
    ],
  },
  "Ruby on Rails": {
    icon: "💎",
    color: "bg-red-600/20 text-red-400 border-red-600/30",
    attacks: [
      "Test for mass assignment by adding unexpected params to forms",
      "Check /rails/info for debug info exposure in development mode",
      "Attempt YAML deserialization if older Rails version",
    ],
  },
  "Django": {
    icon: "🐍",
    color: "bg-green-600/20 text-green-400 border-green-600/30",
    attacks: [
      "Check /admin/ for Django admin panel with default settings",
      "Test for SSTI in template rendering with {{ 7*7 }}",
      "Look for DEBUG=True leaking settings at error pages",
    ],
  },
  "Laravel": {
    icon: "🟥",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    attacks: [
      "Check /.env for exposed environment variables",
      "Test /telescope for debug dashboard exposure",
      "Attempt CVE-2021-3129 ignition RCE on older versions",
    ],
  },
  "Nginx": {
    icon: "🟩",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    attacks: [
      "Test for alias traversal via misconfigured location blocks",
      "Check /nginx_status for exposed server stats",
      "Attempt HTTP request smuggling with malformed headers",
    ],
  },
  "Apache": {
    icon: "🪶",
    color: "bg-red-700/20 text-red-400 border-red-700/30",
    attacks: [
      "Check /server-status and /server-info for exposed info",
      "Test for mod_cgi path traversal (CVE-2021-41773)",
      "Attempt .htaccess bypass via filename tricks",
    ],
  },
  "IIS": {
    icon: "🪟",
    color: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    attacks: [
      "Test short filename disclosure via ~1 notation",
      "Check for web.config exposure via alternate data streams",
      "Attempt HTTP.sys DoS (CVE-2015-1635) on older versions",
    ],
  },
  "Cloudflare": {
    icon: "☁️",
    color: "bg-orange-400/20 text-orange-400 border-orange-400/30",
    attacks: [
      "Find origin IP via DNS history, certificates, or email headers",
      "Test WAF bypass with encoding tricks and chunked transfer",
      "Check for exposed origin via direct IP access",
    ],
  },
  "Python/Gunicorn": {
    icon: "🐍",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    attacks: [
      "Test for SSTI via Jinja2 templates: {{config.items()}}",
      "Check for pickle deserialization in session handling",
      "Attempt SSRF via Python request libraries",
    ],
  },
  "Swagger/OpenAPI": {
    icon: "📖",
    color: "bg-emerald-400/20 text-emerald-400 border-emerald-400/30",
    attacks: [
      "Access full API spec for hidden/undocumented endpoints",
      "Test 'Try it out' feature for unauthorized API calls",
      "Look for internal endpoints exposed in the spec",
    ],
  },
  "Joomla": {
    icon: "🟠",
    color: "bg-orange-600/20 text-orange-400 border-orange-600/30",
    attacks: [
      "Check /administrator/ for exposed admin panel",
      "Test for SQL injection in com_content component",
      "Enumerate extensions via /components/ directory listing",
    ],
  },
  "Magento": {
    icon: "🛒",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    attacks: [
      "Check /downloader/ for exposed Magento Connect Manager",
      "Test for Magecart-style payment skimming scripts",
      "Attempt admin path brute-force (/admin_xxxxx)",
    ],
  },
  "Shopify": {
    icon: "🛍️",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    attacks: [
      "Test for price manipulation in cart/checkout APIs",
      "Check for exposed admin API endpoints",
      "Look for customer data leaks in storefront API responses",
    ],
  },
  "CGI": {
    icon: "⚙️",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    attacks: [
      "Test for Shellshock (CVE-2014-6271) via User-Agent header",
      "Attempt OS command injection in CGI parameters",
      "Check for directory traversal in script paths",
    ],
  },
};

function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const val = line.slice(idx + 1).trim();
      headers[key] = headers[key] ? headers[key] + "; " + val : val;
    }
  }
  return headers;
}

export function detectTech(url: string, headersRaw?: string): DetectedTech[] {
  const found = new Set<string>();

  // URL pattern matching
  for (const p of URL_PATTERNS) {
    if (p.regex.test(url)) found.add(p.tech);
  }

  // Header pattern matching
  if (headersRaw) {
    const headers = parseHeaders(headersRaw);
    for (const p of HEADER_PATTERNS) {
      const val = headers[p.header];
      if (val && p.regex.test(val)) found.add(p.tech);
    }
  }

  return [...found]
    .filter((name) => TECH_DB[name])
    .map((name) => ({ name, ...TECH_DB[name] }));
}
