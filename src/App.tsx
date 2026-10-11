import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PointsProvider } from "@/hooks/usePoints";
import { Capacitor } from "@capacitor/core";
import { lobbyPathForDiceInvite, type DiceInviteMode } from "@/features/dice/diceInviteUrl";

// Critical-path sync (auth + splash + home shell). Everything else is lazy so OTA main JS stays smaller.
import AuthPage from "@/pages/AuthPage";
import AuthLandingV2 from "@/features/arxon-v2/pages/AuthLandingV2";
import AuthConfirm from "@/pages/AuthConfirm";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ChangePassword from "@/pages/ChangePassword";
import MobileSplash from "@/components/mobile/MobileSplash";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import MobileBottomNavV2 from "@/features/arxon-v2/layout/MobileBottomNavV2";
import DashboardV2 from "@/features/arxon-v2/pages/DashboardV2";
import SessionRecovery from "@/components/system/SessionRecovery";
import PushNavListener from "@/components/system/PushNavListener";
import AppDeepLinkListener from "@/components/system/AppDeepLinkListener";
import NetworkOfflineBanner from "@/components/system/NetworkOfflineBanner";
import AppUpdateOverlay from "@/components/system/AppUpdateOverlay";
import AppFailureScreen from "@/components/system/AppFailureScreen";
import SlowLoadOverlay from "@/components/system/SlowLoadOverlay";
import BrandedSpinner from "@/components/system/BrandedSpinner";
import { markBootOk } from "@/lib/bootState";
import { isDevPublicPath } from "@/lib/devPublicRoutes";
import { errorUi } from "@/components/system/errorUiTokens";
import WebBundleRefreshInit from "@/components/system/WebBundleRefreshInit";
import SentryUserSync from "@/components/system/SentryUserSync";
import { Sentry } from "@/lib/sentry";
import { MobileNavProvider } from "@/contexts/MobileNavContext";
import AppPreviewShell, { PreviewSpinner } from "@/features/arxon-v2/preview/AppPreviewShell";
const FailureUiPreview = lazy(() => import("@/pages/dev/FailureUiPreview"));
import {
  PreviewWordForgePage,
  PreviewForgeStatsPage,
  PreviewSectorMapPage,
  PreviewWordForgeLeaderboardPage,
} from "@/features/arxon-v2/preview/previewLazyPages";
import { ARXON_UI_V2_ENABLED } from "@/lib/uiFeature";
import { WORD_FORGE_ENABLED } from "@/lib/wordForgeFeature";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useForgeDailyReminder } from "@/features/word-forge/hooks/useForgeDailyReminder";
import V2NotificationPopup from "@/features/arxon-v2/components/V2NotificationPopup";
import VerificationDailyPrompt from "@/components/verification/VerificationDailyPrompt";
import { AppTourProvider } from "@/contexts/AppTourContext";
import AppTourGuide from "@/components/tour/AppTourGuide";
import { gamesRouteContent as g } from "@/components/system/gamesRoute";
import GamesMaintenanceScreen from "@/components/system/GamesMaintenanceScreen";
import { GAMES_MAINTENANCE_MODE } from "@/lib/gamesMaintenance";
import { APP_MAINTENANCE_MODE } from "@/lib/appMaintenance";
import AppMaintenanceScreen from "@/components/system/AppMaintenanceScreen";

function DiceShortInviteRedirect({ mode }: { mode: DiceInviteMode }) {
  const { code = '' } = useParams<{ code: string }>();
  if (GAMES_MAINTENANCE_MODE) return <GamesMaintenanceScreen />;
  return <Navigate to={lobbyPathForDiceInvite(mode, code)} replace />;
}

