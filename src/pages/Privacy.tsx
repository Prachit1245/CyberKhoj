import { Link } from "react-router-dom";
import { Lock, HardDrive, Eye, Server } from "lucide-react";

const POINTS = [
  { icon: HardDrive, title: "Your data stays in your browser", desc: "Every analysis result, every finding, every bookmark — stored in localStorage on your device. We literally cannot access it." },
  { icon: Lock, title: "Your API key is yours alone", desc: "Your Gemini API key is saved in your browser's localStorage. It is sent directly from your browser to Google's API. We never see it, touch it, or proxy it." },
  { icon: Server, title: "We have no servers", desc: "CyberKhoj is a static site. There is no backend collecting telemetry, no database storing your targets, no analytics tracking your behavior. Zero." },
  { icon: Eye, title: "No tracking. No ads. No cookies.", desc: "No Google Analytics. No Facebook Pixel. No cookie banners because there are no cookies. No fingerprinting. Nothing." },
];

const Privacy = () => (
  <div className="max-w-2xl mx-auto space-y-8">
    <div className="space-y-2">
      <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-foreground">Privacy Policy</h1>
      <p className="text-xs font-mono text-muted-foreground">Last updated: March 2026</p>
    </div>

    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-1">
      <p className="text-base font-heading font-bold text-primary">TL;DR — We store nothing. Zero.</p>
      <p className="text-sm font-mono text-muted-foreground leading-relaxed">
        Your API key lives in your browser. Your analyses live in your browser. We have no servers collecting your data. This isn't a marketing claim — it's the architecture.
      </p>
    </div>

    <div className="grid gap-5">
      {POINTS.map((p) => (
        <div key={p.title} className="flex gap-4">
          <div className="shrink-0 mt-0.5">
            <p.icon size={18} className="text-primary" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-heading font-bold text-foreground">{p.title}</h2>
            <p className="text-sm font-mono text-muted-foreground leading-relaxed">{p.desc}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="space-y-2">
      <h2 className="text-base font-heading font-bold text-foreground">Third-Party Services</h2>
      <p className="text-sm font-mono text-muted-foreground leading-relaxed">
        When you run an analysis, your browser sends the prompt directly to Google's Gemini API using your own API key. Google's privacy policy applies to that interaction. We are not a party to it and have no visibility into it.
      </p>
    </div>

    <div className="space-y-2">
      <h2 className="text-base font-heading font-bold text-foreground">Data Deletion</h2>
      <p className="text-sm font-mono text-muted-foreground leading-relaxed">
        Since all data is in your browser, you have full control. Go to Settings → Data Management to export or delete everything. Or just clear your browser data. There's nothing on our end to delete.
      </p>
    </div>

    <div className="flex gap-4 pt-4 text-xs font-mono">
      <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link>
      <Link to="/ethics" className="text-primary hover:underline">Ethical Use Guide</Link>
    </div>
  </div>
);

export default Privacy;
