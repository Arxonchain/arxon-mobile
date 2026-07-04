/**
 * Haptic feedback on native — requires @capacitor/haptics in the store APK.
 */
import { Capacitor } from '@capacitor/core';

function hapticsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics');
}

async function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'error') {
  if (!hapticsAvailable()) return;
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
    // Plugin missing or call failed — silent fallback
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
