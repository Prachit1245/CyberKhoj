import { useState, useCallback } from "react";
import { Search, Copy, ExternalLink, Loader2, Globe, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { callGemini, safeParseJSON, GeminiError } from "@/lib/ai";
import { sanitizeInput } from "@/lib/sanitize";
import { toast } from "@/components/Toast";
import GeminiErrorDisplay from "@/components/GeminiErrorDisplay";

interface Dork {
  category: string;
  dork: string;
  description: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Sensitive Files": "bg-red-500/20 text-red-400 border-red-500/30",
  "Login Pages": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Admin Panels": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "Config Files": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "API Docs": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Exposed Databases": "bg-red-600/20 text-red-300 border-red-600/30",
  "Error Pages": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Backup Files": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Git Exposed": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "Camera/IoT": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

function buildPrompt(domain: string): string {
  return `Generate exactly 30 targeted Google dorks for the domain/company "${domain}".

Return a JSON array of objects. Each object has:
- "category": one of "Sensitive Files","Login Pages","Admin Panels","Config Files","API Docs","Exposed Databases","Error Pages","Backup Files","Git Exposed","Camera/IoT"
- "dork": the full Google dork query string
- "description": one sentence explaining what this dork finds

Generate 3 dorks per category (10 categories × 3 = 30 total).

Categories and example patterns:
- Sensitive Files: site:${domain} ext:pdf OR ext:xlsx OR ext:doc
- Login Pages: site:${domain} inurl:login OR inurl:signin
- Admin Panels: site:${domain} inurl:admin OR inurl:dashboard
- Config Files: site:${domain} ext:env OR ext:config OR ext:xml
- API Docs: site:${domain} inurl:api OR inurl:swagger OR inurl:docs
- Exposed Databases: site:${domain} inurl:phpmyadmin OR inurl:adminer
- Error Pages: site:${domain} "sql syntax" OR "warning: mysql"
- Backup Files: site:${domain} ext:bak OR ext:backup OR ext:old
- Git Exposed: site:${domain} inurl:.git
- Camera/IoT: site:${domain} inurl:view.shtml

Make each dork unique, creative, and realistic. Return ONLY the JSON array.`;
}

export default function DorkGenerator() {
  const [domain, setDomain] = useState("");
  const [dorks, setDorks] = useState<Dork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GeminiError | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const generate = useCallback(async () => {
    const clean = sanitizeInput(domain.trim());
    if (!clean) { toast.error("Enter a domain or company name."); return; }
    setLoading(true);
    setError(null);
    setDorks([]);
    setFilter(null);
    try {
      const raw = await callGemini(buildPrompt(clean), true);
      const parsed = safeParseJSON(raw);
      const arr = Array.isArray(parsed) ? parsed : parsed.dorks ?? [];
      setDorks(arr as Dork[]);
    } catch (e) {
      if (e instanceof GeminiError) setError(e);
      else toast.error("Failed to generate dorks.");
    } finally {
      setLoading(false);
    }
  }, [domain]);

  const copyDork = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = () => {
    const all = filtered.map((d) => d.dork).join("\n");
    navigator.clipboard.writeText(all);
    toast.success(`Copied ${filtered.length} dorks to clipboard.`);
  };

  const categories = [...new Set(dorks.map((d) => d.category))];
  const filtered = filter ? dorks.filter((d) => d.category === filter) : dorks;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" />
          Dork Generator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate targeted Google dorks for reconnaissance. For authorized security testing only.
        </p>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter domain (e.g. example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
          className="flex-1 font-mono"
        />
        <Button onClick={generate} disabled={loading || !domain.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {loading ? "Generating…" : "Generate"}
        </Button>
      </div>

      {error && <GeminiErrorDisplay code={error.code} message={error.message} onRetry={generate} />}

      {dorks.length > 0 && (
        <>
          {/* Category filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge
              className={`cursor-pointer ${!filter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              onClick={() => setFilter(null)}
            >
              All ({dorks.length})
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                className={`cursor-pointer border ${filter === cat ? CATEGORY_COLORS[cat] || "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground border-border"}`}
                onClick={() => setFilter(filter === cat ? null : cat)}
              >
                {cat} ({dorks.filter((d) => d.category === cat).length})
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={copyAll} className="ml-auto">
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy All
            </Button>
          </div>

          {/* Dork cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((d, i) => (
              <Card key={i} className="bg-card/60 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <Badge variant="outline" className={`text-[10px] ${CATEGORY_COLORS[d.category] || ""}`}>
                    {d.category}
                  </Badge>
                  <pre className="text-xs font-mono bg-muted/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-foreground/90 select-all">
                    {d.dork}
                  </pre>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => copyDork(d.dork, i)}
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3 mr-1 text-green-400" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedIdx === i ? "Copied" : "Copy"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(d.dork)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Open in Google
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
