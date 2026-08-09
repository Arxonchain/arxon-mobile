import React, { useState, lazy, Suspense } from 'react';
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
import AuthConfirm from "@/pages/AuthConfirm";
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
import PointsHistory from "@/pages/PointsHistory";
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
import AdminTasks from "@/pages/admin/AdminTasks";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminReferralRecovery from "@/pages/admin/AdminReferralRecovery";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";
import AdminClaims from "@/pages/admin/AdminClaims";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useForgeDailyReminder } from "@/features/word-forge/hooks/useForgeDailyReminder";

// Mobile
import MobileDashboard from "@/components/mobile/MobileDashboard";
import MobileMining from "@/components/mobile/MobileMining";
import MobileLeaderboard from "@/components/mobile/MobileLeaderboard";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileArena from "@/components/mobile/MobileArena";
import MobileNexus from "@/components/mobile/MobileNexus";
import MobileProfile from "@/components/mobile/MobileProfile";
import MobileWallet from "@/components/mobile/MobileWallet";
import MobileSettings from "@/components/mobile/MobileSettings";
import PublicProfile from "@/pages/PublicProfile";
import MobileSplash from "@/components/mobile/MobileSplash";
import SessionRecovery from "@/components/system/SessionRecovery";
import PushNavListener from "@/components/system/PushNavListener";
import NetworkOfflineBanner from "@/components/system/NetworkOfflineBanner";
import AppUpdateOverlay from "@/components/system/AppUpdateOverlay";
import WebBundleRefreshInit from "@/components/system/WebBundleRefreshInit";
import { MobileNavProvider } from "@/contexts/MobileNavContext";

import {
  DashboardV2, ArenaV2, PredictionMarketV2, LeaderboardV2, ProfileV2,
  TasksV2, ReferralsV2, NexusV2, WalletV2, SettingsV2,
  NotificationsV2, PointsHistoryV2, DiceHubV2, DiceMatchV2,
  DiceDuelLobbyV2, DiceDuelMatchV2, DiceRumbleLobbyV2, DiceRumbleMatchV2,
  MobileBottomNavV2,
} from "@/features/arxon-v2";
import AppPreviewShell, { PreviewSpinner } from "@/features/arxon-v2/preview/AppPreviewShell";
import {
  PreviewWordForgePage,
  PreviewForgeStatsPage,
  PreviewSectorMapPage,
  PreviewWordForgeLeaderboardPage,
} from "@/features/arxon-v2/preview/previewLazyPages";
import DashboardNeon from "@/features/arxon-v2/pages/DashboardNeon";
import { ARXON_UI_V2_ENABLED } from "@/lib/uiFeature";
import { WORD_FORGE_ENABLED } from "@/lib/wordForgeFeature";

const GamingHubPage = WORD_FORGE_ENABLED
  ? lazy(() => import("@/components/mobile/GamingHubPage"))
  : null;

const WordForgePreviewPage = lazy(() => import("@/features/word-forge/preview/WordForgePreviewPage"));

const WordForgePage = WORD_FORGE_ENABLED
  ? lazy(() => import("@/features/word-forge/WordForgePage"))
  : null;

const ForgeStatsPage = WORD_FORGE_ENABLED
  ? lazy(() => import("@/features/word-forge/pages/ForgeStatsPage"))
  : null;

const SectorMapPage = WORD_FORGE_ENABLED
  ? lazy(() => import("@/features/word-forge/pages/SectorMapPage"))
  : null;

const WordForgeLeaderboardPage = WORD_FORGE_ENABLED
  ? lazy(() => import("@/features/word-forge/pages/WordForgeLeaderboardPage"))
  : null;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5000, refetchOnWindowFocus: false } },
});

