import { ToastProvider } from "@/components/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ApiKeyGate from "@/components/ApiKeyGate";
import Navbar from "@/components/Navbar";
import AppSidebar from "@/components/AppSidebar";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Analyzer from "./pages/Analyzer";
import AttackMode from "./pages/AttackMode";
import MindMap from "./pages/MindMap";
import History from "./pages/History";
import HistoryDetail from "./pages/HistoryDetail";
import Payloads from "./pages/Payloads";
import CheatSheets from "./pages/CheatSheets";
import SettingsPage from "./pages/SettingsPage";
import Findings from "./pages/Findings";
import OwaspPage from "./pages/OwaspPage";
import VulnCategories from "./pages/VulnCategories";
import NotFound from "./pages/NotFound";
import Bookmarks from "./pages/Bookmarks";
import Achievements from "./pages/Achievements";
import DailyLimitOverlay from "@/components/DailyLimitOverlay";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
    <TooltipProvider>
      <ApiKeyGate>
        <DailyLimitOverlay />
        <BrowserRouter>
          <Routes>
            {/* Landing page with navbar */}
            <Route
              path="/"
              element={
                <>
                  <Navbar />
                  <div className="pt-14">
                    <Index />
                  </div>
                </>
              }
            />

            {/* App pages with sidebar layout */}
            <Route element={<AppSidebar />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analyzer" element={<Analyzer />} />
              <Route path="/attack" element={<AttackMode />} />
              <Route path="/mindmap" element={<MindMap />} />
              <Route path="/history" element={<History />} />
              <Route path="/history/:id" element={<HistoryDetail />} />
              <Route path="/payloads" element={<Payloads />} />
              <Route path="/cheatsheets" element={<CheatSheets />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/findings" element={<Findings />} />
              <Route path="/owasp" element={<OwaspPage />} />
              <Route path="/vuln-categories" element={<VulnCategories />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/achievements" element={<Achievements />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ApiKeyGate>
    </TooltipProvider>
    </ToastProvider>
  </QueryClientProvider>
);

export default App;
