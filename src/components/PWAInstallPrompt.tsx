import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const PWAInstallPrompt = () => {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!canInstall || isInstalled || dismissed) return;

    // Check if previously dismissed this session
    if (sessionStorage.getItem("hackmind_pwa_dismissed")) {
      setDismissed(true);
      return;
    }

    const timer = setTimeout(() => setShow(true), 30000);
    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, dismissed]);

  if (!show || !canInstall || isInstalled) return null;

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem("hackmind_pwa_dismissed", "1");
  };

  const handleInstall = async () => {
    await install();
    setShow(false);
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[70] animate-fade-in">
      <div className="rounded-xl border border-primary/30 bg-card shadow-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-primary shrink-0" />
            <div>
              <p className="text-sm font-heading font-bold text-foreground">Install HackMind</p>
              <p className="text-xs font-mono text-muted-foreground">
                Add to home screen for offline access
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-0.5">
            <X size={16} />
          </button>
        </div>
        <button
          onClick={handleInstall}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-heading font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
        >
          Install App
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
