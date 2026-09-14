import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { useCheckin } from '@/hooks/useCheckin';
import { useMining } from '@/hooks/useMining';
import { TOUR_STEPS, nextTourStepId, type TourStepConfig } from '@/lib/tour/steps';
import {
  isTourFinished,
  markTourFinished,
  markTourSkipped,
  setAppTourActive,
  type TourStepId,
} from '@/lib/tour/tourStorage';

const SKIP_PATHS = ['/auth', '/admin', '/reset-password', '/change-password', '/auth/confirm'];

type StartTourOptions = { replay?: boolean };

type AppTourContextValue = {
  active: boolean;
  isReplay: boolean;
  step: TourStepConfig | null;
  stepIndex: number;
  totalSteps: number;
  startTour: (options?: StartTourOptions) => void;
  skipTour: () => void;
  nextStep: () => void;
};

const AppTourContext = createContext<AppTourContextValue | null>(null);

function pathBlocked(pathname: string) {
  return SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function routeMatches(stepRoute: string, pathname: string, search: string) {
  if (stepRoute.includes('?')) {
    const [path, query] = stepRoute.split('?');
    return pathname === path && search.includes(query);
  }
  return pathname === stepRoute;
}

export function AppTourProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const verification = useVerification();
  const { canCheckin, loading: checkinLoading } = useCheckin();
  const mining = useMining({ tickMs: 2000 });

  const [active, setActive] = useState(false);
  const [isReplay, setIsReplay] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<TourStepId>('welcome');
  const [booted, setBooted] = useState(false);
  const replayModeRef = useRef(false);

  const verifyDone = verification.isComplete;
  const tasksDone = !canCheckin && !checkinLoading;
  const miningDone = mining.isMining;

  const shouldSkipStep = useCallback(
    (id: TourStepId) => {
      if (replayModeRef.current || id === 'welcome') return false;
      if (id === 'verify' && verifyDone) return true;
      if (id === 'tasks' && tasksDone) return true;
      if (id === 'mining' && miningDone) return true;
      return false;
    },
    [verifyDone, tasksDone, miningDone],
  );

  const visibleSteps = useMemo(
    () => (isReplay ? TOUR_STEPS : TOUR_STEPS.filter((s) => !shouldSkipStep(s.id))),
    [shouldSkipStep, isReplay],
  );

  const step = TOUR_STEPS.find((s) => s.id === currentStepId) ?? null;
  const stepIndex = Math.max(0, visibleSteps.findIndex((s) => s.id === currentStepId));
  const totalSteps = visibleSteps.length;

  const endTour = useCallback(() => {
    replayModeRef.current = false;
    setIsReplay(false);
    setAppTourActive(false);
  }, []);

  const finishTour = useCallback(
    (last: TourStepId) => {
      if (user) markTourFinished(user.id, last);
      setActive(false);
      endTour();
    },
    [user, endTour],
  );

  const skipTour = useCallback(() => {
    if (user) markTourSkipped(user.id, step?.id ?? null);
    setActive(false);
    endTour();
  }, [user, step?.id, endTour]);

  const nextStep = useCallback(() => {
    const nextId = nextTourStepId(currentStepId, shouldSkipStep);
    if (!nextId) {
      finishTour(currentStepId);
      return;
    }
    setCurrentStepId(nextId);
  }, [currentStepId, shouldSkipStep, finishTour]);

  const startTour = useCallback(
    (options?: StartTourOptions) => {
      if (!user || pathBlocked(location.pathname)) return;
      const replay = Boolean(options?.replay);
      replayModeRef.current = replay;
      setIsReplay(replay);
      setCurrentStepId('welcome');
      setActive(true);
      setAppTourActive(true);
    },
    [user, location.pathname],
  );

  useEffect(() => {
    if (authLoading || !user || booted) return;
    if (pathBlocked(location.pathname)) return;
    if (isTourFinished(user.id)) {
      setBooted(true);
      return;
    }
    const bootDelay = Capacitor.isNativePlatform() ? 3200 : 1400;
    const timer = window.setTimeout(() => {
      replayModeRef.current = false;
      setIsReplay(false);
      setCurrentStepId('welcome');
      setActive(true);
      setAppTourActive(true);
      setBooted(true);
    }, bootDelay);
    return () => window.clearTimeout(timer);
  }, [authLoading, user, booted, location.pathname]);

  useEffect(() => {
    if (!active || !step?.route) return;
    if (!routeMatches(step.route, location.pathname, location.search)) {
      navigate(step.route);
    }
  }, [active, step, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!active || !step || step.id === 'welcome' || isReplay) return;

    if (step.id === 'verify' && verifyDone) {
      nextStep();
      return;
    }

    if (step.id === 'tasks' && tasksDone) {
      nextStep();
      return;
    }

    if (step.id === 'mining' && miningDone) {
      finishTour('mining');
    }
  }, [active, step, isReplay, verifyDone, tasksDone, miningDone, nextStep, finishTour]);

  useEffect(() => {
    if (!active || step?.id !== 'tasks') return;
    const onTaskClaimed = () => nextStep();
    window.addEventListener('arxon-tour-task-claimed', onTaskClaimed);
    return () => window.removeEventListener('arxon-tour-task-claimed', onTaskClaimed);
  }, [active, step?.id, nextStep]);

  useEffect(() => {
    if (!active || step?.id !== 'mining') return;
    const onMiningStarted = () => finishTour('mining');
    window.addEventListener('arxon-tour-mining-started', onMiningStarted);
    return () => window.removeEventListener('arxon-tour-mining-started', onMiningStarted);
  }, [active, step?.id, finishTour]);

  const value = useMemo(
    () => ({
      active,
      isReplay,
      step,
      stepIndex,
      totalSteps,
      startTour,
      skipTour,
      nextStep,
    }),
    [active, isReplay, step, stepIndex, totalSteps, startTour, skipTour, nextStep],
  );

  return <AppTourContext.Provider value={value}>{children}</AppTourContext.Provider>;
}

export function useAppTour() {
  const ctx = useContext(AppTourContext);
  if (!ctx) throw new Error('useAppTour must be used within AppTourProvider');
  return ctx;
}

export function useAppTourOptional() {
  return useContext(AppTourContext);
}
