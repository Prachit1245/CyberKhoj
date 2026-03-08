import { useState, useEffect } from "react";

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Listen globally for the install prompt
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("pwa-installable"));
  });
}

export const usePWAInstall = () => {
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const onInstallable = () => setCanInstall(true);
    window.addEventListener("pwa-installable", onInstallable);

    // Also check if prompt is already captured
    if (deferredPrompt) setCanInstall(true);

    return () => window.removeEventListener("pwa-installable", onInstallable);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    if (outcome === "accepted") setIsInstalled(true);
    return outcome === "accepted";
  };

  return { canInstall, isInstalled, install };
};
