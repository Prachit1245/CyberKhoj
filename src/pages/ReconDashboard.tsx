import { useState, useMemo } from "react";
import { Radar, Copy, Check, ExternalLink, Download, Globe, Search, Terminal, Cpu, Sparkles, Loader2, History, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sanitizeInput } from "@/lib/sanitize";
import { detectTech } from "@/lib/techDetector";
import { callGemini, safeParseJSON, GeminiError } from "@/lib/ai";
import { toast } from "@/components/Toast";

/* ── Data ── */

const COMMON_SUBDOMAINS = [
  "admin","api","app","auth","beta","blog","cdn","cms","cpanel","dashboard",
  "db","dev","docs","email","ftp","git","grafana","help","internal","jenkins",
  "jira","login","mail","media","monitor","mysql","ns1","ns2","portal","proxy",
  "redis","remote","s3","sandbox","secure","shop","sso","stage","staging","static",
  "status","store","support","test","upload","vpn","webmail","wiki","www","ws",
];

const COMMON_API_PATHS = [
  "/api","/api/v1","/api/v2","/api/v3","/swagger","/swagger-ui.html","/swagger.json",
  "/api-docs","/docs","/graphql","/graphiql","/rest","/rest/v1",
  "/.well-known/openid-configuration","/.well-known/security.txt",
  "/health","/healthz","/status","/ping","/admin","/admin/api",
  "/auth","/auth/login","/auth/token","/oauth/token",
  "/users","/users/me","/config","/env","/debug","/debug/pprof",
  "/metrics","/actuator","/actuator/health","/actuator/env",
  "/info","/version","/sitemap.xml","/robots.txt","/.env","/.git/config",
  "/wp-json","/wp-json/wp/v2/users","/server-status","/server-info",
  "/phpinfo.php","/console","/shell",
  "/favicon.ico","/.htaccess","/crossdomain.xml","/clientaccesspolicy.xml",
  "/trace.axd","/elmah.axd","/web.config",
];

const COMMON_PARAMS: Record<string, string[]> = {
  "Authentication": ["username","password","email","token","code","redirect_uri","state","nonce","grant_type","client_id","client_secret"],
  "Search & Filters": ["q","query","search","filter","sort","order","page","limit","offset","per_page","fields","include","exclude"],
  "User/Resource": ["id","user_id","uid","account_id","profile_id","name","role","status","type","category"],
  "File Operations": ["file","filename","path","url","src","dest","dir","upload","download","format","ext"],
  "Debug & Internal": ["debug","test","verbose","admin","mode","env","config","action","cmd","exec","callback","next","return","returnTo"],
  "Payment & Commerce": ["amount","price","quantity","currency","coupon","discount","item_id","cart_id","order_id","payment_method"],
};

function buildDorks(domain: string): string[] {
  return [
    `site:${domain} ext:pdf OR ext:xlsx OR ext:doc`,
    `site:${domain} inurl:login OR inurl:signin OR inurl:admin`,
    `site:${domain} ext:env OR ext:config OR ext:xml OR ext:json`,
    `site:${domain} inurl:api OR inurl:swagger OR inurl:graphql`,
    `site:${domain} "sql syntax" OR "warning:" OR "error" OR "exception"`,
  ];
}

/* ── Helpers ── */

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };
  return { copiedKey, copy };
}

