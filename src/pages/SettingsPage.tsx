import { useState, useEffect, useRef, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "@/components/Toast";
import { getApiKey, saveApiKey, removeApiKey, hasApiKey } from "@/lib/gemini";
import { resetTour, isTourCompleted } from "@/components/OnboardingTour";
import { usePWAInstall } from "@/hooks/usePWAInstall";

/* ─── Preferences stored in localStorage ─── */
const PREFS_KEY = "hackmind_prefs";

interface Prefs {
  analysisDepth: "quick" | "deep";
  autoSaveHistory: boolean;
  showUsageCounter: boolean;
  animations: boolean;
  typingSound: boolean;
  beginnerMode: boolean;
}

const DEFAULT_PREFS: Prefs = {
  analysisDepth: "deep",
  autoSaveHistory: true,
  showUsageCounter: true,
  animations: true,
  typingSound: false,
  beginnerMode: false,
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
const MODEL_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

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
      <p className="text-sm font-mono text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <button
      onClick={onToggle}
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
      <div className="w-full max-w-sm rounded-xl border border-destructive/30 bg-card p-6 space-y-4 animate-scale-in">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-destructive" />
          <h3 className="font-heading font-bold text-foreground">{title}</h3>
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
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
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
    return k.slice(0, 6) + "•".repeat(8) + k.slice(-4);
  };

  /* ── API Key Actions ── */
  const testKey = async () => {
    const k = getApiKey();
    if (!k) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${MODEL_URL}?key=${k}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
      });
      if (res.ok || res.status === 429) {
        setTestResult("ok");
        toast.success("API key is valid" + (res.status === 429 ? " (quota exhausted)" : ""));
      } else {
        setTestResult("fail");
        toast.error("API key validation failed — check your key");
      }
    } catch {
      setTestResult("fail");
      toast.error("Could not reach Gemini API");
    } finally {
      setTesting(false);
    }
  };

  const handleReplaceKey = () => {
    const trimmed = newKey.trim();
    if (!trimmed || trimmed.length < 10) {
      toast.error("Please enter a valid API key");
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
    "hackmind_gemini_key",
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
    a.download = `hackmind-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          hackmind_gemini_key: "API key",
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
    if (key === "hackmind_gemini_key") setKeySet(false);
    toast.success(`${label} cleared`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* ─── API Key Section ─── */}
      <Section icon={<Key size={16} />} title="API Key">
        {keySet ? (
          <div className="space-y-4">
            {/* Current key display */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border/50 px-4 py-3">
              <p className="text-sm font-mono text-foreground flex-1 break-all">
                {showKey ? getApiKey() : maskedKey()}
              </p>
              <button
                onClick={() => setShowKey(!showKey)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
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
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Paste new API key..."
                  className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
                />
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
                      "This will remove your saved API key. You'll need to re-enter it to use HackMind.",
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
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
            >
              <ExternalLink size={11} />
              Get a new API key from Google AI Studio
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-mono">
              No API key set. You'll need one to use HackMind.
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 justify-center w-full rounded-lg bg-primary px-4 py-2.5 font-heading font-bold text-primary-foreground hover:brightness-110 transition-all text-sm"
            >
              Get Free API Key →
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
              <Check size={14} /> HackMind is installed on this device
            </p>
          ) : canInstall ? (
            <>
              <p className="text-sm text-muted-foreground font-mono">
                Install HackMind as a standalone app for offline access and a native experience.
              </p>
              <button
                onClick={async () => {
                  const ok = await install();
                  if (ok) toast.success("HackMind installed!");
                }}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-heading font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
              >
                <Download size={13} />
                Add to Home Screen
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground font-mono">
              Open HackMind in Chrome or Safari on mobile to install it as an app. On desktop, look for the install icon in your browser's address bar.
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
        </div>
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
