import { useEffect, useState } from "react";
import { isStorageAvailable } from "@/lib/storage";
import { AlertTriangle, X } from "lucide-react";

export default function PrivateBrowsingBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check immediately
    if (!isStorageAvailable()) setShow(true);

    // Also listen for deferred detection
    const handler = () => setShow(true);
    window.addEventListener("hackmind:storage-unavailable", handler);
    return () => window.removeEventListener("hackmind:storage-unavailable", handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9997] flex items-center justify-center gap-3 px-4 py-2.5 bg-[hsl(48_96%_53%/0.15)] border-b border-[hsl(48_96%_53%/0.3)] text-[hsl(48_96%_53%)] text-xs font-mono backdrop-blur-sm">
      <AlertTriangle size={14} className="shrink-0" />
      <span>Private browsing detected: history won't be saved between sessions.</span>
      <button onClick={() => setShow(false)} className="shrink-0 p-0.5 hover:opacity-70 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}
