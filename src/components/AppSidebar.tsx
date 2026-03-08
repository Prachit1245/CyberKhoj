import { NavLink, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  Swords,
  Network,
  Clock,
  Code2,
  BookOpen,
  Settings,
  Key,
  ChevronLeft,
  ChevronRight,
  Bug,
  ShieldAlert,
  Layers,
  WifiOff,
  Bookmark,
  Trophy,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { hasApiKey } from "@/lib/gemini";
import { getUsageCount, DAILY_LIMIT } from "@/lib/usage";
import { getBookmarkCount } from "@/lib/bookmarks";
import useOnline from "@/hooks/useOnline";
import QuickAnalyze from "@/components/QuickAnalyze";
import CommandPalette from "@/components/CommandPalette";
import ShortcutsModal from "@/components/ShortcutsModal";

const OFFLINE_OK = new Set(["/history", "/payloads", "/cheatsheets", "/findings", "/bookmarks"]);
const NEEDS_AI = new Set(["/analyzer", "/attack", "/mindmap"]);

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyzer", label: "URL Analyzer", icon: Link2 },
  { to: "/attack", label: "Attack Mode", icon: Swords, tourId: "nav-attack" },
  { to: "/mindmap", label: "Mind Map", icon: Network },
  { to: "/history", label: "History", icon: Clock },
  { to: "/payloads", label: "Payload Library", icon: Code2, tourId: "nav-payloads" },
  { to: "/cheatsheets", label: "Cheat Sheets", icon: BookOpen },
  { to: "/owasp", label: "OWASP Top 10", icon: ShieldAlert },
  { to: "/vuln-categories", label: "Vuln Categories", icon: Layers },
  { to: "/findings", label: "Findings", icon: Bug },
  { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
];

/* Bottom tab bar items (mobile) */
const BOTTOM_TABS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/analyzer", label: "Analyze", icon: Link2 },
  { to: "/attack", label: "Attack", icon: Swords },
  { to: "/mindmap", label: "Map", icon: Network },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/analyzer": "URL Analyzer",
  "/attack": "Attack Mode",
  "/mindmap": "Mind Map",
  "/history": "History",
  "/payloads": "Payload Library",
  "/cheatsheets": "Cheat Sheets",
  "/owasp": "OWASP Top 10",
  "/vuln-categories": "Vuln Categories",
  "/findings": "Findings",
  "/bookmarks": "Bookmarks",
  "/achievements": "Achievements",
  "/settings": "Settings",
};

const SidebarUsage = ({ collapsed, keySet }: { collapsed: boolean; keySet: boolean }) => {
  const [count, setCount] = useState(getUsageCount());

  useEffect(() => {
    const interval = setInterval(() => setCount(getUsageCount()), 2000);
    return () => clearInterval(interval);
  }, []);

  const pct = Math.min((count / DAILY_LIMIT) * 100, 100);
  const barColor = count >= 800 ? "bg-destructive" : count >= 500 ? "bg-yellow-500" : "bg-primary";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Key size={14} className={keySet ? "text-primary" : "text-destructive"} />
        <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 text-xs font-mono">
        <Key size={13} className={keySet ? "text-primary" : "text-destructive"} />
        <span className={keySet ? "text-primary" : "text-destructive"}>
          {keySet ? "API Key ✓" : "No Key"}
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-mono text-muted-foreground">
          Today: <span className="text-foreground">{count}</span> / {DAILY_LIMIT} analyses
        </p>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  );
};

