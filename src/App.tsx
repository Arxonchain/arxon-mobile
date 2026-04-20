import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PointsProvider } from "@/hooks/usePoints";
import { Capacitor } from "@capacitor/core";
import { useState, useCallback } from "react";

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

// Mobile — legendary redesign
import MobileDashboard   from "@/components/mobile/MobileDashboard";
import MobileMining      from "@/components/mobile/MobileMining";
import MobileLeaderboard from "@/components/mobile/MobileLeaderboard";
import MobileBottomNav   from "@/components/mobile/MobileBottomNav";
import MobileSplash      from "@/components/mobile/MobileSplash";
import MobileArena       from "@/components/mobile/MobileArena";
import MobileNexus       from "@/components/mobile/MobileNexus";
import MobileProfile     from "@/components/mobile/MobileProfile";
import MobileWallet      from "@/components/mobile/MobileWallet";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import MobileChat        from "@/components/mobile/MobileChat";
import PublicProfile     from "@/pages/PublicProfile";
import BiometricLockScreen from "@/components/mobile/BiometricLockScreen";
import { useBiometric }  from "@/hooks/useBiometric";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5000, refetchOnWindowFocus: false } },
});

const isNative = Capacitor.isNativePlatform();

const Spinner = () => (
  <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid hsl(215 35% 62%/0.2)',borderTopColor:'hsl(215 35% 62%)',animation:'spin 1s linear infinite'}}/>
    <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
  </div>
);

// ── Global Error Boundary — prevents any single component crash from blanking the app ──
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',padding:24,fontFamily:'system-ui,sans-serif'}}>
          <div style={{fontSize:40,marginBottom:16}}>⚡</div>
          <p style={{fontSize:18,fontWeight:700,color:'hsl(215 20% 88%)',marginBottom:8}}>Something went wrong</p>
          <p style={{fontSize:12,color:'hsl(215 14% 40%)',marginBottom:24,textAlign:'center',maxWidth:280,lineHeight:1.5}}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{padding:'12px 28px',borderRadius:14,background:'hsl(215 35% 62%/0.15)',
              border:'1px solid hsl(215 35% 62%/0.35)',color:'hsl(215 35% 72%)',
              fontSize:14,fontWeight:600,cursor:'pointer'}}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner/>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// ── Per-screen error boundary — catches crashes in individual screens ──────
class ScreenErrorBoundary extends React.Component<
  { children: React.ReactNode; name?: string },
  { hasError: boolean }
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { console.error(`[Screen:${this.props.name}]`, e); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>😵</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'hsl(215 20% 80%)', marginBottom: 8 }}>
            {this.props.name || 'Screen'} crashed
          </p>
          <button onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: 16, padding: '10px 24px', borderRadius: 12,
              background: 'hsl(215 35% 62%/0.12)', border: '1px solid hsl(215 35% 62%/0.3)',
              color: 'hsl(215 35% 72%)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Safe({ name, children }: { name: string; children: React.ReactNode }) {
  return <ScreenErrorBoundary name={name}>{children}</ScreenErrorBoundary>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner/>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function MobilePage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      {children}
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner/>;

  return (
    <>
      <Routes>
        {/* Shared */}
        <Route path="/auth"           element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/auth/confirm"   element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/litepaper"      element={<Litepaper />} />
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index                 element={<AdminDashboard />} />
          <Route path="users"          element={<AdminUsers />} />
          <Route path="signups"        element={<AdminSignups />} />
          <Route path="controls"       element={<AdminControls />} />
          <Route path="arena"          element={<AdminArena />} />
          <Route path="battle-history" element={<AdminBattleHistory />} />
          <Route path="reconciliation" element={<AdminReconciliation />} />
          <Route path="export-filter"  element={<AdminExportFilter />} />
          <Route path="import-users"   element={<AdminImportUsers />} />
          <Route path="global-map"     element={<AdminGlobalMap />} />
          <Route path="pitch-deck"     element={<AdminPitchDeck />} />
        </Route>

        {isNative ? (
          <>
            {/* Home / Dashboard */}
            <Route path="/" element={user ? <Safe name="Dashboard"><MobileDashboard /></Safe> : <Landing />} />

            {/* Core mobile screens */}
            <Route path="/mining"      element={<ProtectedRoute><Safe name="Mining"><MobileMining /></Safe></ProtectedRoute>} />
            <Route path="/arena"       element={<Safe name="Arena"><MobileArena /></Safe>} />
            <Route path="/leaderboard" element={<Safe name="Leaderboard"><MobileLeaderboard /></Safe>} />
            <Route path="/nexus"       element={<ProtectedRoute><Safe name="Nexus"><MobileNexus /></Safe></ProtectedRoute>} />
            <Route path="/profile"     element={<ProtectedRoute><Safe name="Profile"><MobileProfile /></Safe></ProtectedRoute>} />
            <Route path="/wallet"      element={<Safe name="Wallet"><MobileWallet /></Safe>} />
            <Route path="/chat"        element={<Safe name="Chat"><MobileChat /></Safe>} />
            <Route path="/profile/:userId" element={<Safe name="PublicProfile"><PublicProfile /></Safe>} />

            {/* Web pages with mobile wrapper */}
            <Route path="/tasks"         element={<ProtectedRoute><MobilePage><Tasks /></MobilePage></ProtectedRoute>} />
            <Route path="/referrals"     element={<ProtectedRoute><MobilePage><Referrals /></MobilePage></ProtectedRoute>} />
            <Route path="/settings"      element={<ProtectedRoute><MobilePage><Settings /></MobilePage></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><MobilePage><Notifications /></MobilePage></ProtectedRoute>} />
          </>
        ) : (
          <>
            <Route path="/"            element={user ? <DashboardLayout><Dashboard /></DashboardLayout> : <Landing />} />
            <Route path="/mining"      element={<Mining />} />
            <Route path="/tasks"       element={<Tasks />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/arena"       element={<Arena />} />
            <Route path="/referrals"   element={<Referrals />} />
            <Route path="/nexus"       element={<Nexus />} />
            <Route path="/profile"     element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
            <Route path="/settings"    element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          </>
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isNative && <MobileBottomNav />}
    </>
  );
}

function AppWithSplash() {
  const { loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const handleFinish = useCallback(() => setSplashDone(true), []);
  const { locked, enabled } = useBiometric();
  usePushNotifications();
  return (
    <>
      {isNative && !splashDone && <MobileSplash isAppReady={!loading} onFinish={handleFinish}/>}
      {enabled && locked && <BiometricLockScreen />}
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PointsProvider>
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <AppErrorBoundary>
                  <AppWithSplash />
                </AppErrorBoundary>
              </BrowserRouter>
            </TooltipProvider>
          </PointsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
