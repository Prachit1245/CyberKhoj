import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Crosshair,
  ToggleLeft,
  ToggleRight,
  Shield,
  Bug,
  Zap,
  AlertTriangle,
  BookOpen,
  Wrench,
  FileText,
  Code2,
  Target,
} from "lucide-react";
import { VULN_CATEGORIES, type VulnCategory } from "@/lib/vulnCategories";

const RISK_COLORS: Record<string, string> = {
  Critical: "bg-red-500/20 text-red-400 border-red-500/30",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const RISK_DOT: Record<string, string> = {
  Critical: "bg-red-400",
  High: "bg-orange-400",
  Medium: "bg-yellow-400",
  Low: "bg-blue-400",
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
    </button>
  );
};

const VulnCard = ({
  vuln,
  expanded,
  onToggle,
  simple,
}: {
  vuln: VulnCategory;
  expanded: boolean;
  onToggle: () => void;
  simple: boolean;
}) => {
  const navigate = useNavigate();

  const handleAnalyze = () => {
    sessionStorage.setItem(
      "hackmind_prefill",
      JSON.stringify({ target: "", templateContext: vuln.analyzerContext })
    );
    navigate("/analyzer");
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 overflow-hidden transition-all hover:border-primary/30">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group"
      >
        <span className="text-muted-foreground group-hover:text-primary transition-colors">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
        <div className={`w-2 h-2 rounded-full shrink-0 ${RISK_DOT[vuln.riskLevel]}`} />
        <h3 className="font-heading font-bold text-foreground flex-1">{vuln.name}</h3>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${RISK_COLORS[vuln.riskLevel]}`}>
          {vuln.riskLevel}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border/30 pt-4 animate-fade-in">
          {/* Definition */}
          <Section icon={<BookOpen size={14} />} title="Definition">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {simple ? vuln.simpleDefinition : vuln.definition}
            </p>
          </Section>

          {/* How It Works */}
          <Section icon={<Zap size={14} />} title="How It Works">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {simple ? vuln.simpleHowItWorks : vuln.howItWorks}
            </p>
          </Section>

          {/* CVE Example */}
          <Section icon={<AlertTriangle size={14} />} title="Real CVE Example">
            <div className="rounded-md bg-muted/30 border border-border/50 px-3 py-2.5">
              <p className="text-xs font-mono text-primary mb-1">{vuln.cveExample.id}</p>
              <p className="text-xs text-muted-foreground">{vuln.cveExample.description}</p>
            </div>
          </Section>

          {/* Detection */}
          <Section icon={<Target size={14} />} title="Detection Techniques">
            <ul className="space-y-1.5">
              {vuln.detectionTechniques.map((t, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">›</span>
                  {t}
                </li>
              ))}
            </ul>
          </Section>

          {/* Payloads */}
          <Section icon={<Code2 size={14} />} title="Payload Examples">
            <div className="space-y-1.5">
              {vuln.payloads.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded bg-muted/40 border border-border/30 px-3 py-1.5">
                  <code className="text-xs font-mono text-foreground flex-1 break-all">{p}</code>
                  <CopyButton text={p} />
                </div>
              ))}
            </div>
          </Section>

          {/* Tools */}
          <Section icon={<Wrench size={14} />} title="Tools">
            <div className="flex flex-wrap gap-2">
              {vuln.tools.map((t) => (
                <span key={t} className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {t}
                </span>
              ))}
            </div>
          </Section>

          {/* Writeup Links */}
          <Section icon={<FileText size={14} />} title="Writeups & References">
            <div className="space-y-1.5">
              {vuln.writeupLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline font-mono"
                >
                  <ExternalLink size={11} />
                  {link.title}
                </a>
              ))}
            </div>
          </Section>

          {/* Remediation */}
          <Section icon={<Shield size={14} />} title="Remediation">
            <ul className="space-y-1.5">
              {vuln.remediation.map((r, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </Section>

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/30 px-4 py-2.5 text-sm font-heading font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Crosshair size={15} />
            Analyze For This
          </button>
        </div>
      )}
    </div>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h4 className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-foreground/70">
      <span className="text-primary">{icon}</span>
      {title}
    </h4>
    {children}
  </div>
);

const VulnCategories = () => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simple, setSimple] = useState(false);
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return VULN_CATEGORIES;
    const q = search.toLowerCase();
    return VULN_CATEGORIES.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.definition.toLowerCase().includes(q) ||
        v.riskLevel.toLowerCase().includes(q)
    );
  }, [search]);

  const scrollTo = (id: string) => {
    setExpandedId(id);
    setActiveNav(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Risk level counts
  const counts = useMemo(() => {
    const c = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    VULN_CATEGORIES.forEach((v) => c[v.riskLevel]++);
    return c;
  }, []);

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Side Navigation */}
      <aside className="hidden lg:block w-56 shrink-0 sticky top-0 self-start space-y-4 pt-1">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Categories</h3>
        <nav className="space-y-0.5">
          {VULN_CATEGORIES.map((v) => (
            <button
              key={v.id}
              onClick={() => scrollTo(v.id)}
              className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                activeNav === v.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${RISK_DOT[v.riskLevel]}`} />
              {v.name}
            </button>
          ))}
        </nav>

        {/* Risk breakdown */}
        <div className="border-t border-border/30 pt-3 space-y-1.5">
          <h4 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Risk Breakdown</h4>
          {(["Critical", "High", "Medium", "Low"] as const).map((level) => (
            <div key={level} className="flex items-center justify-between text-xs font-mono">
              <span className={`flex items-center gap-1.5 ${RISK_COLORS[level].split(" ")[1]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${RISK_DOT[level]}`} />
                {level}
              </span>
              <span className="text-muted-foreground">{counts[level]}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bug size={20} className="text-primary" />
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Vulnerability Categories
            </h2>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            Comprehensive reference for {VULN_CATEGORIES.length} vulnerability types — definitions, payloads, tools & remediation.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vulnerabilities..."
              className="w-full rounded-lg border border-border bg-muted/30 pl-9 pr-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
            />
          </div>
          <button
            onClick={() => setSimple(!simple)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-mono transition-all shrink-0 ${
              simple
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {simple ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Explain Simply
          </button>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground font-mono text-sm">
              No vulnerabilities match "{search}"
            </div>
          )}
          {filtered.map((vuln) => (
            <div key={vuln.id} ref={(el) => { cardRefs.current[vuln.id] = el; }}>
              <VulnCard
                vuln={vuln}
                expanded={expandedId === vuln.id}
                onToggle={() => {
                  setExpandedId(expandedId === vuln.id ? null : vuln.id);
                  setActiveNav(vuln.id);
                }}
                simple={simple}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VulnCategories;
