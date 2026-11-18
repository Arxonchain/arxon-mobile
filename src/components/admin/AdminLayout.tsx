import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useAdmin } from "@/hooks/useAdmin";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isArenaAdminPath } from "@/lib/adminAuth";

const AdminLayout = () => {
  const { user, isAdmin, isArenaAdmin, canAccessAdmin, loading } = useAdmin();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!canAccessAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            You don't have access to this area. Sign in with an authorized account or return to the app.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button asChild variant="outline">
              <Link to="/">Back to App</Link>
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.hash = "#/admin/login";
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isArenaAdmin && !isAdmin && !isArenaAdminPath(location.pathname)) {
    return <Navigate to="/admin/arena" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full">
      <AdminSidebar />
      <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto pb-8 md:pb-6 max-w-full">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AdminLayout;
