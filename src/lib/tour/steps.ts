import type { TourStepId } from './tourStorage';

export type TourStepConfig = {
  id: TourStepId;
  title: string;
  message: string;
  route?: string;
  target?: string;
  accent: string;
};

/** Fixed order — verify → tasks → mining (3 action steps after welcome). */
export const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'welcome',
    title: 'Welcome to Arxon',
    message: 'Three quick stops: verify, claim tasks, then start mining. Tap Start when you\'re ready.',
    accent: 'hsl(215 55% 62%)',
  },
  {
    id: 'verify',
    title: 'Verify your account',
    message: 'Complete email, country, and age here. It unlocks future airdrops — takes about a minute.',
    route: '/settings?tab=verification',
    target: 'verify-panel',
    accent: 'hsl(155 50% 52%)',
  },
  {
    id: 'tasks',
    title: 'Claim your task points',
    message: 'Check in daily and claim missions here to boost your ARX-P balance.',
    route: '/tasks',
    target: 'tasks-claim',
    accent: 'hsl(38 90% 55%)',
  },
  {
    id: 'mining',
    title: 'Start mining',
    message: 'Tap the orb to start your session. ARX-P accrues while you mine — up to 8 hours.',
    route: '/',
    target: 'mining-start',
    accent: 'hsl(190 85% 55%)',
  },
];

export function tourTargetSelector(target?: string) {
  return target ? `[data-tour="${target}"]` : null;
}

export function nextTourStepId(
  currentId: TourStepId,
  shouldSkip: (id: TourStepId) => boolean,
): TourStepId | null {
  const idx = TOUR_STEPS.findIndex((s) => s.id === currentId);
  for (let i = idx + 1; i < TOUR_STEPS.length; i++) {
    const id = TOUR_STEPS[i].id;
    if (!shouldSkip(id)) return id;
  }
  return null;
}