function CopyBtn({ text, id, copiedKey, copy }: { text: string; id: string; copiedKey: string | null; copy: (t: string, k: string) => void }) {
  return (
    <button onClick={() => copy(text, id)} className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors">
      {copiedKey === id ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-muted-foreground" />}
    </button>
  );
}

/* ── Main Page ── */

export default function ReconDashboard() {
  const [domain, setDomain] = useState("");
  const [active, setActive] = useState(false);
  const { copiedKey, copy } = useCopy();

  // AI state for dorks
  const [aiDorks, setAiDorks] = useState<string[]>([]);
  const [dorksLoading, setDorksLoading] = useState(false);

  const cleanDomain = useMemo(() => sanitizeInput(domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")), [domain]);

  const startRecon = () => {
    if (!cleanDomain) { toast.error("Enter a domain."); return; }
    setActive(true);
    setAiDorks([]);
  };

  const techs = useMemo(() => active ? detectTech(`https://${cleanDomain}`) : [], [active, cleanDomain]);
  const dorks = useMemo(() => active ? buildDorks(cleanDomain) : [], [active, cleanDomain]);
  const subdomainUrls = useMemo(() => active ? COMMON_SUBDOMAINS.map(s => `${s}.${cleanDomain}`) : [], [active, cleanDomain]);
  const apiUrls = useMemo(() => active ? COMMON_API_PATHS.map(p => `https://${cleanDomain}${p}`) : [], [active, cleanDomain]);

  const copyAll = (items: string[], label: string) => {
    navigator.clipboard.writeText(items.join("\n"));
    toast.success(`Copied ${items.length} ${label} to clipboard.`);
  };

  const downloadTxt = (items: string[], filename: string) => {
    const blob = new Blob([items.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Downloaded.");
  };

  const generateMoreDorks = async () => {
    setDorksLoading(true);
    try {
      const raw = await callGemini(`Generate 30 unique Google dorks for bug bounty reconnaissance on "${cleanDomain}". Return a JSON array of strings. Each string is a complete Google dork query. Cover: sensitive files, login pages, admin panels, config files, API docs, exposed databases, error pages, backup files, git exposure, IoT. Return ONLY the JSON array.`, true);
      const parsed = safeParseJSON(raw);
      setAiDorks(Array.isArray(parsed) ? parsed : []);
    } catch (e) {
      if (e instanceof GeminiError) toast.error(e.message);
      else toast.error("Failed to generate dorks.");
    } finally {
      setDorksLoading(false);
    }
  };

  const allParams = Object.values(COMMON_PARAMS).flat();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Radar className="h-7 w-7 text-primary" />
          Recon Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          One-stop reconnaissance workspace. All cards load instantly — zero API calls.
        </p>
      </div>

      {/* Domain Input */}
      <div className="flex gap-2">
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && startRecon()}
          placeholder="example.com"
          className="flex-1 font-mono"
        />
        <Button onClick={startRecon} disabled={!domain.trim()}>
          <Radar className="h-4 w-4 mr-1" /> Start Recon
        </Button>
      </div>

      {active && cleanDomain && (
        <div className="grid gap-4 md:grid-cols-2">

          {/* 1. Subdomains */}
          <Card className="bg-card/60 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-primary" />
                  <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">Subdomains</h3>
                  <Badge variant="outline" className="text-[10px]">{subdomainUrls.length}</Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => copyAll(subdomainUrls, "subdomains")}>
                    <Copy size={10} className="mr-1" /> Copy All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => downloadTxt(subdomainUrls, `subdomains-${cleanDomain}.txt`)}>
                    <Download size={10} className="mr-1" /> .txt
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 border border-border/20 max-h-[180px] overflow-y-auto">
                {subdomainUrls.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1 border-b border-border/10 last:border-0 text-[11px] font-mono text-foreground/80 hover:bg-muted/30 group">
                    <span className="select-all break-all">{s}</span>
                    <CopyBtn text={s} id={`sub-${i}`} copiedKey={copiedKey} copy={copy} />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <a href={`https://crt.sh/?q=%25.${cleanDomain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink size={10} /> crt.sh
                </a>
                <a href={`https://dnsdumpster.com/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink size={10} /> DNSDumpster
                </a>
                <a href={`https://chaos.projectdiscovery.io/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink size={10} /> Chaos
                </a>
              </div>
            </CardContent>
          </Card>

          {/* 2. Google Dorks */}
          <Card className="bg-card/60 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-primary" />
                  <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">Google Dorks</h3>
                  <Badge variant="outline" className="text-[10px]">{dorks.length + aiDorks.length}</Badge>
                </div>
                <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" onClick={generateMoreDorks} disabled={dorksLoading}>
                  {dorksLoading ? <Loader2 size={10} className="animate-spin mr-1" /> : <Sparkles size={10} className="mr-1" />}
                  {dorksLoading ? "Generating…" : "Generate 30 More"}
                </Button>
              </div>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {[...dorks, ...aiDorks].map((d, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <code className="flex-1 text-[11px] font-mono bg-muted/30 rounded px-2 py-1 text-foreground/80 break-all select-all">{d}</code>
                    <CopyBtn text={d} id={`dork-${i}`} copiedKey={copiedKey} copy={copy} />
                    <a href={`https://www.google.com/search?q=${encodeURIComponent(d)}`} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1 rounded hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-all">
                      <ExternalLink size={10} className="text-muted-foreground" />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 3. Technology Stack */}
          <Card className="bg-card/60 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Cpu size={14} className="text-primary" />
                <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">Technology Stack</h3>
              </div>
              {techs.length > 0 ? (
                <div className="space-y-2">
                  {techs.map((t) => (
                    <div key={t.name} className="space-y-1">
                      <Badge variant="outline" className={`text-[10px] border ${t.color}`}>
                        {t.icon} {t.name}
                      </Badge>
                      <ul className="pl-3 space-y-0.5">
                        {t.attacks.map((a, i) => (
                          <li key={i} className="text-[11px] font-mono text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5 shrink-0">▸</span>{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] font-mono text-muted-foreground">
                  No technology detected from URL patterns alone. Try the URL Analyzer with full URL + headers for deeper detection.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 4. Wayback Machine */}
          <Card className="bg-card/60 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <History size={14} className="text-primary" />
                <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">Wayback Machine</h3>
              </div>
              <div className="space-y-1.5 text-[11px] font-mono">
                {[
                  `https://web.archive.org/web/*/${cleanDomain}/*`,
                  `https://web.archive.org/web/*/${cleanDomain}/api/*`,
                  `https://web.archive.org/web/*/${cleanDomain}/admin/*`,
                  `https://web.archive.org/web/*/${cleanDomain}/*.js`,
                  `https://web.archive.org/web/*/${cleanDomain}/*.json`,
                ].map((url, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all flex-1">{url}</a>
                    <CopyBtn text={url} id={`wb-${i}`} copiedKey={copiedKey} copy={copy} />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Commands</p>
                {[
                  `waybackurls ${cleanDomain} | sort -u | tee wayback.txt`,
                  `waybackurls ${cleanDomain} | grep "\\.js$" | sort -u`,
                  `waybackurls ${cleanDomain} | grep -iE "(key|token|secret|password)"`,
                ].map((cmd, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-2.5 py-1.5 border border-border/20">
                    <Terminal size={10} className="text-primary shrink-0" />
                    <code className="flex-1 text-[11px] text-foreground/80 break-all select-all">{cmd}</code>
                    <CopyBtn text={cmd} id={`wbcmd-${i}`} copiedKey={copiedKey} copy={copy} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 5. API Endpoints */}
          <Card className="bg-card/60 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-primary" />
                  <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">API Endpoints</h3>
                  <Badge variant="outline" className="text-[10px]">{apiUrls.length}</Badge>
                </div>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => copyAll(apiUrls, "URLs")}>
                    <Copy size={10} className="mr-1" /> Copy All
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => downloadTxt(apiUrls, `api-paths-${cleanDomain}.txt`)}>
                    <Download size={10} className="mr-1" /> .txt
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 border border-border/20 max-h-[180px] overflow-y-auto">
                {apiUrls.map((u, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1 border-b border-border/10 last:border-0 text-[11px] font-mono text-foreground/80 hover:bg-muted/30 group">
                    <span className="select-all break-all">{u}</span>
                    <CopyBtn text={u} id={`api-${i}`} copiedKey={copiedKey} copy={copy} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 6. Parameter Discovery */}
          <Card className="bg-card/60 border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 size={14} className="text-primary" />
                  <h3 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest">Parameters</h3>
                  <Badge variant="outline" className="text-[10px]">{allParams.length}</Badge>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => copyAll(allParams, "parameters")}>
                  <Copy size={10} className="mr-1" /> Copy All
                </Button>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {Object.entries(COMMON_PARAMS).map(([cat, params]) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider">{cat}</p>
                      <button onClick={() => { navigator.clipboard.writeText(params.join("\n")); toast.success(`Copied ${cat} params.`); }} className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                        copy
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {params.map((p) => (
                        <Badge key={p} variant="outline" className="text-[10px] bg-muted/20 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => copy(p, `param-${p}`)}>
                          {copiedKey === `param-${p}` ? "✓" : p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
