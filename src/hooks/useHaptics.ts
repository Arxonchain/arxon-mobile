/**
 * useHaptics.ts — ENH-07
 *
 * Provides haptic feedback for button taps on native Android/iOS.
 * Safe to call on web — does nothing if not native or if plugin unavailable.
 *
 * Usage:
 *   const { impact, success, error } = useHaptics();
 *   <button onClick={() => { impact(); handleClaim(); }}>Claim</button>
 *
 * To enable: Install @capacitor/haptics
 *   npm install @capacitor/haptics
 *   npx cap sync android
 */

function isNative(): boolean {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch { return false; }
}

async function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (style === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (style === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
    }
  } catch {
    // @capacitor/haptics not installed — silent fallback
    // To enable: npm install @capacitor/haptics && npx cap sync android
  }
}

export function useHaptics() {
  return {
    impact:  (style: 'light' | 'medium' | 'heavy' = 'light') => triggerHaptic(style),
    success: () => triggerHaptic('success'),
    error:   () => triggerHaptic('error'),
    tap:     () => triggerHaptic('light'),    // for regular button taps
    confirm: () => triggerHaptic('medium'),   // for confirm/submit actions
    claim:   () => triggerHaptic('success'),  // for reward claims
  };
}
