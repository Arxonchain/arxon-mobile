import { Outlet, Navigate, Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import { useAdmin } from "@/hooks/useAdmin";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PageSkeleton from "@/features/arxon-v2/components/PageSkeleton";

const AdminLayout = () => {
  const { user, isAdmin, loading } = useAdmin();

  if (loading) {
    return <PageSkeleton delayMs={400} />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground text-sm">
            You don't have admin privileges. Sign in with an admin account or return to the app.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button asChild variant="outline">
              <Link to="/mine">Back to App</Link>
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

  return (
    <div
      className="w-full bg-background text-foreground md:flex md:items-stretch"
      style={{ minHeight: "100%", boxSizing: "border-box" }}
    >
      <AdminSidebar />
      <main
        className="min-w-0 flex-1 p-3 sm:p-4 md:p-6 pb-12 max-w-full"
        style={{ overflow: "visible" }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AdminLayout;
