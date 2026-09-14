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
import { TOUR_STEPS, type TourStepConfig } from '@/lib/tour/steps';
import {
  isTourFinished,
  markTourFinished,
  markTourSkipped,
  setAppTourActive,
  type TourStepId,
} from '@/lib/tour/tourStorage';

const SKIP_PATHS = ['/auth', '/admin', '/reset-password', '/change-password', '/auth/confirm'];

type AppTourContextValue = {
  active: boolean;
  step: TourStepConfig | null;
  stepIndex: number;
  totalSteps: number;
  startTour: () => void;
  skipTour: () => void;
  nextStep: () => void;
};

const AppTourContext = createContext<AppTourContextValue | null>(null);

function pathBlocked(pathname: string) {
  return SKIP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function filterSteps(opts: {
  verifyDone: boolean;
  tasksDone: boolean;
  miningDone: boolean;
}): TourStepConfig[] {
  return TOUR_STEPS.filter((s) => {
    if (s.id === 'verify' && opts.verifyDone) return false;
    if (s.id === 'tasks' && opts.tasksDone) return false;
    if (s.id === 'mining' && opts.miningDone) return false;
    return true;
  });
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
  const [currentStepId, setCurrentStepId] = useState<TourStepId>('welcome');
  const [booted, setBooted] = useState(false);
  const prevCanCheckin = useRef<boolean | null>(null);

  const verifyDone = verification.isComplete;
  const tasksDone = !canCheckin && !checkinLoading;
  const miningDone = mining.isMining;

  const steps = useMemo(
    () => filterSteps({ verifyDone, tasksDone, miningDone }),
    [verifyDone, tasksDone, miningDone],
  );

  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === currentStepId));
  const step = steps[stepIndex] ?? steps[0] ?? null;
  const totalSteps = steps.length;

  const finishTour = useCallback(
    (last: TourStepId) => {
      if (user) markTourFinished(user.id, last);
      setActive(false);
      setAppTourActive(false);
    },
    [user],
  );

  const skipTour = useCallback(() => {
    if (user) markTourSkipped(user.id, step?.id ?? null);
    setActive(false);
    setAppTourActive(false);
  }, [user, step?.id]);

  const nextStep = useCallback(() => {
    const idx = steps.findIndex((s) => s.id === currentStepId);
    const next = idx >= 0 ? steps[idx + 1] : steps[0];
    if (!next) {
      finishTour(currentStepId);
      return;
    }
    setCurrentStepId(next.id);
  }, [steps, currentStepId, finishTour]);

  const startTour = useCallback(() => {
    if (!user || pathBlocked(location.pathname)) return;
    setCurrentStepId('welcome');
    setActive(true);
    setAppTourActive(true);
  }, [user, location.pathname]);

  useEffect(() => {
    if (!steps.some((s) => s.id === currentStepId) && steps[0]) {
      setCurrentStepId(steps[0].id);
    }
  }, [steps, currentStepId]);

  useEffect(() => {
    if (authLoading || !user || booted) return;
    if (pathBlocked(location.pathname)) return;
    if (isTourFinished(user.id)) {
      setBooted(true);
      return;
    }
    const bootDelay = Capacitor.isNativePlatform() ? 3200 : 1400;
    const timer = window.setTimeout(() => {
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
    if (!active || !step) return;
    if (step.id === 'welcome') return;

    if (step.id === 'verify' && verification.isComplete) {
      nextStep();
      return;
    }

    if (step.id === 'tasks') {
      if (prevCanCheckin.current === true && !canCheckin) {
        nextStep();
        return;
      }
      if (tasksDone) {
        nextStep();
      }
    }

    if (step.id === 'mining' && mining.isMining) {
      nextStep();
      return;
    }

    if (step.id === 'play') {
      const onPlayRoute = /^\/(arena|games|word-forge)(\/|$)/.test(location.pathname);
      if (onPlayRoute) finishTour('play');
    }
  }, [
    active,
    step,
    verification.isComplete,
    canCheckin,
    tasksDone,
    mining.isMining,
    location.pathname,
    nextStep,
    finishTour,
  ]);

  useEffect(() => {
    if (!checkinLoading && prevCanCheckin.current === null) {
      prevCanCheckin.current = canCheckin;
    } else if (!checkinLoading) {
      prevCanCheckin.current = canCheckin;
    }
  }, [canCheckin, checkinLoading]);

  useEffect(() => {
    if (!active || step?.id !== 'tasks') return;
    const onTaskClaimed = () => nextStep();
    window.addEventListener('arxon-tour-task-claimed', onTaskClaimed);
    return () => window.removeEventListener('arxon-tour-task-claimed', onTaskClaimed);
  }, [active, step?.id, nextStep]);

  const value = useMemo(
    () => ({
      active,
      step,
      stepIndex,
      totalSteps,
      startTour,
      skipTour,
      nextStep,
    }),
    [active, step, stepIndex, totalSteps, startTour, skipTour, nextStep],
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
