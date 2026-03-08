import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        {/* Glitch-style 404 */}
        <h1 className="text-7xl md:text-8xl font-heading font-extrabold text-primary text-glow-primary">
          404
        </h1>
        <div className="space-y-2">
          <p className="text-lg font-heading font-bold text-foreground">
            Page Not Found
          </p>
          <p className="text-sm font-mono text-muted-foreground leading-relaxed">
            The route <code className="px-1.5 py-0.5 rounded bg-muted/50 border border-border/50 text-xs">{location.pathname}</code> doesn't exist.
            It may have been moved or you may have mistyped the URL.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-heading text-sm font-bold text-primary-foreground hover:brightness-110 transition-all glow-primary"
          >
            <Home size={16} /> Go to Dashboard
          </Link>
          <Link
            to="/analyzer"
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 font-heading text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            <Search size={16} /> Open Analyzer
          </Link>
        </div>

        <p className="text-xs font-mono text-muted-foreground/40 pt-4">
          If you think this is a bug, please report it via the feedback tab.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
