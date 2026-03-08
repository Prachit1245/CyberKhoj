import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyReduceMotion } from "./lib/reduceMotion";

// Apply reduce-motion preference before first render
applyReduceMotion();

createRoot(document.getElementById("root")!).render(<App />);