const isNative = Capacitor.isNativePlatform();

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
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.hash = '#/'; }}
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
  const { preferences } = usePushNotifications();
  useForgeDailyReminder(preferences.wordForgeDaily);
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
  const [splashDone, setSplashDone] = useState(!isNative);

  if (isNative && !splashDone) {
    return <MobileSplash isAppReady={!loading} onFinish={() => setSplashDone(true)} />;
  }
  if (loading) return <Spinner />;

  return (
    <>
      <PushNavListener />
      <SessionRecovery />
      <PushNotificationInit />
      <WebBundleRefreshInit />
      <Routes>
        <Route path="/auth"           element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/auth/confirm"   element={<AuthConfirm />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/litepaper"      element={<Litepaper />} />
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/ui-preview" element={<AppPreviewShell />}>
          <Route index element={<DashboardNeon preview />} />
          <Route path="mining" element={<Navigate to="/ui-preview" replace />} />
          <Route path="arena/prediction-market" element={<PredictionMarketV2 />} />
          <Route path="arena/dice" element={<DiceHubV2 />} />
          <Route path="arena/dice/house" element={<DiceMatchV2 />} />
          <Route path="arena/dice/duel" element={<DiceDuelLobbyV2 />} />
          <Route path="arena/dice/duel/:matchId" element={<DiceDuelMatchV2 />} />
          <Route path="arena/dice/rumble" element={<DiceRumbleLobbyV2 />} />
          <Route path="arena/dice/rumble/:matchId" element={<DiceRumbleMatchV2 />} />
          <Route path="arena" element={<ArenaV2 />} />
          <Route path="leaderboard" element={<LeaderboardV2 />} />
          <Route path="profile" element={<ProfileV2 />} />
          <Route path="tasks" element={<TasksV2 />} />
          <Route path="referrals" element={<ReferralsV2 />} />
          <Route path="nexus" element={<NexusV2 />} />
          <Route path="wallet" element={<WalletV2 />} />
          <Route path="settings" element={<SettingsV2 />} />
          <Route path="notifications" element={<NotificationsV2 />} />
          <Route path="points-history" element={<PointsHistoryV2 />} />
          {WORD_FORGE_ENABLED && GamingHubPage && (
            <Route path="games" element={
              <Suspense fallback={<PreviewSpinner />}>
                <GamingHubPage />
              </Suspense>
            } />
          )}
          {WORD_FORGE_ENABLED && PreviewWordForgePage && (
            <>
              <Route path="word-forge" element={
                <Suspense fallback={<PreviewSpinner />}>
                  <PreviewWordForgePage />
                </Suspense>
              } />
              {PreviewForgeStatsPage && (
                <Route path="word-forge/stats" element={
                  <Suspense fallback={<PreviewSpinner />}>
                    <PreviewForgeStatsPage />
                  </Suspense>
                } />
              )}
              {PreviewSectorMapPage && (
                <Route path="word-forge/map" element={
                  <Suspense fallback={<PreviewSpinner />}>
                    <PreviewSectorMapPage />
                  </Suspense>
                } />
              )}
              {PreviewWordForgeLeaderboardPage && (
                <Route path="word-forge/leaderboard" element={
                  <Suspense fallback={<PreviewSpinner />}>
                    <PreviewWordForgeLeaderboardPage />
                  </Suspense>
                } />
              )}
            </>
          )}
          <Route path="dashboard" element={<Navigate to="/ui-preview" replace />} />
        </Route>
        <Route path="/word-forge-preview" element={
          <Suspense fallback={<Spinner />}>
            <WordForgePreviewPage />
          </Suspense>
        } />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index                  element={<AdminDashboard />} />
          <Route path="users"           element={<AdminUsers />} />
          <Route path="signups"         element={<AdminSignups />} />
          <Route path="controls"        element={<AdminControls />} />
          <Route path="arena"           element={<AdminArena />} />
          <Route path="battle-history"  element={<AdminBattleHistory />} />
          <Route path="tasks"           element={<AdminTasks />} />
          <Route path="referrals"       element={<AdminReferrals />} />
          <Route path="referral-recovery" element={<AdminReferralRecovery />} />
          <Route path="analytics"       element={<AdminAnalytics />} />
          <Route path="announcements"   element={<AdminAnnouncements />} />
          <Route path="claims"          element={<AdminClaims />} />
          <Route path="reconciliation"  element={<AdminReconciliation />} />
          <Route path="export-filter"   element={<AdminExportFilter />} />
          <Route path="import-users"    element={<AdminImportUsers />} />
          <Route path="global-map"      element={<AdminGlobalMap />} />
        </Route>

        {isNative ? (
          <>
            <Route path="/" element={user ? (ARXON_UI_V2_ENABLED ? <DashboardV2 /> : <MobileDashboard />) : <Navigate to="/auth" replace />} />
            {WORD_FORGE_ENABLED && GamingHubPage && (
              <Route path="/games" element={
                <ProtectedRoute>
                  <Suspense fallback={<Spinner />}>
                    <GamingHubPage />
                  </Suspense>
                </ProtectedRoute>
              } />
            )}
            {/*
              Public OTA / classic Play Store (npm run build): VITE_ARXON_UI_V2 unset → keep /mining.
              New-main redesign (npm run build:internal / .env.word-forge): VITE_ARXON_UI_V2=true → hide mining page until a new store upload ships.
            */}
            <Route
              path="/mining"
              element={
                ARXON_UI_V2_ENABLED
                  ? <Navigate to="/" replace />
                  : <ProtectedRoute><MobileMining /></ProtectedRoute>
              }
            />
            <Route path="/arena/prediction-market" element={ARXON_UI_V2_ENABLED ? <PredictionMarketV2 /> : <MobileArena />} />
            <Route path="/arena/dice" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <DiceHubV2 /> : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/house" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <DiceMatchV2 /> : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/duel" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <DiceDuelLobbyV2 /> : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/duel/:matchId" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <DiceDuelMatchV2 /> : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/rumble" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <DiceRumbleLobbyV2 /> : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/rumble/:matchId" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <DiceRumbleMatchV2 /> : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena"        element={ARXON_UI_V2_ENABLED ? <ArenaV2 /> : <MobileArena />} />
            <Route path="/leaderboard"  element={ARXON_UI_V2_ENABLED ? <LeaderboardV2 /> : <MobileLeaderboard />} />
            <Route path="/nexus"        element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <NexusV2 /> : <MobileNexus />}</ProtectedRoute>} />
            <Route path="/profile"      element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <ProfileV2 /> : <MobileProfile />}</ProtectedRoute>} />
            <Route path="/wallet"       element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <WalletV2 /> : <MobileWallet />}</ProtectedRoute>} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/tasks"        element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <TasksV2 /> : <MobilePage><Tasks /></MobilePage>}</ProtectedRoute>} />
            <Route path="/referrals"    element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <ReferralsV2 /> : <MobilePage><Referrals /></MobilePage>}</ProtectedRoute>} />
            <Route path="/settings"     element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <SettingsV2 /> : <MobileSettings />}</ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <NotificationsV2 /> : <Notifications />}</ProtectedRoute>} />
            <Route path="/points-history" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? <PointsHistoryV2 /> : <MobilePage><PointsHistory /></MobilePage>}</ProtectedRoute>} />
            {WORD_FORGE_ENABLED && WordForgePage && (
              <>
                <Route path="/word-forge" element={
                  <ProtectedRoute>
                    <Suspense fallback={<Spinner />}>
                      <WordForgePage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                {ForgeStatsPage && (
                  <Route path="/word-forge/stats" element={
                    <ProtectedRoute>
                      <Suspense fallback={<Spinner />}>
                        <ForgeStatsPage />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                )}
                {SectorMapPage && (
                  <Route path="/word-forge/map" element={
                    <ProtectedRoute>
                      <Suspense fallback={<Spinner />}>
                        <SectorMapPage />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                )}
                {WordForgeLeaderboardPage && (
                  <Route path="/word-forge/leaderboard" element={
                    <ProtectedRoute>
                      <Suspense fallback={<Spinner />}>
                        <WordForgeLeaderboardPage />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                )}
              </>
            )}
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
            <Route path="/points-history" element={<ProtectedRoute><DashboardLayout><PointsHistory /></DashboardLayout></ProtectedRoute>} />
            {WORD_FORGE_ENABLED && GamingHubPage && (
              <Route path="/games" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Suspense fallback={<Spinner />}>
                      <GamingHubPage />
                    </Suspense>
                  </DashboardLayout>
                </ProtectedRoute>
              } />
            )}
            {WORD_FORGE_ENABLED && WordForgePage && (
              <>
                <Route path="/word-forge" element={
                  <ProtectedRoute>
                    <Suspense fallback={<Spinner />}>
                      <WordForgePage />
                    </Suspense>
                  </ProtectedRoute>
                } />
                {ForgeStatsPage && (
                  <Route path="/word-forge/stats" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Suspense fallback={<Spinner />}>
                          <ForgeStatsPage />
                        </Suspense>
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                )}
                {SectorMapPage && (
                  <Route path="/word-forge/map" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Suspense fallback={<Spinner />}>
                          <SectorMapPage />
                        </Suspense>
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                )}
                {WordForgeLeaderboardPage && (
                  <Route path="/word-forge/leaderboard" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Suspense fallback={<Spinner />}>
                          <WordForgeLeaderboardPage />
                        </Suspense>
                      </DashboardLayout>
                    </ProtectedRoute>
                  } />
                )}
              </>
            )}
          </>
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isNative && (ARXON_UI_V2_ENABLED ? <MobileBottomNavV2 /> : <MobileBottomNav />)}
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
              <NetworkOfflineBanner />
              <AppUpdateOverlay />
              <RouterShell>
                <MobileNavProvider>
                  <AppRoutes />
                </MobileNavProvider>
              </RouterShell>
            </TooltipProvider>
          </PointsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
