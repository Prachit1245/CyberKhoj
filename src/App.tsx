import { lazy, Suspense } from "react";
import { ToastProvider } from "@/components/Toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ApiKeyGate from "@/components/ApiKeyGate";
import Navbar from "@/components/Navbar";
import AppSidebar from "@/components/AppSidebar";
import OnboardingTour from "./components/OnboardingTour";
import WhatsNewModal from "./components/WhatsNewModal";
import DailyLimitOverlay from "@/components/DailyLimitOverlay";
import FeedbackTab from "@/components/FeedbackTab";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import AchievementOverlay from "@/components/AchievementOverlay";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import PrivateBrowsingBanner from "@/components/PrivateBrowsingBanner";
import { SkeletonDashboard, SkeletonAnalyzer, SkeletonPage } from "@/components/Skeletons";

/* ── Lazy-loaded pages ── */
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analyzer = lazy(() => import("./pages/Analyzer"));
const AttackMode = lazy(() => import("./pages/AttackMode"));
const MindMap = lazy(() => import("./pages/MindMap"));
const History = lazy(() => import("./pages/History"));
const HistoryDetail = lazy(() => import("./pages/HistoryDetail"));
const Payloads = lazy(() => import("./pages/Payloads"));
const CheatSheets = lazy(() => import("./pages/CheatSheets"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Findings = lazy(() => import("./pages/Findings"));
const OwaspPage = lazy(() => import("./pages/OwaspPage"));
const VulnCategories = lazy(() => import("./pages/VulnCategories"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Ethics = lazy(() => import("./pages/Ethics"));
const SharedView = lazy(() => import("./pages/SharedView"));
const Changelog = lazy(() => import("./pages/Changelog"));

const queryClient = new QueryClient();

/* Suspense fallbacks */
const DashFallback = () => <div className="p-4 md:p-6"><SkeletonDashboard /></div>;
const AnalyzerFallback = () => <div className="p-4 md:p-6"><SkeletonAnalyzer /></div>;
const PageFallback = () => <div className="p-4 md:p-6"><SkeletonPage /></div>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
    <TooltipProvider>
      <BrowserRouter>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <PWAInstallPrompt />
        <WhatsNewModal />
        <FeedbackTab />
        <AchievementOverlay />
        <LevelUpOverlay />
        <Routes>
          {/* Public routes — no API key needed */}
          <Route
            path="/"
            element={
              <Suspense fallback={<PageFallback />}>
                <Navbar />
                <div className="pt-14">
                  <Index />
                </div>
              </Suspense>
            }
          />
          <Route
            path="/terms"
            element={
              <Suspense fallback={<PageFallback />}>
                <Navbar />
                <div className="pt-14 px-4 py-10">
                  <Terms />
                </div>
              </Suspense>
            }
          />
          <Route
            path="/privacy"
            element={
              <Suspense fallback={<PageFallback />}>
                <Navbar />
                <div className="pt-14 px-4 py-10">
                  <Privacy />
                </div>
              </Suspense>
            }
          />
          <Route
            path="/ethics"
            element={
              <Suspense fallback={<PageFallback />}>
                <Navbar />
                <div className="pt-14 px-4 py-10">
                  <Ethics />
                </div>
              </Suspense>
            }
          />
          <Route
            path="/share"
            element={
              <Suspense fallback={<PageFallback />}>
                <Navbar />
                <div className="pt-14">
                  <SharedView />
                </div>
              </Suspense>
            }
          />
          <Route
            path="/changelog"
            element={
              <Suspense fallback={<PageFallback />}>
                <Navbar />
                <div className="pt-14 px-4 py-10 max-w-5xl mx-auto">
                  <Changelog />
                </div>
              </Suspense>
            }
          />

          {/* Protected routes — API key required */}
          <Route
            path="/*"
            element={
              <ApiKeyGate>
                <DailyLimitOverlay />
                <OnboardingTour />
                <Routes>
                  <Route element={<AppSidebar />}>
                    <Route path="/dashboard" element={<Suspense fallback={<DashFallback />}><Dashboard /></Suspense>} />
                    <Route path="/analyzer" element={<Suspense fallback={<AnalyzerFallback />}><Analyzer /></Suspense>} />
                    <Route path="/attack" element={<Suspense fallback={<PageFallback />}><AttackMode /></Suspense>} />
                    <Route path="/mindmap" element={<Suspense fallback={<PageFallback />}><MindMap /></Suspense>} />
                    <Route path="/history" element={<Suspense fallback={<PageFallback />}><History /></Suspense>} />
                    <Route path="/history/:id" element={<Suspense fallback={<PageFallback />}><HistoryDetail /></Suspense>} />
                    <Route path="/payloads" element={<Suspense fallback={<PageFallback />}><Payloads /></Suspense>} />
                    <Route path="/cheatsheets" element={<Suspense fallback={<PageFallback />}><CheatSheets /></Suspense>} />
                    <Route path="/settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
                    <Route path="/findings" element={<Suspense fallback={<PageFallback />}><Findings /></Suspense>} />
                    <Route path="/owasp" element={<Suspense fallback={<PageFallback />}><OwaspPage /></Suspense>} />
                    <Route path="/vuln-categories" element={<Suspense fallback={<PageFallback />}><VulnCategories /></Suspense>} />
                    <Route path="/bookmarks" element={<Suspense fallback={<PageFallback />}><Bookmarks /></Suspense>} />
                    <Route path="/achievements" element={<Suspense fallback={<PageFallback />}><Achievements /></Suspense>} />
                  </Route>
                  <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
                </Routes>
              </ApiKeyGate>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ToastProvider>
  </QueryClientProvider>
);

export default App;
