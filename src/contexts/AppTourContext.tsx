import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMining } from '@/hooks/useMining';
import { useVerification } from '@/hooks/useVerification';
import { useCheckin } from '@/hooks/useCheckin';
import { readTestnetLink } from '@/lib/testnetWalletLink';
import { sessionStore } from '@/chainWallet/session';
import { nextTourStepId, TOUR_STEPS, type TourStepConfig } from '@/lib/tour/steps';
import { nextWalletTourStepId, WALLET_TOUR_STEPS } from '@/lib/tour/walletSteps';
import {
  isTourFinished,
  markTourFinished,
  markTourSkipped,
  resetTourProgress,
  setAppTourActive,
  type TourStepId,
} from '@/lib/tour/tourStorage';
import {
  isWalletTourFinished,
  markWalletTourFinished,
  markWalletTourSkipped,
  resetWalletTourProgress,
  type WalletTourStepId,
} from '@/lib/tour/walletTourStorage';

type AppMode = 'wallet' | 'mining';

function readAppMode(): AppMode {
  try {
    return sessionStorage.getItem('arxon-app-mode') === 'mining' ? 'mining' : 'wallet';
  } catch {
    return 'wallet';
  }
}

type AppTourContextValue = {
  active: boolean;
  kind: AppMode;
  step: TourStepConfig | null;
  stepIndex: number;
  totalSteps: number;
  continueTour: () => void;
  skipTour: () => void;
  restartTour: () => void;
  startTour: (opts?: { replay?: boolean; kind?: AppMode }) => void;
};

const AppTourContext = createContext<AppTourContextValue | null>(null);

