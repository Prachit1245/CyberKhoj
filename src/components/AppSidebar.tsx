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
} from "lucide-react";
import { useState, useEffect } from "react";
import { hasApiKey } from "@/lib/gemini";
import { getUsageCount, DAILY_LIMIT } from "@/lib/usage";
import QuickAnalyze from "@/components/QuickAnalyze";
import CommandPalette from "@/components/CommandPalette";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyzer", label: "URL Analyzer", icon: Link2 },
  { to: "/attack", label: "Attack Mode", icon: Swords },
  { to: "/mindmap", label: "Mind Map", icon: Network },
  { to: "/history", label: "History", icon: Clock },
  { to: "/payloads", label: "Payload Library", icon: Code2 },
  { to: "/cheatsheets", label: "Cheat Sheets", icon: BookOpen },
  { to: "/owasp", label: "OWASP Top 10", icon: ShieldAlert },
  { to: "/findings", label: "Findings", icon: Bug },
  { to: "/settings", label: "Settings", icon: Settings },
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
  "/findings": "Findings",
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

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const keySet = hasApiKey();

  const pageTitle = PAGE_TITLES[location.pathname] || "HackMind";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col shrink-0 border-r border-primary/20 transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
        style={{ background: "#0d0d0d" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/50">
          {!collapsed && (
            <span className="font-heading text-base font-bold text-primary text-glow-primary">
              HackMind
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-item group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-mono transition-all relative ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
                )}
                <item.icon size={18} className={isActive ? "text-primary" : ""} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom status */}
        <div className="border-t border-border/50 p-3 space-y-2">
        <SidebarUsage collapsed={collapsed} keySet={keySet} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden" style={{ background: "#0f0f0f" }}>
        {/* Top bar */}
        <header className="h-14 flex items-center px-6 border-b border-border/50 shrink-0">
          <h1 className="font-heading text-lg font-bold text-foreground">{pageTitle}</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Quick Analyze FAB + Modal */}
      <QuickAnalyze />
      <CommandPalette />
    </div>
  );
};

export default AppSidebar;
