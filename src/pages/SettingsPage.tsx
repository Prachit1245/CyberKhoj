import { useState, useEffect, useRef, useMemo } from "react";
import EthicalDisclaimer from "@/components/EthicalDisclaimer";
import {
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Shield,
  AlertTriangle,
  Check,
  ExternalLink,
  HardDrive,
  Settings2,
  Database,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  Accessibility,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { getApiKey, saveApiKey, removeApiKey, hasApiKey, validateApiKey, validateKeyFormat } from "@/lib/ai";
import { resetTour, isTourCompleted } from "@/components/OnboardingTour";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { triggerManualLock, getSessionTimeout, setSessionTimeout, type TimeoutOption } from "@/hooks/useSessionLock";
import { Lock } from "lucide-react";

/* ─── Preferences stored in localStorage ─── */
const PREFS_KEY = "hackmind_prefs";

interface Prefs {
  analysisDepth: "quick" | "deep";
  autoSaveHistory: boolean;
  showUsageCounter: boolean;
  animations: boolean;
  typingSound: boolean;
  beginnerMode: boolean;
  reduceMotion: boolean;
}

const DEFAULT_PREFS: Prefs = {
  analysisDepth: "deep",
  autoSaveHistory: true,
  showUsageCounter: true,
  animations: true,
  typingSound: false,
  beginnerMode: false,
  reduceMotion: false,
};

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
};

const savePrefs = (p: Prefs) => localStorage.setItem(PREFS_KEY, JSON.stringify(p));

/* ─── Validate key helper ─── */

