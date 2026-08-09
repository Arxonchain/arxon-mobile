/** Visible height of the floating bottom nav dock (excludes home-indicator safe area). */
export const MOBILE_NAV_OVERLAY_HEIGHT = 54;

/** Scroll padding so content clears the overlay nav + breathing room. */
export const MOBILE_NAV_CLEARANCE = MOBILE_NAV_OVERLAY_HEIGHT + 20;

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
