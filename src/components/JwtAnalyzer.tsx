import { useState } from "react";
import { INPUT_LIMITS, enforceLimit } from "@/lib/sanitize";
import { Shield, AlertTriangle, CheckCircle, Clock, Info, Copy, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

interface SecurityFlag {
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
}

interface AttackPath {
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  steps: string[];
  payload: string;
}

const decodeBase64Url = (str: string): string => {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return atob(base64);
};

const parseJwt = (token: string): JwtParts | null => {
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
};

const getExpirationStatus = (payload: Record<string, unknown>): { label: string; color: string } => {
  const exp = payload.exp as number | undefined;
  if (!exp) return { label: "No Expiry ⚠️", color: "text-yellow-400" };
  const now = Math.floor(Date.now() / 1000);
  return exp < now
    ? { label: `Expired (${new Date(exp * 1000).toUTCString()})`, color: "text-destructive" }
    : { label: `Valid until ${new Date(exp * 1000).toUTCString()}`, color: "text-green-400" };
};

const COMMON_CLAIMS: Record<string, string> = {
  iss: "Issuer", sub: "Subject", aud: "Audience", exp: "Expiration",
  nbf: "Not Before", iat: "Issued At", jti: "JWT ID", name: "Name",
  email: "Email", role: "Role", roles: "Roles", scope: "Scope",
  permissions: "Permissions", admin: "Admin Flag", typ: "Type",
};

const generateSecurityFlags = (header: Record<string, unknown>, payload: Record<string, unknown>): SecurityFlag[] => {
  const flags: SecurityFlag[] = [];
  const alg = (header.alg as string || "").toLowerCase();

  if (alg === "none") {
    flags.push({ severity: "critical", title: "Algorithm 'none' Used", description: "Token uses no signing algorithm. Any attacker can forge tokens by modifying the payload and removing the signature." });
  }
  if (alg === "hs256") {
    flags.push({ severity: "high", title: "HS256 — Weak Secret Possible", description: "HMAC-SHA256 is vulnerable to brute-force if a weak secret is used. Tools like hashcat/jwt_tool can crack weak secrets quickly." });
  }
  if (alg === "hs384" || alg === "hs512") {
    flags.push({ severity: "medium", title: `${(header.alg as string)} — Symmetric Algorithm`, description: "Symmetric signing means the same secret signs and verifies. If the secret leaks, tokens can be forged." });
  }
  if (!payload.exp) {
    flags.push({ severity: "high", title: "No Expiration Claim", description: "Token never expires. If stolen, it grants indefinite access. Always set an expiration." });
  }
  if (payload.admin === true) {
    flags.push({ severity: "medium", title: "Admin Flag in Payload", description: "An 'admin: true' claim in the payload may be manipulable if the signing key is compromised or algorithm is downgraded." });
  }
  if (header.jku) {
    flags.push({ severity: "high", title: "JKU Header Present", description: "The 'jku' header points to a URL for key verification. An attacker may redirect this to their own key server." });
  }
  if (header.kid) {
    flags.push({ severity: "medium", title: "KID Header Present", description: "The 'kid' (Key ID) header may be injectable. Test for SQL injection, path traversal, or command injection in this field." });
  }
  if (header.x5u) {
    flags.push({ severity: "high", title: "X5U Header Present", description: "The 'x5u' header points to an X.509 certificate URL. An attacker could substitute their own certificate." });
  }

  if (flags.length === 0) {
    flags.push({ severity: "info", title: "No Major Issues Detected", description: "Basic checks passed. Manual review still recommended for business logic flaws." });
  }
  return flags;
};

const generateAttackPaths = (header: Record<string, unknown>, payload: Record<string, unknown>): AttackPath[] => {
  const paths: AttackPath[] = [];
  const alg = (header.alg as string || "").toUpperCase();

  paths.push({
    title: "Algorithm Confusion (RS256 → HS256)",
    severity: "critical",
    description: "If the server uses RS256 but accepts HS256, an attacker can sign tokens using the public key as the HMAC secret.",
    steps: [
      "Obtain the server's RSA public key (/.well-known/jwks.json or /oauth/certs)",
      "Change the JWT header 'alg' from RS256 to HS256",
      "Sign the modified token using the public key as the HMAC secret",
      "Send the forged token to the server",
    ],
    payload: `python3 jwt_tool.py <token> -X k -pk public.pem`,
  });

  paths.push({
    title: "Algorithm 'none' Bypass",
    severity: "critical",
    description: "Set the algorithm to 'none' and remove the signature. Some libraries accept unsigned tokens.",
    steps: [
      "Decode the JWT header and change 'alg' to 'none', 'None', 'NONE', or 'nOnE'",
      "Modify the payload as desired (e.g., change user ID or role)",
      "Remove the signature (third part) but keep the trailing dot",
      "Send: eyJ...header.eyJ...payload.",
    ],
    payload: `python3 jwt_tool.py <token> -X a`,
  });

  if (alg.startsWith("HS")) {
    paths.push({
      title: "Weak Secret Brute Force",
      severity: "high",
      description: "Brute-force the HMAC signing secret using common wordlists. Weak secrets can be cracked in seconds.",
      steps: [
        "Save the JWT to a file",
        "Run hashcat or jwt_tool with a wordlist",
        "If cracked, forge tokens with any payload",
      ],
      payload: `hashcat -a 0 -m 16500 jwt.txt /usr/share/wordlists/rockyou.txt\n# or\njwt_tool.py <token> -C -d /usr/share/wordlists/rockyou.txt`,
    });
  }

  paths.push({
    title: "Claim Manipulation — Privilege Escalation",
    severity: "high",
    description: "Modify payload claims (role, admin, user_id, email) to escalate privileges or impersonate other users.",
    steps: [
      "Decode the payload and identify authorization claims",
      "Modify claims: role→admin, user_id→target_id, admin→true",
      "Re-sign with cracked secret or use algorithm confusion",
      "Test each modified token against protected endpoints",
    ],
    payload: `python3 jwt_tool.py <token> -T -S hs256 -p "cracked_secret"`,
  });

  if (header.kid) {
    paths.push({
      title: "KID Injection (SQL / Path Traversal)",
      severity: "high",
      description: "The 'kid' header parameter may be used in a database query or file read. Inject SQL or path traversal payloads.",
      steps: [
        "Change 'kid' to: ../../dev/null (sign with empty secret)",
        "Change 'kid' to: ' UNION SELECT 'key' -- (SQLi)",
        "Sign the token with the corresponding secret",
      ],
      payload: `kid: "../../../../../../dev/null"\nSecret: "" (empty string)`,
    });
  }

  if (header.jku) {
    paths.push({
      title: "JKU Header Injection",
      severity: "critical",
      description: "Replace the JKU URL with an attacker-controlled server hosting a malicious JWKS.",
      steps: [
        "Generate your own RSA key pair",
        "Host a JWKS endpoint with your public key",
        "Change the JWT 'jku' header to your URL",
        "Sign the modified token with your private key",
      ],
      payload: `jku: "https://attacker.com/.well-known/jwks.json"`,
    });
  }

  return paths;
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

const JwtAnalyzer = () => {
  const [token, setToken] = useState("");
  const [parsed, setParsed] = useState<JwtParts | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<"decoded" | "security" | "attacks">("decoded");

  const handleAnalyze = () => {
    const trimmed = token.trim();
    if (!trimmed) { setError("Paste a JWT token to analyze."); return; }
    const result = parseJwt(trimmed);
    if (!result) { setError("Invalid JWT format. Expected: header.payload.signature"); return; }
    setParsed(result);
    setError("");
    setActiveSection("decoded");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sections = ["decoded", "security", "attacks"] as const;
  const sectionLabels = { decoded: "Decoded Token", security: "Security Checks", attacks: "Attack Paths" };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-mono text-muted-foreground uppercase tracking-widest">Paste JWT Token</label>
        <textarea
          value={token}
          onChange={(e) => { setToken(enforceLimit(e.target.value, INPUT_LIMITS.JWT_TOKEN)); setError(""); }}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors resize-y"
        />
        {error && <p className="text-xs text-destructive font-mono">{error}</p>}
      </div>

      <button
        onClick={handleAnalyze}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
      >
        Decode & Analyze <ArrowRight size={16} />
      </button>

      {parsed && (
        <>
          {/* Section tabs */}
          <div className="flex border-b border-border/50">
            {sections.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`px-4 py-2.5 text-xs font-mono transition-all border-b-2 -mb-px ${
                  activeSection === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {sectionLabels[s]}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            {activeSection === "decoded" && (
              <>
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-heading font-bold text-foreground">Header</h3>
                    <button onClick={() => copyToClipboard(JSON.stringify(parsed.header, null, 2))} className="text-muted-foreground hover:text-foreground transition-colors"><Copy size={14} /></button>
                  </div>
                  <pre className="text-xs font-mono bg-muted/30 rounded-lg p-3 border border-border/50 text-foreground overflow-x-auto">
                    {JSON.stringify(parsed.header, null, 2)}
                  </pre>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={severityColor(parsed.header.alg === "none" ? "critical" : "info")}>
                      Algorithm: {(parsed.header.alg as string) || "unknown"}
                    </Badge>
                    {parsed.header.typ && <Badge variant="outline">Type: {parsed.header.typ as string}</Badge>}
                  </div>
                </div>

                {/* Payload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-heading font-bold text-foreground">Payload</h3>
                    <button onClick={() => copyToClipboard(JSON.stringify(parsed.payload, null, 2))} className="text-muted-foreground hover:text-foreground transition-colors"><Copy size={14} /></button>
                  </div>
                  <pre className="text-xs font-mono bg-muted/30 rounded-lg p-3 border border-border/50 text-foreground overflow-x-auto">
                    {JSON.stringify(parsed.payload, null, 2)}
                  </pre>
                </div>

                {/* Claims overview */}
                <div className="space-y-2">
                  <h3 className="text-sm font-heading font-bold text-foreground">Claims Overview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Expiration */}
                    {(() => {
                      const status = getExpirationStatus(parsed.payload);
                      return (
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <Clock size={14} className={status.color} />
                          <span className={status.color}>{status.label}</span>
                        </div>
                      );
                    })()}
                    {/* Issued At */}
                    {parsed.payload.iat && (
                      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                        <Info size={14} />
                        Issued: {new Date((parsed.payload.iat as number) * 1000).toUTCString()}
                      </div>
                    )}
                  </div>
                  {/* Common claims present */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.keys(parsed.payload).map((key) => (
                      <Badge key={key} variant="outline" className="text-[10px]">
                        {COMMON_CLAIMS[key] || key}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Signature */}
                <div className="space-y-1">
                  <h3 className="text-sm font-heading font-bold text-foreground">Signature</h3>
                  <p className="text-xs font-mono text-muted-foreground break-all">{parsed.signature}</p>
                </div>
              </>
            )}

            {activeSection === "security" && (
              <div className="space-y-3">
                {generateSecurityFlags(parsed.header, parsed.payload).map((flag, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${severityColor(flag.severity)}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {flag.severity === "critical" || flag.severity === "high" ? (
                        <AlertTriangle size={14} />
                      ) : flag.severity === "info" ? (
                        <CheckCircle size={14} />
                      ) : (
                        <Shield size={14} />
                      )}
                      <span className="text-xs font-heading font-bold uppercase">{flag.severity}</span>
                      <span className="text-sm font-mono font-bold">{flag.title}</span>
                    </div>
                    <p className="text-xs font-mono opacity-80">{flag.description}</p>
                  </div>
                ))}
              </div>
            )}

            {activeSection === "attacks" && (
              <div className="space-y-4">
                {generateAttackPaths(parsed.header, parsed.payload).map((atk, i) => (
                  <div key={i} className="rounded-lg border border-border/50 p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={severityColor(atk.severity)}>{atk.severity.toUpperCase()}</Badge>
                      <h4 className="text-sm font-heading font-bold text-foreground">{atk.title}</h4>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{atk.description}</p>
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Steps</p>
                      <ol className="list-decimal list-inside text-xs font-mono text-foreground space-y-0.5">
                        {atk.steps.map((s, j) => <li key={j}>{s}</li>)}
                      </ol>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Payload / Command</p>
                        <button onClick={() => copyToClipboard(atk.payload)} className="text-muted-foreground hover:text-foreground transition-colors"><Copy size={12} /></button>
                      </div>
                      <pre className="text-xs font-mono bg-muted/30 rounded-lg p-2 border border-border/50 text-foreground whitespace-pre-wrap">{atk.payload}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default JwtAnalyzer;