/* ─── Toggle Component ─── */
const Toggle = ({
  enabled,
  onToggle,
  label,
  description,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description: string;
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div>
      <p className="text-sm font-mono text-foreground" id={`toggle-${label.replace(/\s+/g, "-").toLowerCase()}`}>{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      aria-labelledby={`toggle-${label.replace(/\s+/g, "-").toLowerCase()}`}
      className={`shrink-0 transition-colors ${enabled ? "text-primary" : "text-muted-foreground"}`}
    >
      {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
    </button>
  </div>
);

/* ─── Section Wrapper ─── */
const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border/60 bg-card/50 overflow-hidden">
    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/30">
      <span className="text-primary">{icon}</span>
      <h2 className="font-heading font-bold text-foreground text-sm">{title}</h2>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

/* ─── Confirm Dialog ─── */
const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-xl border border-destructive/30 bg-card p-6 space-y-4 animate-scale-in">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-destructive" />
          <h3 id="confirm-title" className="font-heading font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-heading font-bold text-destructive-foreground hover:brightness-110 transition-all"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-heading font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const SettingsPage = () => {
  /* API Key state */
  const [keySet, setKeySet] = useState(hasApiKey());
  const [newKey, setNewKey] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { canInstall, isInstalled, install } = usePWAInstall();

  /* Prefs state */
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);

  /* Confirm dialog */
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);

  const maskedKey = () => {
    const k = getApiKey();
    if (!k) return "—";
    const first = k.slice(0, 4);
    const last = k.slice(-4);
    return `${first}****...****${last}`;
  };

  /* ── API Key Actions ── */
  const testKey = async () => {
    const k = getApiKey();
    if (!k) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await validateApiKey(k);
      if (result.ok) {
        setTestResult("ok");
        toast.success("API key is valid");
      } else {
        setTestResult("fail");
        toast.error(result.error || "API key validation failed");
      }
    } catch {
      setTestResult("fail");
      toast.error("Could not reach Groq API");
    } finally {
      setTesting(false);
    }
  };

  const handleReplaceKey = async () => {
    const trimmed = newKey.trim();
    const formatCheck = validateKeyFormat(trimmed);
    if (!formatCheck.valid) {
      toast.error(formatCheck.error || "Invalid key format");
      return;
    }
    const result = await validateApiKey(trimmed);
    if (!result.ok) {
      toast.error(result.error || "Key rejected by Groq");
      return;
    }
    saveApiKey(trimmed);
    setKeySet(true);
    setNewKey("");
    setReplacing(false);
    setTestResult(null);
    toast.success("API key replaced successfully");
  };

  const handleRemoveKey = () => {
    removeApiKey();
    setKeySet(false);
    setReplacing(false);
    setTestResult(null);
    toast.success("API key removed");
  };

  /* ── Prefs Actions ── */
  const updatePref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      return next;
    });
  };

  /* ── Data Management ── */
  const storageKeys = [
    "cyberkhoj_groq_key",
    "hackmind_history",
    "hackmind_findings",
    "hackmind_owasp_coverage",
    "hackmind_usage",
    "hackmind_prefs",
    "hackmind_stats",
    "hackmind_bookmarked_payloads",
    "hackmind_bookmarks",
    "hackmind_monthly_goal",
    "hackmind_achievements",
  ];

  const ARRAY_KEYS: Record<string, string> = {
    hackmind_history: "id",
    hackmind_findings: "id",
    hackmind_bookmarked_payloads: "id",
    hackmind_bookmarks: "id",
  };

  const [importSummary, setImportSummary] = useState<string | null>(null);

  const storageSize = useMemo(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += key.length + (localStorage.getItem(key)?.length || 0);
      }
    }
    return total;
  }, []);

  const formatBytes = (chars: number) => {
    const bytes = chars * 2;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const exportData = () => {
    const data: Record<string, unknown> = { _version: 1, _exportedAt: new Date().toISOString() };
    storageKeys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) {
        try { data[key] = JSON.parse(val); } catch { data[key] = val; }
      }
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cyberkhoj-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported successfully");
  };

  const mergeArrayById = (existing: unknown[], incoming: unknown[], idField: string): { merged: unknown[]; newCount: number } => {
    const existingIds = new Set(
      existing.filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .map((e) => e[idField])
    );
    const newItems = (incoming as Record<string, unknown>[]).filter(
      (item) => item && typeof item === "object" && !existingIds.has(item[idField])
    );
    return { merged: [...existing, ...newItems], newCount: newItems.length };
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data !== "object" || !data) throw new Error("Invalid format");

        const summary: string[] = [];
        const labels: Record<string, string> = {
          hackmind_history: "analyses",
          hackmind_findings: "findings",
          hackmind_bookmarked_payloads: "bookmarks",
          hackmind_owasp_coverage: "OWASP coverage",
          hackmind_prefs: "preferences",
          hackmind_stats: "stats",
          hackmind_usage: "usage data",
          cyberkhoj_groq_key: "API key",
        };

        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith("_") || !storageKeys.includes(key)) return;

          const idField = ARRAY_KEYS[key];
          if (idField && Array.isArray(value)) {
            const existingRaw = localStorage.getItem(key);
            const existing = existingRaw ? JSON.parse(existingRaw) : [];
            const { merged, newCount } = mergeArrayById(
              Array.isArray(existing) ? existing : [],
              value,
              idField
            );
            localStorage.setItem(key, JSON.stringify(merged));
            if (newCount > 0) summary.push(`${newCount} ${labels[key] || key}`);
          } else {
            localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
            summary.push(labels[key] || key);
          }
        });

        setKeySet(hasApiKey());
        setPrefs(loadPrefs());
        const msg = summary.length > 0
          ? `Imported ${summary.join(", ")}.`
          : "Backup applied — no new data to merge.";
        setImportSummary(msg);
        toast.success(msg);
      } catch {
        toast.error("Invalid backup file — could not parse JSON");
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const clearStorage = (key: string, label: string) => {
    localStorage.removeItem(key);
    if (key === "cyberkhoj_groq_key") setKeySet(false);
    toast.success(`${label} cleared`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ─── API Key Section ─── */}
      <Section icon={<Key size={16} />} title="Groq API Key">
        {keySet ? (
          <div className="space-y-4">
            {/* Key Health indicator */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/50 px-4 py-3">
              <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${
                testResult === "fail" ? "bg-destructive" : "bg-primary"
              }`} />
              <span className="text-sm font-mono text-foreground">
                {testResult === "fail" ? "Key Invalid" : "Key Active"}
              </span>
              <span className="text-xs font-mono text-muted-foreground ml-auto break-all">
                {maskedKey()}
              </span>
            </div>

            {/* Test result indicator */}
            {testResult && (
              <div
                className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-md ${
                  testResult === "ok"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
              >
                {testResult === "ok" ? <Check size={13} /> : <AlertTriangle size={13} />}
                {testResult === "ok" ? "Key is valid and working" : "Key validation failed"}
              </div>
            )}

            {/* Replace key form */}
            {replacing && (
              <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
                <label htmlFor="replace-key-input" className="sr-only">New API Key</label>
                <div className="relative">
                  <input
                    id="replace-key-input"
                    type={showNewKey ? "text" : "password"}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Paste new API key..."
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewKey(!showNewKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showNewKey ? "Hide key" : "Show key"}
                  >
                    {showNewKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReplaceKey}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-heading font-bold text-primary-foreground hover:brightness-110 transition-all"
                  >
                    Save New Key
                  </button>
                  <button
                    onClick={() => {
                      setReplacing(false);
                      setNewKey("");
                    }}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={testKey}
                disabled={testing}
                className="flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-2 text-xs font-mono text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
              >
                <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
                {testing ? "Testing…" : "Test Key"}
              </button>
              <button
                onClick={() => setReplacing(true)}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                <Key size={13} />
                Replace Key
              </button>
              <button
                onClick={() =>
                  setConfirm({
                    title: "Remove API Key",
                    message:
                      "This will remove your saved API key. You'll need to re-enter it to use CyberKhoj.",
                    action: handleRemoveKey,
                  })
                }
                className="flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-xs font-mono text-destructive hover:bg-destructive/10 transition-all"
              >
                <Trash2 size={13} />
                Remove Key
              </button>
            </div>

            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
            >
              <ExternalLink size={11} />
              Get a new API key from console.groq.com
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-mono">
              CyberKhoj uses Groq AI (free) to generate attack paths. Get your free key at console.groq.com
            </p>
            <a
              href="https://console.groq.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 justify-center w-full rounded-lg bg-primary px-4 py-2.5 font-heading font-bold text-primary-foreground hover:brightness-110 transition-all text-sm"
            >
              Get Free Groq Key →
            </a>
          </div>
        )}
      </Section>

      {/* ─── Tour Section ─── */}
      <Section icon={<Settings2 size={16} />} title="Onboarding Tour">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-mono">
            {isTourCompleted() 
              ? "You've completed the onboarding tour." 
              : "You haven't completed the onboarding tour yet."}
          </p>
          <button
            onClick={() => {
              resetTour();
              toast.success("Tour restarted! Navigate to the Analyzer page.");
            }}
            className="flex items-center gap-2 rounded-md border border-primary/40 px-4 py-2 text-xs font-mono text-primary hover:bg-primary/10 transition-all"
          >
            <RefreshCw size={13} />
            Restart Onboarding Tour
          </button>
        </div>
      </Section>

      {/* ─── Install App Section ─── */}
      <Section icon={<Smartphone size={16} />} title="Install App">
        <div className="space-y-3">
          {isInstalled ? (
            <p className="text-sm text-primary font-mono flex items-center gap-2">
              <Check size={14} /> CyberKhoj is installed on this device
            </p>
          ) : canInstall ? (
            <>
              <p className="text-sm text-muted-foreground font-mono">
                Install CyberKhoj as a standalone app for offline access and a native experience.
              </p>
              <button
                onClick={async () => {
                  const ok = await install();
                  if (ok) toast.success("CyberKhoj installed!");
                }}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-heading font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
              >
                <Download size={13} />
                Add to Home Screen
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground font-mono">
              Open CyberKhoj in Chrome or Safari on mobile to install it as an app. On desktop, look for the install icon in your browser's address bar.
            </p>
          )}
        </div>
      </Section>

      {/* ─── Preferences Section ─── */}
      <Section icon={<Settings2 size={16} />} title="Preferences">
        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-mono text-foreground">Default Analysis Depth</p>
              <p className="text-xs text-muted-foreground">
                Quick scans are faster; deep scans are more thorough.
              </p>
            </div>
            <div className="flex rounded-md border border-border overflow-hidden shrink-0">
              <button
                onClick={() => updatePref("analysisDepth", "quick")}
                className={`px-3 py-1.5 text-xs font-mono transition-all ${
                  prefs.analysisDepth === "quick"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Quick
              </button>
              <button
                onClick={() => updatePref("analysisDepth", "deep")}
                className={`px-3 py-1.5 text-xs font-mono transition-all ${
                  prefs.analysisDepth === "deep"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Deep
              </button>
            </div>
          </div>

          <Toggle
            enabled={prefs.autoSaveHistory}
            onToggle={() => updatePref("autoSaveHistory", !prefs.autoSaveHistory)}
            label="Auto-save History"
            description="Automatically save analysis results to history."
          />
          <Toggle
            enabled={prefs.showUsageCounter}
            onToggle={() => updatePref("showUsageCounter", !prefs.showUsageCounter)}
            label="Show Usage Counter"
            description="Display daily usage counter in the sidebar."
          />
          <Toggle
            enabled={prefs.animations}
            onToggle={() => updatePref("animations", !prefs.animations)}
            label="Animations"
            description="Disable for better performance on low-end devices."
          />
          <Toggle
            enabled={prefs.typingSound}
            onToggle={() => updatePref("typingSound", !prefs.typingSound)}
            label="Typing Sound Effect"
            description="Play subtle keystroke sounds during AI analysis."
          />
          <Toggle
            enabled={prefs.beginnerMode}
            onToggle={() => updatePref("beginnerMode", !prefs.beginnerMode)}
            label="Beginner Mode"
            description="Show simplified explanations and glossary tooltips for technical terms."
          />
        </div>
      </Section>

      {/* ─── Accessibility Section ─── */}
      <Section icon={<Accessibility size={16} />} title="Accessibility">
        <div className="divide-y divide-border/30">
          <Toggle
            enabled={prefs.reduceMotion}
            onToggle={() => {
              const next = !prefs.reduceMotion;
              updatePref("reduceMotion", next);
              // Apply immediately
              if (next) {
                document.documentElement.classList.add("reduce-motion");
              } else {
                document.documentElement.classList.remove("reduce-motion");
              }
            }}
            label="Reduce Motion"
            description="Disable all animations and transitions for accessibility or performance."
          />
          <div className="py-3">
            <p className="text-xs text-muted-foreground font-mono">
              All interactive elements have keyboard focus indicators. Color information is always accompanied by icons or text labels. Screen readers can use the skip-to-content link and all form fields have labels.
            </p>
          </div>
        </div>
      </Section>

      {/* ─── Ethical Use Section ─── */}
      <Section icon={<Shield size={16} />} title="Ethical Use Policy">
        <EthicalDisclaimer />
      </Section>

      {/* ─── Data Management Section ─── */}
      <Section icon={<Database size={16} />} title="Data Management">
        <div className="space-y-4">
          {/* Storage size */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/50 px-4 py-3">
            <HardDrive size={15} className="text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-mono text-muted-foreground">Local Storage Used</p>
              <p className="text-sm font-mono text-foreground font-bold">
                {formatBytes(storageSize)}
              </p>
            </div>
          </div>

          {/* Export / Import */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-1.5 rounded-md border border-primary/40 px-3 py-2 text-xs font-mono text-primary hover:bg-primary/10 transition-all"
              >
                <Download size={13} />
                Export Everything
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                <Upload size={13} />
                Import Backup
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={importData}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              Export includes: history, findings, bookmarks, settings, OWASP checklist & stats.
            </p>
            {importSummary && (
              <div className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-md bg-primary/10 text-primary border border-primary/20">
                <Check size={13} />
                {importSummary}
              </div>
            )}
          </div>

          {/* Clear actions */}
          <div className="border-t border-border/30 pt-3 space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Clear Data
            </p>
            {[
              {
                key: "hackmind_history",
                label: "Analysis History",
                desc: "Remove all past analysis results",
              },
              {
                key: "hackmind_findings",
                label: "Findings",
                desc: "Remove all logged vulnerability findings",
              },
              {
                key: "hackmind_owasp_coverage",
                label: "OWASP Coverage",
                desc: "Reset OWASP Top 10 checklist progress",
              },
              {
                key: "hackmind_usage",
                label: "Usage Counter",
                desc: "Reset today's usage counter to zero",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div>
                  <p className="text-sm font-mono text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <button
                  onClick={() =>
                    setConfirm({
                      title: `Clear ${item.label}?`,
                      message: `This will permanently delete all ${item.label.toLowerCase()} data. This cannot be undone.`,
                      action: () => clearStorage(item.key, item.label),
                    })
                  }
                  className="shrink-0 flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-mono text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        onConfirm={() => {
          confirm?.action();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

export default SettingsPage;
