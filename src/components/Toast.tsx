import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";

/* ─── Types ─── */
type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  dismissing?: boolean;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* ─── Standalone toast function (works outside React) ─── */
let _globalDispatch: ToastContextValue | null = null;

export const toast = {
  success: (msg: string) => _globalDispatch?.success(msg),
  error: (msg: string) => _globalDispatch?.error(msg),
  warning: (msg: string) => _globalDispatch?.warning(msg),
  info: (msg: string) => _globalDispatch?.info(msg),
};

/* ─── Styles ─── */
const TYPE_CONFIG: Record<ToastType, { icon: typeof CheckCircle; colors: string; barColor: string }> = {
  success: {
    icon: CheckCircle,
    colors: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    barColor: "bg-emerald-500",
  },
  error: {
    icon: AlertCircle,
    colors: "border-red-500/40 bg-red-500/10 text-red-400",
    barColor: "bg-red-500",
  },
  warning: {
    icon: AlertTriangle,
    colors: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    barColor: "bg-yellow-500",
  },
  info: {
    icon: Info,
    colors: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
    barColor: "bg-cyan-500",
  },
};

const AUTO_DISMISS_MS = 4000;

/* ─── Single Toast ─── */
const ToastComponent = ({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) => {
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const raf = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(pct);
      if (pct > 0) requestAnimationFrame(raf);
    };
    const id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`relative flex items-start gap-3 w-80 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-xl transition-all duration-300 ${config.colors} ${
        item.dismissing
          ? "animate-slide-out-right opacity-0 translate-x-4"
          : "animate-slide-in-right"
      }`}
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
      role="alert"
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-mono leading-snug text-foreground">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-lg overflow-hidden bg-transparent">
        <div
          className={`h-full ${config.barColor} transition-none`}
          style={{ width: `${progress}%`, opacity: 0.5 }}
        />
      </div>
    </div>
  );
};

/* ─── Provider ─── */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Start dismiss animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissing: true } : t)));
    // Remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
    // Clear timer
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const item: ToastItem = { id, type, message };

      setToasts((prev) => {
        // Limit stack to 5
        const updated = [...prev, item];
        if (updated.length > 5) {
          const oldest = updated[0];
          dismiss(oldest.id);
        }
        return updated;
      });

      // Auto-dismiss
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  const contextValue: ToastContextValue = {
    success: useCallback((msg: string) => addToast("success", msg), [addToast]),
    error: useCallback((msg: string) => addToast("error", msg), [addToast]),
    warning: useCallback((msg: string) => addToast("warning", msg), [addToast]),
    info: useCallback((msg: string) => addToast("info", msg), [addToast]),
  };

  // Register global dispatch
  useEffect(() => {
    _globalDispatch = contextValue;
    return () => {
      _globalDispatch = null;
    };
  }, [contextValue]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastComponent item={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

/* ─── Hook ─── */
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
