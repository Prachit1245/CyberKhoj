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
} from "lucide-react";
import { useState } from "react";
import { hasApiKey } from "@/lib/gemini";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyzer", label: "URL Analyzer", icon: Link2 },
  { to: "/attack", label: "Attack Mode", icon: Swords },
  { to: "/mindmap", label: "Mind Map", icon: Network },
  { to: "/history", label: "History", icon: Clock },
  { to: "/payloads", label: "Payload Library", icon: Code2 },
  { to: "/cheatsheets", label: "Cheat Sheets", icon: BookOpen },
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
  "/settings": "Settings",
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
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2 text-xs font-mono">
                <Key size={13} className={keySet ? "text-primary" : "text-destructive"} />
                <span className={keySet ? "text-primary" : "text-destructive"}>
                  {keySet ? "API Key ✓" : "No Key"}
                </span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                <span className="text-foreground">0</span> / 1000 today
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <Key size={14} className={keySet ? "text-primary" : "text-destructive"} />
            </div>
          )}
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
            {/* Children rendered via Outlet */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppSidebar;
