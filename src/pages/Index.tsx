import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Dashboard from "./Dashboard";
import Landing from "./Landing";
import { useAuth } from "@/contexts/AuthContext";
import { applyPendingReferralCode } from "@/lib/referral/applyPendingReferral";

const Index = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [showSplash, setShowSplash] = useState(true);

  // Store referral code in localStorage (persists across tabs/email confirmation)
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      try {
        localStorage.setItem('arxon_referral_code', ref.toUpperCase());
        sessionStorage.setItem('arxon_referral_code', ref.toUpperCase());
      } catch {}
    }
  }, [searchParams]);

  // Auto-apply pending referral code when user is authenticated
  useEffect(() => {
    if (user) {
      applyPendingReferralCode().catch(() => {});
    }
  }, [user]);

  // Never hard-block the app on an auth/session fetch that can hang on bad networks.
  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), 900);
    return () => window.clearTimeout(id);
  }, []);

  // Brief splash only
  if (loading && showSplash) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading ARXON...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return <Landing />;
  }

  // Show dashboard for authenticated users
  return (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  );
};

export default Index;
