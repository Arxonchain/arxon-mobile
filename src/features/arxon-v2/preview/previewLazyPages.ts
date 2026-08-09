import { lazy } from 'react';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';

export const PreviewWordForgePage = WORD_FORGE_ENABLED
  ? lazy(() => import('@/features/word-forge/WordForgePage'))
  : null;

export const PreviewForgeStatsPage = WORD_FORGE_ENABLED
  ? lazy(() => import('@/features/word-forge/pages/ForgeStatsPage'))
  : null;

export const PreviewSectorMapPage = WORD_FORGE_ENABLED
  ? lazy(() => import('@/features/word-forge/pages/SectorMapPage'))
  : null;

export const PreviewWordForgeLeaderboardPage = WORD_FORGE_ENABLED
  ? lazy(() => import('@/features/word-forge/pages/WordForgeLeaderboardPage'))
  : null;
