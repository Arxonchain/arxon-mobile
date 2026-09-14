import type { TourStepId } from './tourStorage';

export type TourStepConfig = {
  id: TourStepId;
  title: string;
  message: string;
  /** Route to open when this step starts */
  route?: string;
  /** `[data-tour="…"]` selector */
  target?: string;
  accent: string;
};

export const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'welcome',
    title: 'Welcome to Arxon',
    message: 'I\'ll walk you through the essentials — verify, earn, mine, and play. Tap Start when you\'re ready.',
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
  {
    id: 'play',
    title: 'Arena or games',
    message: 'Jump into Arena battles or play Word Forge from here. Pick one to explore.',
    route: '/',
    target: 'play-carousel',
    accent: 'hsl(255 55% 68%)',
  },
];

export function tourTargetSelector(target?: string) {
  return target ? `[data-tour="${target}"]` : null;
}
