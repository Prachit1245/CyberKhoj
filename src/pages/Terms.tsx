import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

const Terms = () => (
  <div className="max-w-2xl mx-auto space-y-8">
    <div className="space-y-2">
      <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground">Terms of Use</h1>
      <p className="text-xs font-mono text-muted-foreground">Last updated: March 2026</p>
    </div>

    {[
      { title: "1. Authorized Testing Only", body: "HackMind is designed exclusively for authorized security testing. You may only use this tool against systems you own or have explicit, written permission to test. Unauthorized access to computer systems is illegal in virtually every jurisdiction." },
      { title: "2. Your Responsibility", body: "You are solely responsible for how you use HackMind and any outputs it generates. The attack paths, payloads, and recommendations provided are for educational and authorized testing purposes only. We do not condone or support any illegal activity." },
      { title: "3. No Warranty", body: "HackMind is provided \"as is\" without warranty of any kind, express or implied. We make no guarantees about the accuracy, completeness, or reliability of any analysis results. Always verify findings manually before reporting." },
      { title: "4. No Liability", body: "Under no circumstances shall HackMind or its creators be liable for any direct, indirect, incidental, or consequential damages arising from your use of this tool. This includes but is not limited to damages from unauthorized testing, false positives, or missed vulnerabilities." },
      { title: "5. Local-Only Processing", body: "All processing happens in your browser. We do not operate servers that process, store, or transmit your analysis data. Your API key and results remain entirely under your control." },
      { title: "6. Third-Party APIs", body: "HackMind uses Google's Gemini API for analysis. Your use of this API is subject to Google's own terms of service. We are not responsible for any changes, outages, or policy updates from third-party providers." },
    ].map((s) => (
      <div key={s.title} className="space-y-2">
        <h2 className="text-base font-heading font-bold text-foreground">{s.title}</h2>
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">{s.body}</p>
      </div>
    ))}

    <div className="flex gap-4 pt-4 text-xs font-mono">
      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
      <Link to="/ethics" className="text-primary hover:underline">Ethical Use Guide</Link>
    </div>
  </div>
);

export default Terms;