/* ── Mobile "More" drawer ── */
const MobileMoreDrawer = ({
  open,
  onClose,
  bmCount,
  online,
}: {
  open: boolean;
  onClose: () => void;
  bmCount: number;
  online: boolean;
}) => {
  const location = useLocation();
  // Items not in bottom tabs
  const moreItems = NAV_ITEMS.filter(
    (item) => !BOTTOM_TABS.some((bt) => bt.to === item.to)
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div
        className="absolute bottom-[4.5rem] left-0 right-0 mx-3 rounded-2xl border border-border bg-card shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="font-heading text-sm font-bold text-foreground">More</span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <nav className="grid grid-cols-3 gap-1 p-3 max-h-[50vh] overflow-y-auto">
          {moreItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 min-h-[4rem] transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <item.icon size={20} />
                <span className="text-[10px] font-mono leading-tight text-center">
                  {item.label}
                </span>
                {item.to === "/bookmarks" && bmCount > 0 && (
                  <span className="text-[8px] font-mono text-primary-foreground bg-primary rounded-full px-1 py-0.5 leading-none">
                    {bmCount > 99 ? "99+" : bmCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [bmCount, setBmCount] = useState(getBookmarkCount());
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const keySet = hasApiKey();
  const online = useOnline();

  // Listen for bookmark changes
  useEffect(() => {
    const refresh = () => setBmCount(getBookmarkCount());
    window.addEventListener("hackmind:bookmarks-changed", refresh);
    return () => window.removeEventListener("hackmind:bookmarks-changed", refresh);
  }, []);

  // Close more drawer on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Ctrl+B shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        navigate("/bookmarks");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const pageTitle = PAGE_TITLES[location.pathname] || "HackMind";

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-primary/20 transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
        style={{ background: "#0d0d0d" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/50">
          {!collapsed && (
            <span className="font-heading text-base font-bold text-primary text-glow-primary logo-cursor">
              HackMind
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            const isOfflineOk = OFFLINE_OK.has(item.to);
            const isAiPage = NEEDS_AI.has(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-tour={item.tourId}
                className={`sidebar-item group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-mono transition-all relative ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                )}
                <item.icon size={18} className={isActive ? "text-primary" : ""} />
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    {item.label}
                    {item.to === "/bookmarks" && bmCount > 0 && (
                      <span className="text-[9px] font-mono text-primary-foreground bg-primary rounded-full px-1.5 py-0.5 leading-none min-w-[1.25rem] text-center">
                        {bmCount > 99 ? "99+" : bmCount}
                      </span>
                    )}
                    {!online && isOfflineOk && (
                      <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/30 rounded px-1 py-0.5 leading-none">✓</span>
                    )}
                    {!online && isAiPage && (
                      <span className="text-[9px] font-mono text-destructive bg-destructive/10 border border-destructive/30 rounded px-1 py-0.5 leading-none">AI</span>
                    )}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="border-t border-border/50 p-3 space-y-2" data-tour="usage-counter">
          <SidebarUsage collapsed={collapsed} keySet={keySet} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: "#0f0f0f" }}>
        {/* Top bar */}
        <header className="h-12 md:h-14 flex items-center px-4 md:px-6 border-b border-border/50 shrink-0 gap-3">
          {/* Mobile logo */}
          <span className="md:hidden font-heading text-sm font-bold text-primary text-glow-primary logo-cursor mr-1">HM</span>
          <h1 className="font-heading text-base md:text-lg font-bold text-foreground">{pageTitle}</h1>
          {!online && (
            <span className="flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-mono text-destructive animate-fade-in">
              <WifiOff size={12} /> Offline
            </span>
          )}
        </header>

        {/* Content — extra bottom padding on mobile for tab bar */}
        <main id="main-content" className="flex-1 overflow-y-auto" role="main">
          <div className="p-4 md:p-6 pb-24 md:pb-6 route-animate" key={location.pathname}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[80] border-t border-border/50 flex items-stretch safe-area-pb"
        style={{ background: "#0d0d0d" }}
        aria-label="Mobile navigation"
      >
        {BOTTOM_TABS.map((tab) => {
          const isActive = location.pathname === tab.to;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.5rem] transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon size={22} />
              <span className="text-[10px] font-mono">{tab.label}</span>
            </NavLink>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[3.5rem] transition-colors ${
            moreOpen ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <MoreHorizontal size={22} />
          <span className="text-[10px] font-mono">More</span>
        </button>
      </nav>

      {/* Mobile More Drawer */}
      <MobileMoreDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        bmCount={bmCount}
        online={online}
      />

      {/* Quick Analyze FAB + Palettes */}
      <QuickAnalyze />
      <CommandPalette />
      <ShortcutsModal />
    </div>
  );
};

export default AppSidebar;
