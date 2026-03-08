import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PointsProvider } from "@/hooks/usePoints";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/layout/BottomNav";

// Pages
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
import Wallet from "@/pages/Wallet";

// Admin pages
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
import Litepaper from "@/pages/Litepaper";
import Notifications from "@/pages/Notifications";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={user ? <DashboardLayout><Dashboard /></DashboardLayout> : <Landing />} />
        <Route path="/mining" element={<Mining />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/nexus" element={<Nexus />} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/auth/confirm" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="signups" element={<AdminSignups />} />
          <Route path="controls" element={<AdminControls />} />
          <Route path="arena" element={<AdminArena />} />
          <Route path="battle-history" element={<AdminBattleHistory />} />
          <Route path="reconciliation" element={<AdminReconciliation />} />
          <Route path="export-filter" element={<AdminExportFilter />} />
          <Route path="import-users" element={<AdminImportUsers />} />
          <Route path="global-map" element={<AdminGlobalMap />} />
          <Route path="pitch-deck" element={<AdminPitchDeck />} />
        </Route>
        <Route path="/litepaper" element={<Litepaper />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Floating pill bottom nav — shown on all app pages on mobile */}
      <BottomNav />
    </>
  );
}

function AppWithSplash() {
  const [splashDone, setSplashDone] = useState(false);
  const { loading } = useAuth();

  const handleFinish = useCallback(() => setSplashDone(true), []);

  return (
    <>
      {!splashDone && (
        <SplashScreen
          onFinish={handleFinish}
          isAppReady={!loading}
        />
      )}
      <AppRoutes />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PointsProvider>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <AppWithSplash />
            </BrowserRouter>
          </TooltipProvider>
        </PointsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
