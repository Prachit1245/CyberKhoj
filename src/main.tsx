import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyReduceMotion } from "./lib/reduceMotion";
import { warnIfNoStorage } from "./lib/storage";

// Apply reduce-motion preference before first render
applyReduceMotion();

// Detect private browsing / disabled storage
warnIfNoStorage();

// Polyfill: crypto.randomUUID (Safari <15.4, Firefox <95)
if (typeof crypto !== "undefined" && !crypto.randomUUID) {
  (crypto as any).randomUUID = () => {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) =>
      (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    );
  };
}

createRoot(document.getElementById("root")!).render(<App />);