export function AppTourProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMining } = useMining();
  const { isComplete } = useVerification();
  const { canCheckin } = useCheckin();

  const [mode, setMode] = useState<AppMode>(readAppMode);
  const [walletReady, setWalletReady] = useState(false);
  const [miningActive, setMiningActive] = useState(false);
  const [walletActive, setWalletActive] = useState(false);
  const [miningStepId, setMiningStepId] = useState<TourStepId>('welcome');
  const [walletStepId, setWalletStepId] = useState<WalletTourStepId>('welcome');

  const tourUser = user?.id ?? 'wallet';
  const kind: AppMode = mode;
  const active = kind === 'wallet' ? walletActive : miningActive;

  const shouldSkipMining = useCallback(
    (id: TourStepId) => {
      if (id === 'mining' && isMining) return true;
      if (id === 'tasks' && !canCheckin) return true;
      if ((id === 'verify' || id === 'verify-steps') && isComplete) return true;
      if ((id === 'wallet' || id === 'mine-testnet') && user && readTestnetLink(user.id)) return true;
      return false;
    },
    [canCheckin, isComplete, isMining, user],
  );

  const shouldSkipWallet = useCallback((id: WalletTourStepId) => {
    const added = sessionStore.testnetAdded();
    if (id === 'testnet-add' && added) return true;
    if (id === 'testnet-history' && !added) return true;
    return false;
  }, []);

  useEffect(() => {
    const onMode = (e: Event) => {
      const next = (e as CustomEvent<AppMode>).detail;
      if (next === 'wallet' || next === 'mining') setMode(next);
    };
    const onReady = () => setWalletReady(true);
    const onBusy = () => setWalletReady(false);
    window.addEventListener('arxon-app-mode', onMode);
    window.addEventListener('arxon-wallet-ready', onReady);
    window.addEventListener('arxon-wallet-busy', onBusy);
    setMode(readAppMode());
    return () => {
      window.removeEventListener('arxon-app-mode', onMode);
      window.removeEventListener('arxon-wallet-ready', onReady);
      window.removeEventListener('arxon-wallet-busy', onBusy);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'mining') {
      setMiningActive(false);
      return;
    }
    if (!user) return;
    if (isTourFinished(user.id)) return;
    setMiningActive(true);
  }, [mode, user]);

  useEffect(() => {
    if (mode !== 'wallet') {
      setWalletActive(false);
      return;
    }
    if (!walletReady) return;
    if (isWalletTourFinished(tourUser)) return;
    setWalletActive(true);
  }, [mode, tourUser, walletReady]);

  useEffect(() => {
    setAppTourActive(active);
  }, [active]);

  const miningStep = useMemo(
    () => TOUR_STEPS.find((s) => s.id === miningStepId) ?? null,
    [miningStepId],
  );
  const walletStep = useMemo(
    () => WALLET_TOUR_STEPS.find((s) => s.id === walletStepId) ?? null,
    [walletStepId],
  );
  const step = kind === 'wallet' ? walletStep : miningStep;
  const stepIndex =
    kind === 'wallet'
      ? Math.max(0, WALLET_TOUR_STEPS.findIndex((s) => s.id === walletStepId))
      : Math.max(0, TOUR_STEPS.findIndex((s) => s.id === miningStepId));
  const totalSteps = kind === 'wallet' ? WALLET_TOUR_STEPS.length : TOUR_STEPS.length;

  useEffect(() => {
    if (!miningActive || !miningStep?.route) return;
    const here = `${location.pathname}${location.search || ''}`;
    if (here !== miningStep.route) navigate(miningStep.route);
  }, [miningActive, miningStep?.route, miningStepId, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (!walletActive) return;
    const dest = walletStep?.walletScreen;
    if (!dest) return;
    window.dispatchEvent(new CustomEvent('arxon-tour-wallet-go', { detail: { dest } }));
  }, [walletActive, walletStep?.walletScreen, walletStepId]);

  useEffect(() => {
    if (!miningActive || miningStepId !== 'wallet') return;
    const ping = () => window.dispatchEvent(new Event('arxon-tour-show-testnet'));
    ping();
    const id = window.setInterval(ping, 280);
    const stop = window.setTimeout(() => window.clearInterval(id), 2400);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [miningActive, miningStepId]);

  const finishMining = useCallback(() => {
    if (user) markTourFinished(user.id, miningStepId);
    setMiningActive(false);
  }, [miningStepId, user]);

  const finishWallet = useCallback(() => {
    markWalletTourFinished(tourUser, walletStepId);
    setWalletActive(false);
  }, [tourUser, walletStepId]);

  const continueTour = useCallback(() => {
    if (kind === 'wallet') {
      const next = nextWalletTourStepId(walletStepId, shouldSkipWallet);
      if (!next) {
        finishWallet();
        return;
      }
      setWalletStepId(next);
      return;
    }
    const next = nextTourStepId(miningStepId, shouldSkipMining);
    if (!next) {
      finishMining();
      return;
    }
    setMiningStepId(next);
  }, [finishMining, finishWallet, kind, miningStepId, shouldSkipMining, shouldSkipWallet, walletStepId]);

  const skipTour = useCallback(() => {
    if (kind === 'wallet') {
      markWalletTourSkipped(tourUser, walletStepId);
      setWalletActive(false);
      return;
    }
    if (user) markTourSkipped(user.id, miningStepId);
    setMiningActive(false);
  }, [kind, miningStepId, tourUser, user, walletStepId]);

  const startTour = useCallback(
    (opts?: { replay?: boolean; kind?: AppMode }) => {
      const which = opts?.kind ?? kind;
      if (which === 'wallet') {
        if (opts?.replay) resetWalletTourProgress(tourUser);
        setWalletStepId('welcome');
        setWalletActive(true);
        setAppTourActive(true);
        return;
      }
      if (!user) return;
      if (opts?.replay) resetTourProgress(user.id);
      setMiningStepId('welcome');
      setMiningActive(true);
      setAppTourActive(true);
    },
    [kind, tourUser, user],
  );

  const restartTour = useCallback(() => {
    startTour({ replay: true, kind });
  }, [kind, startTour]);

  useEffect(() => {
    const onMined = () => {
      if (!miningActive || miningStepId !== 'mining') return;
      continueTour();
    };
    const onClaimed = () => {
      if (!miningActive || miningStepId !== 'tasks') return;
      continueTour();
    };
    window.addEventListener('arxon-tour-mining-started', onMined);
    window.addEventListener('arxon-tour-task-claimed', onClaimed);
    return () => {
      window.removeEventListener('arxon-tour-mining-started', onMined);
      window.removeEventListener('arxon-tour-task-claimed', onClaimed);
    };
  }, [continueTour, miningActive, miningStepId]);

  useEffect(() => {
    if (!miningActive) return;
    if (miningStepId !== 'verify' && miningStepId !== 'verify-steps') return;
    if (isComplete) finishMining();
  }, [finishMining, isComplete, miningActive, miningStepId]);

  const value = useMemo<AppTourContextValue>(
    () => ({
      active,
      kind,
      step,
      stepIndex,
      totalSteps,
      continueTour,
      skipTour,
      restartTour,
      startTour,
    }),
    [active, continueTour, kind, restartTour, skipTour, startTour, step, stepIndex, totalSteps],
  );

  return <AppTourContext.Provider value={value}>{children}</AppTourContext.Provider>;
}

const EMPTY: AppTourContextValue = {
  active: false,
  kind: 'mining',
  step: null,
  stepIndex: 0,
  totalSteps: TOUR_STEPS.length,
  continueTour: () => undefined,
  skipTour: () => undefined,
  restartTour: () => undefined,
  startTour: () => undefined,
};

export function useAppTour() {
  return useContext(AppTourContext) ?? EMPTY;
}

export function useAppTourOptional() {
  return useContext(AppTourContext);
}
