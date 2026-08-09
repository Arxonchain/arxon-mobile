/** Dice Roll — shared constants for House mode + Daily Free Rolls (Phase 1). */
import { neon } from '@/features/arxon-v2/design/neonTokens';

export const DICE_STAKE_TIERS = [10, 25, 50, 100, 250, 500] as const;
export type DiceStakeTier = typeof DICE_STAKE_TIERS[number];

/** House pays 1.85x the stake on a win (best of 3, ~7.5% house edge). */
export const DICE_HOUSE_MULTIPLIER = 1.85;

export const DICE_DAILY_FREE_ROLLS = 3;
export const DICE_DAILY_HOUSE_MATCHES = 20;
export const DICE_DAILY_HOUSE_WIN_CAP = 1000;

export interface DiceFreeRollTier {
  min: number;
  max: number;
  reward: number;
  label: string;
}

/** Roll total → reward, per the approved payout table. */
export const DICE_FREE_ROLL_TABLE: DiceFreeRollTier[] = [
  { min: 2, max: 6, reward: 20, label: '2–6' },
  { min: 7, max: 9, reward: 50, label: '7–9' },
  { min: 10, max: 11, reward: 100, label: '10–11' },
  { min: 12, max: 12, reward: 250, label: '12 (double sixes)' },
];

export function dicePotForStake(stake: number): number {
  return Math.round(stake * DICE_HOUSE_MULTIPLIER);
}

/** PvP modes (Duel + Rumble) take a 5% rake from the pot on payout. */
export const DICE_PVP_RAKE = 0.05;
export const DICE_RUMBLE_LOBBY_SIZES = [3, 4, 5, 6, 8] as const;
export type DiceRumbleLobbySize = typeof DICE_RUMBLE_LOBBY_SIZES[number];

export function diceDuelPot(stake: number): number {
  return stake * 2;
}

export function diceDuelPayout(stake: number): number {
  return Math.round(stake * 2 * (1 - DICE_PVP_RAKE));
}

export function diceRumblePot(stake: number, players: number): number {
  return stake * players;
}

export function diceRumblePayout(stake: number, players: number): number {
  return Math.round(stake * players * (1 - DICE_PVP_RAKE));
}

export const diceAccent = {
  you: neon.cyan,
  bot: neon.purple,
  win: neon.teal,
  lose: '#ff6b6b',
  gold: neon.gold,
} as const;
