/** Fixed bottom tab bar height (pill + margin, excluding safe-area). */
export const MOBILE_NAV_CLEARANCE = 100;

/** Safe-area aware bottom padding for scrollable mobile pages. */
export function mobileScrollPadding(extra = 0): string {
  return `calc(${MOBILE_NAV_CLEARANCE + extra}px + env(safe-area-inset-bottom, 0px))`;
}
