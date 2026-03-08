import { useState, useEffect, useRef } from "react";
import { AlertTriangle, Zap, ShoppingCart, LogIn, Server, Shield, Upload } from "lucide-react";
import { callGemini } from "@/lib/gemini";
import { buildAttackModePrompt, parseAttackIdeas, type AttackIdea } from "@/lib/prompts";
import { toast } from "sonner";

const TEMPLATES = [
  { label: "E-commerce Site", icon: ShoppingCart, context: "e-commerce web application with cart, checkout, payments" },
  { label: "Login Page", icon: LogIn, context: "authentication page with login, signup, password reset" },
  { label: "REST API", icon: Server, context: "REST API with CRUD endpoints, token auth, rate limiting" },
  { label: "Admin Panel", icon: Shield, context: "admin dashboard with user management, settings, logs" },
  { label: "File Upload", icon: Upload, context: "file upload feature accepting images, documents, media" },
];

const AttackMode = () => {
  const [domain, setDomain] = useState("");
  const [templateContext, setTemplateContext] = useState("");
  const [allIdeas, setAllIdeas] = useState<AttackIdea[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const streamRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => { if (streamRef.current) clearInterval(streamRef.current); }, []);

  const generate = async () => {
    if (!domain.trim()) { toast.error("Enter a target domain"); return; }
    setLoading(true);
    setAllIdeas([]);
    setVisibleCount(0);
    if (streamRef.current) clearInterval(streamRef.current);

    try {
      const raw = await callGemini(buildAttackModePrompt(domain, templateContext || undefined));
      const parsed = parseAttackIdeas(raw);
      setAllIdeas(parsed);

      // Simulate streaming reveal
      let shown = 0;
      streamRef.current = setInterval(() => {
        shown += 1;
        setVisibleCount(shown);
        if (shown >= parsed.length) {
          if (streamRef.current) clearInterval(streamRef.current);
          toast.success(`Generated ${parsed.length} attack ideas ✓`);
        }
      }, 50);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (t: typeof TEMPLATES[0]) => {
    setTemplateContext(t.context);
    if (!domain.trim()) setDomain(t.label.toLowerCase().replace(/\s+/g, "-") + ".example.com");
    toast.info(`Template applied: ${t.label}`);
  };

  const catColor = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("xss")) return "text-yellow-400 border-yellow-400/30";
    if (c.includes("sql")) return "text-red-400 border-red-400/30";
    if (c.includes("auth")) return "text-orange-400 border-orange-400/30";
    if (c.includes("idor")) return "text-purple-400 border-purple-400/30";
    if (c.includes("ssrf")) return "text-cyan-400 border-cyan-400/30";
    if (c.includes("logic")) return "text-pink-400 border-pink-400/30";
    if (c.includes("rce")) return "text-red-500 border-red-500/30";
    return "text-primary border-primary/30";
  };

  const diffDot = (d: string) =>
    d === "advanced" ? "bg-red-500" : d === "intermediate" ? "bg-yellow-500" : "bg-emerald-500";

  const total = allIdeas.length;
  const visible = allIdeas.slice(0, visibleCount);
  const progress = total > 0 ? (visibleCount / total) * 100 : 0;
  const streaming = visibleCount > 0 && visibleCount < total;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">ATTACK MODE</h1>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-xs font-mono text-yellow-500/90">
          Only test systems you own or have explicit written permission to test.
        </p>
      </div>

      {/* Quick Templates */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => selectTemplate(t)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                templateContext === t.context
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input + Button */}
      <div className="flex gap-3">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !loading && generate()}
          placeholder="example.com"
          className="flex-1 h-12 rounded-lg bg-card/50 border border-border/30 px-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
        <button
          onClick={generate}
          disabled={loading || streaming}
          className="h-12 px-6 rounded-lg font-heading font-bold text-sm text-white transition-all disabled:opacity-50 cursor-pointer"
          style={{ background: "linear-gradient(135deg, hsl(0 80% 50%), hsl(25 95% 53%))" }}
        >
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {loading ? "GENERATING..." : streaming ? "STREAMING..." : "GENERATE 100 ATTACK IDEAS"}
          </span>
        </button>
      </div>

      {/* Progress + Counter */}
      {(loading || visibleCount > 0) && (
        <div className="space-y-2">
          {/* Progress bar */}
          <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "hsl(0 0% 15%)" }}>
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${loading && visibleCount === 0 ? 30 : progress}%`,
                background: "linear-gradient(90deg, hsl(0 80% 50%), hsl(25 95% 53%))",
              }}
            />
          </div>
          <div className="text-center">
            <span className="text-5xl font-heading font-bold tabular-nums" style={{
              background: "linear-gradient(135deg, hsl(0 80% 50%), hsl(25 95% 53%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              {visibleCount}
            </span>
            <span className="text-muted-foreground font-mono text-sm ml-2">/ {total || 100} ideas</span>
          </div>
        </div>
      )}

      {/* Ideas Grid */}
      {visible.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {visible.map((idea) => (
            <div
              key={idea.id}
              className="p-3 rounded-lg border border-border/20 bg-card/30 hover:border-primary/20 transition-colors animate-fade-in"
            >
              <div className="flex items-start gap-2">
                {/* Number badge */}
                <span className="shrink-0 flex items-center justify-center h-6 w-9 rounded bg-muted/30 text-[10px] font-mono text-muted-foreground font-bold">
                  #{String(idea.id).padStart(3, "0")}
                </span>
                {/* Difficulty dot */}
                <span className={`shrink-0 mt-2 h-2 w-2 rounded-full ${diffDot(idea.difficulty)}`} title={idea.difficulty} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-mono text-xs text-foreground leading-relaxed">{idea.idea}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${catColor(idea.category)}`}>
                      {idea.category}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      idea.priority === "high" ? "text-red-400 border-red-400/30" :
                      idea.priority === "medium" ? "text-orange-400 border-orange-400/30" :
                      "text-muted-foreground border-border/30"
                    }`}>{idea.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttackMode;
