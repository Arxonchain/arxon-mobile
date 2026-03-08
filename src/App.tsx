import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PointsProvider } from "@/hooks/usePoints";

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

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

// Public route - redirects to dashboard if logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

// Main router content
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
    <Routes>
      {/* Landing or Dashboard based on auth state */}
      <Route path="/" element={user ? <DashboardLayout><Dashboard /></DashboardLayout> : <Landing />} />
      
      {/* App pages - each with unique content */}
      <Route path="/mining" element={<Mining />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/arena" element={<Arena />} />
      <Route path="/referrals" element={<Referrals />} />
      <Route path="/nexus" element={<Nexus />} />
      <Route path="/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><DashboardLayout><Settings /></DashboardLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      
      {/* Auth routes */}
      <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/auth/confirm" element={<AuthCallback />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
       {/* Admin routes */}
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
       
      {/* Litepaper — unlisted public route (no auth, not in nav) */}
      <Route path="/litepaper" element={<Litepaper />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </PointsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
