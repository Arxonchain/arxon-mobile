import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PointsProvider } from "@/hooks/usePoints";
import { Capacitor } from "@capacitor/core";

// Web pages
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import AuthCallback from "@/pages/AuthCallback";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import Dashboard from "@/pages/Dashboard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Mining from "@/pages/Mining";
import Tasks from "@/pages/Tasks";
import Leaderboard from "@/pages/Leaderboard";
import Arena from "@/pages/Arena";
import Referrals from "@/pages/Referrals";
import Nexus from "@/pages/Nexus";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";
import Litepaper from "@/pages/Litepaper";

// Admin
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSignups from "@/pages/admin/AdminSignups";
import AdminControls from "@/pages/admin/AdminControls";
import AdminArena from "@/pages/admin/AdminArena";
import AdminReconciliation from "@/pages/admin/AdminReconciliation";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminImportUsers from "@/pages/admin/AdminImportUsers";
import AdminExportFilter from "@/pages/admin/AdminExportFilter";
import AdminBattleHistory from "@/pages/admin/AdminBattleHistory";
import AdminGlobalMap from "@/pages/admin/AdminGlobalMap";
import AdminPitchDeck from "@/pages/admin/AdminPitchDeck";
import AdminTasks from "@/pages/admin/AdminTasks";   // ← NEW

import { usePushNotifications } from "@/hooks/usePushNotifications";
import ErrorBoundary from "@/components/system/ErrorBoundary";

// Mobile
import MobileDashboard from "@/components/mobile/MobileDashboard";
import MobileMining from "@/components/mobile/MobileMining";
import MobileLeaderboard from "@/components/mobile/MobileLeaderboard";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileArena from "@/components/mobile/MobileArena";
import MobileNexus from "@/components/mobile/MobileNexus";
import MobileProfile from "@/components/mobile/MobileProfile";
import MobileWallet from "@/components/mobile/MobileWallet";
import PublicProfile from "@/pages/PublicProfile";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5000, refetchOnWindowFocus: false } },
});

// PREVIEW ONLY: lets us see the mobile (Capacitor) UI from a regular browser
// without building/installing a native APK or IPA every time. Visit the site
// once with ?mobilepreview=1 and it's remembered for the session; ?mobilepreview=0
// turns it back off. Real native app builds are unaffected — Capacitor.isNativePlatform()
// always wins when it's actually true.
function resolveIsNative(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('mobilepreview');
    if (flag === '1') { localStorage.setItem('arxon_force_mobile_preview', '1'); return true; }
    if (flag === '0') { localStorage.removeItem('arxon_force_mobile_preview'); return false; }
    return localStorage.getItem('arxon_force_mobile_preview') === '1';
  } catch {
    return false;
  }
}

const isNative = resolveIsNative();

const Spinner = () => (
  <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid hsl(215 35% 62%/0.2)', borderTopColor: 'hsl(215 35% 62%)', animation: 'spin 1s linear infinite' }} />
    <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
  </div>
);

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error('[AppErrorBoundary]', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui,sans-serif' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚡</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 88%)', marginBottom: 8 }}>Something went wrong</p>
          <p style={{ fontSize: 12, color: 'hsl(215 14% 40%)', marginBottom: 24, textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
            {this.state.error?.message || 'Unexpected runtime error'}
          </p>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{ padding: '12px 28px', borderRadius: 14, background: 'hsl(215 35% 62%/0.15)', border: '1px solid hsl(215 35% 62%/0.35)', color: 'hsl(215 35% 72%)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PushNotificationInit() {
  usePushNotifications();
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function MobilePage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', paddingBottom: 100, fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif" }}>
      {children}
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <>
      <PushNotificationInit />
      <Routes>
        <Route path="/auth"           element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/auth/confirm"   element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/litepaper"      element={<Litepaper />} />
        <Route path="/admin/login"    element={<AdminLogin />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index                  element={<AdminDashboard />} />
          <Route path="users"           element={<AdminUsers />} />
          <Route path="signups"         element={<AdminSignups />} />
          <Route path="controls"        element={<AdminControls />} />
          <Route path="arena"           element={<AdminArena />} />
          <Route path="battle-history"  element={<AdminBattleHistory />} />
          <Route path="tasks"           element={<AdminTasks />} />     {/* ← NEW */}
          <Route path="reconciliation"  element={<AdminReconciliation />} />
          <Route path="export-filter"   element={<AdminExportFilter />} />
          <Route path="import-users"    element={<AdminImportUsers />} />
          <Route path="global-map"      element={<AdminGlobalMap />} />
          <Route path="pitch-deck"      element={<AdminPitchDeck />} />
        </Route>

        {isNative ? (
          <>
            <Route path="/"             element={<ErrorBoundary>{user ? <MobileDashboard /> : <Navigate to="/auth" replace />}</ErrorBoundary>} />
            <Route path="/mining"       element={<ProtectedRoute><ErrorBoundary><MobileMining /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/arena"        element={<ErrorBoundary><MobileArena /></ErrorBoundary>} />
            <Route path="/leaderboard"  element={<ErrorBoundary><MobileLeaderboard /></ErrorBoundary>} />
            <Route path="/nexus"        element={<ProtectedRoute><ErrorBoundary><MobileNexus /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/profile"      element={<ProtectedRoute><ErrorBoundary><MobileProfile /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/wallet"       element={<ErrorBoundary><MobileWallet /></ErrorBoundary>} />
            <Route path="/profile/:userId" element={<ErrorBoundary><PublicProfile /></ErrorBoundary>} />
            <Route path="/tasks"        element={<ProtectedRoute><MobilePage><ErrorBoundary><Tasks /></ErrorBoundary></MobilePage></ProtectedRoute>} />
            <Route path="/referrals"    element={<ProtectedRoute><MobilePage><ErrorBoundary><Referrals /></ErrorBoundary></MobilePage></ProtectedRoute>} />
            <Route path="/settings"     element={<ProtectedRoute><MobilePage><ErrorBoundary><Settings /></ErrorBoundary></MobilePage></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><MobilePage><ErrorBoundary><Notifications /></ErrorBoundary></MobilePage></ProtectedRoute>} />
          </>
        ) : (
          <>
            <Route path="/"             element={user ? <DashboardLayout><Dashboard /></DashboardLayout> : <Landing />} />
            <Route path="/mining"       element={<Mining />} />
            <Route path="/tasks"        element={<Tasks />} />
            <Route path="/leaderboard"  element={<Leaderboard />} />
            <Route path="/arena"        element={<Arena />} />
            <Route path="/referrals"    element={<Referrals />} />
            <Route path="/nexus"        element={<Nexus />} />
            <Route path="/profile"      element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/settings"     element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          </>
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isNative && <MobileBottomNav />}
    </>
  );
}

function RouterShell({ children }: { children: React.ReactNode }) {
  return isNative ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>;
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PointsProvider>
            <TooltipProvider>
              <Toaster />
              <RouterShell>
                <AppRoutes />
              </RouterShell>
            </TooltipProvider>
          </PointsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
