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
  const [ideas, setIdeas] = useState<AttackIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [counter, setCounter] = useState(0);
  const counterRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => { if (counterRef.current) clearInterval(counterRef.current); }, []);

  const generate = async () => {
    if (!domain.trim()) { toast.error("Enter a target domain"); return; }
    setLoading(true);
    setIdeas([]);
    setCounter(0);

    // Animate counter
    let c = 0;
    counterRef.current = setInterval(() => {
      c += 1 + Math.floor(Math.random() * 2);
      if (c > 97) c = 97;
      setCounter(c);
    }, 180);

    try {
      const raw = await callGemini(buildAttackModePrompt(domain, templateContext || undefined));
      if (counterRef.current) clearInterval(counterRef.current);

      const parsed = parseAttackIdeas(raw);
      setIdeas(parsed);
      setCounter(parsed.length);
      toast.success(`Generated ${parsed.length} attack ideas ✓`);
    } catch (err: any) {
      if (counterRef.current) clearInterval(counterRef.current);
      setCounter(0);
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

  return (
    <div className="space-y-6 max-w-5xl">
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
          disabled={loading}
          className="h-12 px-6 rounded-lg font-heading font-bold text-sm text-white transition-all disabled:opacity-50 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, hsl(0 80% 50%), hsl(25 95% 53%))",
          }}
        >
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {loading ? "GENERATING..." : "GENERATE 100 ATTACK IDEAS"}
          </span>
        </button>
      </div>

      {/* Counter */}
      {(loading || ideas.length > 0) && (
        <div className="text-center">
          <span className="text-5xl font-heading font-bold tabular-nums" style={{
            background: "linear-gradient(135deg, hsl(0 80% 50%), hsl(25 95% 53%))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {counter}
          </span>
          <span className="text-muted-foreground font-mono text-sm ml-2">/ 100 ideas</span>
        </div>
      )}

      {/* Ideas Grid */}
      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="flex gap-3 p-3 rounded-lg border border-border/20 bg-card/30 hover:border-primary/20 transition-colors animate-fade-in"
            >
              <span className="text-xs font-mono text-muted-foreground/50 mt-0.5 shrink-0 w-6 text-right">
                {idea.id}.
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-foreground font-medium">{idea.idea}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${catColor(idea.category)}`}>
                    {idea.category}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    idea.difficulty === "advanced" ? "text-red-400 border-red-400/30" :
                    idea.difficulty === "intermediate" ? "text-yellow-400 border-yellow-400/30" :
                    "text-primary border-primary/30"
                  }`}>{idea.difficulty}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    idea.priority === "high" ? "text-red-400 border-red-400/30" :
                    idea.priority === "medium" ? "text-orange-400 border-orange-400/30" :
                    "text-muted-foreground border-border/30"
                  }`}>{idea.priority}</span>
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
