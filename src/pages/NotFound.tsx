import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, Search, Terminal } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        {/* Terminal-style 404 */}
        <div className="rounded-xl border border-primary/30 bg-card p-6 font-mono text-left space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border/50 pb-2 mb-3">
            <Terminal size={14} className="text-primary" />
            <span>cyberkhoj — terminal</span>
          </div>
          <p className="text-xs text-muted-foreground">$ curl {location.pathname}</p>
          <p className="text-xs text-destructive">HTTP/1.1 404 Not Found</p>
          <p className="text-xs text-muted-foreground">{">"} Route does not exist on this server.</p>
          <p className="text-xs text-primary animate-pulse">▌</p>
        </div>

        <h1 className="text-5xl md:text-7xl font-heading font-extrabold text-primary text-glow-primary">
          404
        </h1>
        <p className="text-lg font-heading font-bold text-foreground">
          Target Not Found
        </p>
        <p className="text-sm font-mono text-muted-foreground leading-relaxed">
          The route <code className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 text-xs">{location.pathname}</code> doesn't exist.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
          >
            <Home size={16} /> Back to Home
          </Link>
          <Link
            to="/analyzer"
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Search size={16} /> Open Analyzer
          </Link>
        </div>

        <p className="text-xs font-mono text-muted-foreground/40 pt-4">
          CyberKhoj — Search. Find. Exploit Responsibly.
        </p>
      </div>
    </div>
  );
};

export default NotFound;