const Landing = lazy(() => import("@/pages/Landing"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const DashboardLayout = lazy(() => import("@/components/layout/DashboardLayout"));
const Mining = lazy(() => import("@/pages/Mining"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Arena = lazy(() => import("@/pages/Arena"));
const Referrals = lazy(() => import("@/pages/Referrals"));
const Nexus = lazy(() => import("@/pages/Nexus"));
const Profile = lazy(() => import("@/pages/Profile"));
const Settings = lazy(() => import("@/pages/Settings"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const PointsHistory = lazy(() => import("@/pages/PointsHistory"));
const Whitepaper = lazy(() => import("@/pages/Whitepaper"));
const TermsOfService = lazy(() => import("@/pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("@/pages/legal/PrivacyPolicy"));
const PublicProfile = lazy(() => import("@/pages/PublicProfile"));

const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminSignups = lazy(() => import("@/pages/admin/AdminSignups"));
const AdminControls = lazy(() => import("@/pages/admin/AdminControls"));
const AdminArena = lazy(() => import("@/pages/admin/AdminArena"));
const AdminReconciliation = lazy(() => import("@/pages/admin/AdminReconciliation"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminImportUsers = lazy(() => import("@/pages/admin/AdminImportUsers"));
const AdminExportFilter = lazy(() => import("@/pages/admin/AdminExportFilter"));
const AdminBattleHistory = lazy(() => import("@/pages/admin/AdminBattleHistory"));
const AdminGlobalMap = lazy(() => import("@/pages/admin/AdminGlobalMap"));
const AdminTasks = lazy(() => import("@/pages/admin/AdminTasks"));
const AdminReferrals = lazy(() => import("@/pages/admin/AdminReferrals"));
const AdminReferralRecovery = lazy(() => import("@/pages/admin/AdminReferralRecovery"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminAnnouncements = lazy(() => import("@/pages/admin/AdminAnnouncements"));
const AdminClaims = lazy(() => import("@/pages/admin/AdminClaims"));

const MobileDashboard = lazy(() => import("@/components/mobile/MobileDashboard"));
const MobileMining = lazy(() => import("@/components/mobile/MobileMining"));
const MobileLeaderboard = lazy(() => import("@/components/mobile/MobileLeaderboard"));
const MobileArena = lazy(() => import("@/components/mobile/MobileArena"));
const MobileNexus = lazy(() => import("@/components/mobile/MobileNexus"));
const MobileProfile = lazy(() => import("@/components/mobile/MobileProfile"));
const MobileWallet = lazy(() => import("@/components/mobile/MobileWallet"));
const MobileSettings = lazy(() => import("@/components/mobile/MobileSettings"));

const ArenaV2 = lazy(() => import("@/features/arxon-v2/pages/ArenaV2"));
const PredictionMarketV2 = lazy(() => import("@/features/arxon-v2/pages/PredictionMarketV2"));
const LeaderboardV2 = lazy(() => import("@/features/arxon-v2/pages/LeaderboardV2"));
const ProfileV2 = lazy(() => import("@/features/arxon-v2/pages/ProfileV2"));
const TasksV2 = lazy(() => import("@/features/arxon-v2/pages/TasksV2"));
const ReferralsV2 = lazy(() => import("@/features/arxon-v2/pages/ReferralsV2"));
const NexusV2 = lazy(() => import("@/features/arxon-v2/pages/NexusV2"));
const WalletV2 = lazy(() => import("@/features/arxon-v2/pages/WalletV2"));
const SettingsV2 = lazy(() => import("@/features/arxon-v2/pages/SettingsV2"));
const NotificationsV2 = lazy(() => import("@/features/arxon-v2/pages/NotificationsV2"));
const PointsHistoryV2 = lazy(() => import("@/features/arxon-v2/pages/PointsHistoryV2"));
const DiceHubV2 = lazy(() => import("@/features/arxon-v2/pages/DiceHubV2"));
const DiceMatchV2 = lazy(() => import("@/features/arxon-v2/pages/DiceMatchV2"));
const DiceDuelLobbyV2 = lazy(() => import("@/features/arxon-v2/pages/DiceDuelLobbyV2"));
const DiceDuelMatchV2 = lazy(() => import("@/features/arxon-v2/pages/DiceDuelMatchV2"));
const DiceRumbleLobbyV2 = lazy(() => import("@/features/arxon-v2/pages/DiceRumbleLobbyV2"));
const DiceRumbleMatchV2 = lazy(() => import("@/features/arxon-v2/pages/DiceRumbleMatchV2"));
const DashboardNeon = lazy(() => import("@/features/arxon-v2/pages/DashboardNeon"));

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
  <div style={{ minHeight: '100vh', background: errorUi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <BrandedSpinner label="Loading…" />
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
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error);
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }
  render() {
    if (this.state.hasError) {
      return (
        <AppFailureScreen
          failureType="unknown"
          onPrimary={() => {
            this.setState({ hasError: false, error: null });
            window.location.hash = '#/';
            window.location.reload();
          }}
          devError={this.state.error}
        />
      );
    }
    return this.props.children;
  }
}

function PushNotificationInit() {
  // listen:true — only this mount owns FCM + realtime push side-effects
  const { preferences } = usePushNotifications({ listen: true });
  useForgeDailyReminder(preferences.wordForgeDaily && !GAMES_MAINTENANCE_MODE);
  return ARXON_UI_V2_ENABLED ? <V2NotificationPopup /> : null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/auth" replace />;
  // Recovery sessions must update password before accessing the app.
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem("arxon_password_recovery") === "1") {
        return <Navigate to="/reset-password" replace />;
      }
    } catch {
      // ignore
    }
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) {
    try {
      if (sessionStorage.getItem("arxon_password_recovery") === "1") {
        return <Navigate to="/reset-password" replace />;
      }
    } catch {
      // ignore
    }
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function MobilePage({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', paddingBottom: 100, fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif" }}>
      {children}
    </div>
  );
}

function DevPublicRoutes() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/dev/failure-ui" element={<FailureUiPreview />} />
        <Route path="/dev/*" element={<Navigate to="/dev/failure-ui" replace />} />
      </Routes>
    </Suspense>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(!isNative);

  if (isDevPublicPath(location.pathname)) {
    return <DevPublicRoutes />;
  }

  if (isNative && !splashDone) {
    return (
      <>
        <MobileSplash isAppReady={!loading} onFinish={() => setSplashDone(true)} />
        <SlowLoadOverlay loading={loading} delayMs={2500} message="Starting Arxon…" />
      </>
    );
  }
  if (loading) {
    return (
      <>
        <Spinner />
        <SlowLoadOverlay loading delayMs={2500} message="Still loading…" />
      </>
    );
  }

  return (
    <>
      <PushNavListener />
      <AppDeepLinkListener />
      <SessionRecovery />
      <PushNotificationInit />
      <VerificationDailyPrompt />
      <AppTourGuide />
      <WebBundleRefreshInit />
      <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/auth"           element={<PublicRoute>{ARXON_UI_V2_ENABLED ? <AuthLandingV2 /> : <AuthPage />}</PublicRoute>} />
        <Route path="/auth/confirm"   element={<AuthConfirm />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/whitepaper"     element={<Whitepaper />} />
        <Route path="/litepaper"      element={<Navigate to="/whitepaper" replace />} />
        <Route path="/terms"          element={<TermsOfService />} />
        <Route path="/privacy"        element={<PrivacyPolicy />} />
        <Route path="/admin/login"    element={<AdminLogin />} />
        <Route path="/ui-preview" element={<AppPreviewShell />}>
          <Route index element={<DashboardNeon preview />} />
          <Route path="mining" element={<Navigate to="/ui-preview" replace />} />
          <Route path="arena/prediction-market" element={<PredictionMarketV2 />} />
          <Route path="arena/dice" element={g(<DiceHubV2 />)} />
          <Route path="arena/dice/house" element={g(<DiceMatchV2 />)} />
          <Route path="arena/dice/duel" element={g(<DiceDuelLobbyV2 />)} />
          <Route path="arena/dice/duel/:matchId" element={g(<DiceDuelMatchV2 />)} />
          <Route path="arena/dice/rumble" element={g(<DiceRumbleLobbyV2 />)} />
          <Route path="arena/dice/rumble/:matchId" element={g(<DiceRumbleMatchV2 />)} />
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
                {g(<GamingHubPage />)}
              </Suspense>
            } />
          )}
          {WORD_FORGE_ENABLED && PreviewWordForgePage && (
            <>
              <Route path="word-forge" element={
                <Suspense fallback={<PreviewSpinner />}>
                  {g(<PreviewWordForgePage />)}
                </Suspense>
              } />
              {PreviewForgeStatsPage && (
                <Route path="word-forge/stats" element={
                  <Suspense fallback={<PreviewSpinner />}>
                    {g(<PreviewForgeStatsPage />)}
                  </Suspense>
                } />
              )}
              {PreviewSectorMapPage && (
                <Route path="word-forge/map" element={
                  <Suspense fallback={<PreviewSpinner />}>
                    {g(<PreviewSectorMapPage />)}
                  </Suspense>
                } />
              )}
              {PreviewWordForgeLeaderboardPage && (
                <Route path="word-forge/leaderboard" element={
                  <Suspense fallback={<PreviewSpinner />}>
                    {g(<PreviewWordForgeLeaderboardPage />)}
                  </Suspense>
                } />
              )}
            </>
          )}
          <Route path="dashboard" element={<Navigate to="/ui-preview" replace />} />
        </Route>
        <Route path="/word-forge-preview" element={
          <Suspense fallback={<Spinner />}>
            {g(<WordForgePreviewPage />)}
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
                    {g(<GamingHubPage />)}
                  </Suspense>
                </ProtectedRoute>
              } />
            )}
            {/*
              V2 / store+OTA (VITE_ARXON_UI_V2=true): /mining redirects to dashboard.
              Classic (flag unset): keep /mining page.
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
            <Route path="/arena/dice" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? g(<DiceHubV2 />) : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/house" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? g(<DiceMatchV2 />) : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/duel" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? g(<DiceDuelLobbyV2 />) : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/duel/:matchId" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? g(<DiceDuelMatchV2 />) : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/rumble" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? g(<DiceRumbleLobbyV2 />) : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            <Route path="/arena/dice/rumble/:matchId" element={<ProtectedRoute>{ARXON_UI_V2_ENABLED ? g(<DiceRumbleMatchV2 />) : <Navigate to="/arena" replace />}</ProtectedRoute>} />
            {/* Short brand invite paths → existing ?code= join UX (if Capacitor/HashRouter ever receives them) */}
            <Route path="/d/:code" element={<DiceShortInviteRedirect mode="duel" />} />
            <Route path="/r/:code" element={<DiceShortInviteRedirect mode="rumble" />} />
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
                      {g(<WordForgePage />)}
                    </Suspense>
                  </ProtectedRoute>
                } />
                {ForgeStatsPage && (
                  <Route path="/word-forge/stats" element={
                    <ProtectedRoute>
                      <Suspense fallback={<Spinner />}>
                        {g(<ForgeStatsPage />)}
                      </Suspense>
                    </ProtectedRoute>
                  } />
                )}
                {SectorMapPage && (
                  <Route path="/word-forge/map" element={
                    <ProtectedRoute>
                      <Suspense fallback={<Spinner />}>
                        {g(<SectorMapPage />)}
                      </Suspense>
                    </ProtectedRoute>
                  } />
                )}
                {WordForgeLeaderboardPage && (
                  <Route path="/word-forge/leaderboard" element={
                    <ProtectedRoute>
                      <Suspense fallback={<Spinner />}>
                        {g(<WordForgeLeaderboardPage />)}
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
                      {g(<GamingHubPage />)}
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
                      {g(<WordForgePage />)}
                    </Suspense>
                  </ProtectedRoute>
                } />
                {ForgeStatsPage && (
                  <Route path="/word-forge/stats" element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Suspense fallback={<Spinner />}>
                          {g(<ForgeStatsPage />)}
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
                          {g(<SectorMapPage />)}
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
                          {g(<WordForgeLeaderboardPage />)}
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
      </Suspense>

      {isNative && (ARXON_UI_V2_ENABLED ? <MobileBottomNavV2 /> : <MobileBottomNav />)}
    </>
  );
}

function RouterShell({ children }: { children: React.ReactNode }) {
  return isNative ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>;
}

function App() {
  useEffect(() => {
    markBootOk();
  }, []);

  if (APP_MAINTENANCE_MODE) {
    return <AppMaintenanceScreen />;
  }

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SentryUserSync />
          <PointsProvider>
            <TooltipProvider>
              <Toaster />
              <NetworkOfflineBanner />
              <AppUpdateOverlay />
              <RouterShell>
                <AppTourProvider>
                  <MobileNavProvider>
                    <AppRoutes />
                  </MobileNavProvider>
                </AppTourProvider>
              </RouterShell>
            </TooltipProvider>
          </PointsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

export default App;
