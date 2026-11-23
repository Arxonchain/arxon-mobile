import type { TourStepId } from './tourStorage';

export type TourStepConfig = {
  id: string;
  title: string;
  message: string;
  route?: string;
  target?: string;
  accent: string;
  card?: 'top' | 'bottom' | 'auto';
};

/** Mining home → tasks → wallet → tabs (Arena, Ranks, Refer, Nexus, Profile) → verify. */
export const TOUR_STEPS: TourStepConfig[] = [
  {
    id: 'welcome',
    title: 'Welcome to Arxon',
    message: 'A short walk through mining, tasks, wallet, Arena, Ranks, Refer, Nexus, Profile, and verification.',
    accent: 'hsl(215 55% 62%)',
  },
  {
    id: 'home-balance',
    title: 'Your ARX-P',
    message: 'Available Balance is your points. Mining, tasks, Arena, referrals, and Nexus all add ARX-P here.',
    route: '/mine',
    target: 'home-balance',
    accent: 'hsl(190 85% 55%)',
    card: 'bottom',
  },
  {
    id: 'mining',
    title: 'Start mining',
    message: 'Tap Start in the ring. Sessions last up to 8 hours. Stop anytime. Claim when the session fills.',
    route: '/mine',
    target: 'mining-start',
    accent: 'hsl(190 85% 55%)',
    card: 'bottom',
  },
  {
    id: 'home-actions',
    title: 'Home shortcuts',
    message: 'Tasks, Ranks, Refer, and Nexus. Check in, open the board, share your link, or send ARX-P.',
    route: '/mine',
    target: 'home-actions',
    accent: 'hsl(38 90% 55%)',
    card: 'bottom',
  },
  {
    id: 'nav-bar',
    title: 'Bottom tabs',
    message: 'Home, Arena, Ranks, and Profile. Arena is play. Ranks is the leaderboard. Profile is account and verify.',
    route: '/mine',
    target: 'nav-bar',
    accent: 'hsl(190 85% 55%)',
    card: 'top',
  },
  {
    id: 'tasks',
    title: 'Daily check-in',
    message: 'Tap Check in every day. Streaks raise your mining rate. Miss a day and the streak resets.',
    route: '/tasks',
    target: 'tasks-claim',
    accent: 'hsl(38 90% 55%)',
    card: 'bottom',
  },
  {
    id: 'tasks-list',
    title: 'Missions',
    message: 'To do, New, and Done. Open a mission, finish it, then claim. Lists show 5 — tap See more for the rest.',
    route: '/tasks',
    target: 'tasks-list',
    accent: 'hsl(38 90% 55%)',
    card: 'top',
  },
  {
    id: 'mine-testnet',
    title: 'Testnet tab',
    message: 'On Home, switch Mining → Testnet. That is where wallet connect and the 4-tx 5k ARX-P live.',
    route: '/mine',
    target: 'mine-testnet',
    accent: 'hsl(215 55% 62%)',
    card: 'bottom',
  },
  {
    id: 'wallet',
    title: 'Connect wallet',
    message: 'Tap Connect wallet and pick your Arxon testnet wallet. Only that wallet’s txns count toward the 5k claim.',
    route: '/mine',
    target: 'wallet-connect',
    accent: 'hsl(215 55% 62%)',
    card: 'bottom',
  },
  {
    id: 'arena',
    title: 'Arena',
    message: 'Prediction Market is here. Enter Market to vote and stake. Wins pay ARX-P on top of mining.',
    route: '/arena',
    target: 'arena-hub',
    accent: 'hsl(270 70% 68%)',
    card: 'bottom',
  },
  {
    id: 'ranks',
    title: 'Ranks',
    message: 'Your place on the global board. Top 3 sit on the podium. Scroll the rest of the list to 100.',
    route: '/leaderboard',
    target: 'ranks-you',
    accent: 'hsl(38 90% 55%)',
    card: 'bottom',
  },
  {
    id: 'refer',
    title: 'Refer friends',
    message: 'Share your code or link. You earn 100 ARX-P when a friend joins and mines. Copy shows the full link.',
    route: '/referrals',
    target: 'refer-code',
    accent: 'hsl(155 50% 52%)',
    card: 'bottom',
  },
  {
    id: 'nexus',
    title: 'Nexus',
    message: 'Copy your UID, then send 1–10 ARX-P. Type a receiver first — Send appears after that. Each send boosts mining 20%.',
    route: '/nexus',
    target: 'nexus-send',
    accent: 'hsl(190 85% 55%)',
    card: 'top',
  },
  {
    id: 'profile',
    title: 'Profile',
    message: 'Account, history, referrals, security, whitepaper, and settings. Verification is under App Settings.',
    route: '/profile',
    target: 'profile-account',
    accent: 'hsl(215 55% 62%)',
    card: 'top',
  },
  {
    id: 'verify',
    title: 'Verification',
    message: 'Four required checks: email, country, age 18+, and wallet. Progress sits at the top of this page.',
    route: '/settings?tab=verification',
    target: 'verify-panel',
    accent: 'hsl(155 50% 52%)',
    card: 'bottom',
  },
  {
    id: 'verify-steps',
    title: 'Finish all four',
    message: 'Confirm email, save country, confirm you are 18+, then connect wallet. Reminders stop when all four are done.',
    route: '/settings?tab=verification',
    target: 'verify-steps',
    accent: 'hsl(155 50% 52%)',
    card: 'top',
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
