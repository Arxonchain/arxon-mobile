import type { CSSProperties } from 'react';

/**
 * Visible height of the floating V2 bottom-nav card + its float gap above the
 * home-indicator (excludes env(safe-area-inset-bottom) — that is added by
 * mobileScrollPadding()).
 *
 * Geometry (NeonBottomNav expanding pill):
 *   card ≈ 58px + float gap ≈ 12px, plus extra so last rows clear the pill.
 */
export const MOBILE_NAV_OVERLAY_HEIGHT = 96;

/** Scroll padding so content clears the overlay nav + breathing room. */
export const MOBILE_NAV_CLEARANCE = MOBILE_NAV_OVERLAY_HEIGHT + 28;

/** Clears Wallet/Mining IceToggle + status notch (mining homepage only). */
export const MOBILE_TOP_CLEARANCE = 96;

/** Status notch only — inner mining pages have no Wallet/Mining toggle. */
export const MOBILE_TOP_PAGE_CLEARANCE = 16;

/** Safe-area aware top padding for the mining homepage (clears the mode toggle). */
export function mobileTopPadding(): string {
  return `max(${MOBILE_TOP_CLEARANCE}px, calc(env(safe-area-inset-top, 0px) + 64px))`;
}

/** Safe-area aware top padding for mining pages without the mode toggle. */
export function mobileTopPaddingPage(): string {
  return `max(${MOBILE_TOP_PAGE_CLEARANCE}px, env(safe-area-inset-top, 0px))`;
}

/** Safe-area aware bottom padding for scrollable mobile pages (clears overlay nav). */
export function mobileScrollPadding(extra = 8): string {
  return `calc(${MOBILE_NAV_CLEARANCE + extra}px + env(safe-area-inset-bottom, 0px))`;
}

/** Minimal bottom inset when the nav is hidden (e.g. full-screen battle detail). */
export function mobileScrollPaddingNavHidden(extra = 12): string {
  return `calc(${extra}px + env(safe-area-inset-bottom, 0px))`;
}

/**
 * Coherent V2 page scroll-root styles for Capacitor WebView + browser preview.
 *
 * The page ALWAYS owns the scrollport (single owner — avoids nested-scroll /
 * WebKit "freeze" when a transformed phone-frame also tries to scroll).
 * - Preview (contained): fill the phone-frame (height 100%) and scroll inside.
 * - Native / full page: bounded 100dvh scrollport with pan-y + momentum scroll.
 */
export function mobilePageScrollRoot(contained = false): CSSProperties {
  if (contained) {
    return {
      height: '100%',
      minHeight: '100%',
      maxHeight: '100%',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      touchAction: 'pan-y',
      overscrollBehaviorY: 'contain',
    };
  }
  return {
    height: '100dvh',
    minHeight: '100dvh',
    maxHeight: '100dvh',
    position: 'relative',
    overflowX: 'hidden',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    touchAction: 'pan-y',
    overscrollBehaviorY: 'contain',
  };
}
