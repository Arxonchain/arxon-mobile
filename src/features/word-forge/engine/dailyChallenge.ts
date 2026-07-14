import { hashSeed } from './seedHash';
import { levelParams } from './difficultyCurve';
import { generateLevel } from './poolGenerator';

/** One shared daily puzzle seed for all players */
export function dailySeed(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function isDailyCompleted(completedDate: string | null, date = new Date()): boolean {
  return completedDate === dailySeed(date);
}

export function generateDailyChallenge(userId: string, date = new Date()) {
  const seed = dailySeed(date);
  const params = { ...levelParams(15), timerSeconds: 120, minWordsRequired: 5 };
  return generateLevel(params, `daily-${userId}`, seed);
}

export const DAILY_BONUS_PAYOUT = 50;
