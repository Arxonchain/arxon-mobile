import type { CSSProperties } from 'react';

/**
 * Visible height of the floating V2 bottom-nav card + its float gap above the
 * home-indicator (excludes env(safe-area-inset-bottom) — that is added by
 * mobileScrollPadding()).
 *
 * Geometry (NeonBottomNav):
 *   card ≈ 58px (pad 10+10 + icon 22 + gap 3 + label 11)
 *   float gap ≈ 12px
 */
export const MOBILE_NAV_OVERLAY_HEIGHT = 70;

/** Scroll padding so content clears the overlay nav + breathing room. */
export const MOBILE_NAV_CLEARANCE = MOBILE_NAV_OVERLAY_HEIGHT + 16;

/** Clears preview dynamic island / native status notch (matches V2 headers). */
export const MOBILE_TOP_CLEARANCE = 52;

/** Safe-area aware top padding for scrollable mobile page headers. */
export function mobileTopPadding(): string {
  return `max(${MOBILE_TOP_CLEARANCE}px, calc(env(safe-area-inset-top, 0px) + 16px))`;
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
 * - Preview (contained): grow with content; parent phone-frame scrolls.
 * - Native / full page: bounded 100dvh scrollport with pan-y + momentum scroll.
 */
export function mobilePageScrollRoot(contained = false): CSSProperties {
  if (contained) {
    return {
      minHeight: '100%',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'visible',
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
