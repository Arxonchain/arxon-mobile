import { dailySeed, isDailyCompleted } from './dailyChallenge';

export interface HintTask {
  id: string;
  emoji: string;
  title: string;
  description: string;
  reward: number;
  /** 'once' = lifetime, 'daily' = once per calendar day, 'weekly' = once per 7 days */
  cadence: 'once' | 'daily' | 'weekly';
}

export const HINT_TASKS: HintTask[] = [
  {
    id: 'refer-one',
    emoji: '👥',
    title: 'Refer 1 miner',
    description: 'Invite a friend who signs up with your link. Helps grow the network.',
    reward: 2,
    cadence: 'once',
  },
  {
    id: 'daily-checkin',
    emoji: '✅',
    title: 'Daily check-in',
    description: 'Check in on the Arxon dashboard today.',
    reward: 1,
    cadence: 'daily',
  },
  {
    id: 'daily-forge',
    emoji: '🎯',
    title: 'Clear daily milestone',
    description: 'Complete today\'s Word Forge daily challenge.',
    reward: 2,
    cadence: 'daily',
  },
  {
    id: 'share-link',
    emoji: '📣',
    title: 'Share your referral link',
    description: 'Post your invite link on X or Telegram to spread the word.',
    reward: 1,
    cadence: 'weekly',
  },
];

export interface HintTaskContext {
  referralCount: number;
  checkedInToday: boolean;
  dailyForgeDone: boolean;
  dailyCompletedDate: string | null;
}

export interface HintTaskStatus {
  task: HintTask;
  eligible: boolean;
  claimed: boolean;
  claimKey: string;
}

function todayKey(): string {
  return dailySeed();
}

function claimKeyFor(task: HintTask): string {
  if (task.cadence === 'daily') return `${task.id}:${todayKey()}`;
  if (task.cadence === 'weekly') {
    const d = new Date();
    const week = Math.floor(d.getTime() / (7 * 86_400_000));
    return `${task.id}:w${week}`;
  }
  return task.id;
}

export function evaluateHintTasks(
  claims: Record<string, string>,
  ctx: HintTaskContext,
): HintTaskStatus[] {
  return HINT_TASKS.map((task) => {
    const claimKey = claimKeyFor(task);
    const claimed = Boolean(claims[claimKey]);

    let eligible = false;
    switch (task.id) {
      case 'refer-one':
        eligible = ctx.referralCount >= 1;
        break;
      case 'daily-checkin':
        eligible = ctx.checkedInToday;
        break;
      case 'daily-forge':
        eligible = ctx.dailyForgeDone || isDailyCompleted(ctx.dailyCompletedDate);
        break;
      case 'share-link':
        eligible = true;
        break;
      default:
        eligible = false;
    }

    return { task, eligible, claimed, claimKey };
  });
}

export function buildHintClaimsPatch(
  claims: Record<string, string>,
  claimKey: string,
): Record<string, string> {
  return { ...claims, [claimKey]: new Date().toISOString() };
}
